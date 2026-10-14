/**
 * Authentication session orchestration for the ARTA mobile app.
 *
 * This module owns the sign-in/sign-up/startup/logout/device-session flows
 * and their failure behavior. It is UI-agnostic (no React imports) so every
 * transition is unit-testable with injected storage + request doubles.
 * `AuthContext.tsx` is a thin React binding over these functions.
 *
 * Behavior contract (consistent in every path):
 * - Startup (`restoreSession`): no stored token -> signed-out. Stored token
 *   + `GET /me` 200 -> signed-in (verified). 401 (expired, revoked, or
 *   otherwise rejected) -> credentials purged -> signed-out
 *   (`session_expired`). Network/timeout/server/malformed failures ->
 *   signed-in but UNVERIFIED (`sessionVerified: false`): credentials are
 *   NEVER deleted on a failure we cannot attribute, and the UI must offer
 *   an explicit retry (`restoreSession`/`refreshProfile` again).
 * - Login (`signIn`): on success the previous account slot is purged FIRST,
 *   then the new credentials are stored (single-active-account isolation).
 *   A 401 keeps its generic server message (anti-enumeration by design).
 * - Register (`signUp`): the server issues no token; success only returns
 *   the generic message. The user signs in separately afterwards.
 * - Logout (`signOut`): server revocation is attempted once. If it succeeds
 *   (or the token is already dead -> 401), local credentials are purged and
 *   server financial data is untouched (the endpoint only revokes the
 *   session/token). If the device is offline (or the server fails), the
 *   in-memory session is cleared immediately but the token is RETAINED with
 *   a `logoutPending` flag for the sole purpose of completing the server
 *   revocation on the next `restoreSession`; it is never used for data
 *   access again. A later sign-in replaces (and thereby abandons) a pending
 *   logout; the orphaned server session then expires naturally (30 days).
 * - Logout everywhere (`signOutEverywhere`): on transport failure the
 *   session is KEPT (signed-in) with an error, because the server state is
 *   unknown and silently signing out would lie about other devices.
 * - Device sessions: list/rename/revoke per backend contract. Any 401 while
 *   authenticated purges credentials -> signed-out. Revoking the current
 *   session signs this device out locally (server already revoked it).
 * - Retry policy: this module performs exactly one request attempt per
 *   operation. No automatic retry of POST/PATCH/DELETE (non-idempotent
 *   without a server strategy); GETs are re-issued only on explicit user
 *   action via these same functions.
 */

import { ApiError, type RequestFn } from '../api/client';
import {
  fetchMyProfile,
  listDeviceSessions,
  loginWithPassword,
  performLogout,
  performLogoutAll,
  registerAccount,
  renameDeviceSession,
  revokeDeviceSession,
  type DeviceSessionRow,
  type UserProfile,
} from './authApi';
import { deviceMetadata, getOrCreateDeviceId } from './device';
import {
  clearAuthCredentials,
  isLogoutPending,
  loadStoredCredentials,
  saveAuthCredentials,
  setLogoutPending,
  type SecureBackend,
} from './tokenStorage';

export interface SessionDeps {
  store?: SecureBackend;
  request?: RequestFn;
}

export type SessionErrorKind =
  | 'invalid_credentials'
  | 'session_expired'
  | 'validation'
  | 'network'
  | 'timeout'
  | 'rate_limited'
  | 'server'
  | 'invalid_response'
  | 'missing_api_url'
  | 'not_found'
  | 'forbidden'
  | 'http'
  | 'unknown';

export interface SessionError {
  kind: SessionErrorKind;
  message: string;
  fields?: Record<string, string[]>;
}

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

export interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  /** False when a stored token could not be verified (e.g. offline). */
  sessionVerified: boolean;
  error: SessionError | null;
  /** True when a server-side logout still has to be completed. */
  pendingLogout: boolean;
  devices: DeviceSessionRow[];
  devicesError: SessionError | null;
}

export const initialAuthState: AuthState = {
  status: 'loading',
  user: null,
  sessionVerified: false,
  error: null,
  pendingLogout: false,
  devices: [],
  devicesError: null,
};

function cleanSignedOut(overrides?: Partial<AuthState>): AuthState {
  return {
    status: 'signed-out',
    user: null,
    sessionVerified: false,
    error: null,
    pendingLogout: false,
    devices: [],
    devicesError: null,
    ...overrides,
  };
}

function unknownError(): SessionError {
  return { kind: 'unknown', message: 'An unexpected error occurred.' };
}

function mapRequestError(
  error: unknown,
  unauthorizedKind: 'invalid_credentials' | 'session_expired',
): SessionError {
  if (error instanceof ApiError) {
    if (error.kind === 'unauthorized') {
      return { kind: unauthorizedKind, message: error.message };
    }
    return {
      kind: error.kind as SessionErrorKind,
      message: error.message,
      fields: error.fields,
    };
  }
  return unknownError();
}

export async function restoreSession(
  prev: AuthState,
  deps?: SessionDeps,
): Promise<AuthState> {
  const store = deps?.store;
  const request = deps?.request;
  try {
    const credentials = await loadStoredCredentials(store);
    if (!credentials) {
      await clearAuthCredentials(store);
      return cleanSignedOut();
    }

    if (await isLogoutPending(store)) {
      try {
        await performLogout(credentials.token, { request });
      } catch (error) {
        if (!(error instanceof ApiError && error.kind === 'unauthorized')) {
          return cleanSignedOut({
            pendingLogout: true,
            error: mapRequestError(error, 'session_expired'),
          });
        }
      }
      await clearAuthCredentials(store);
      return cleanSignedOut();
    }

    try {
      const user = await fetchMyProfile(credentials.token, { request });
      return {
        ...prev,
        status: 'signed-in',
        user,
        sessionVerified: true,
        error: null,
        pendingLogout: false,
      };
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'unauthorized') {
        await clearAuthCredentials(store);
        return cleanSignedOut({
          error: { kind: 'session_expired', message: error.message },
        });
      }
      return {
        ...prev,
        status: 'signed-in',
        user: null,
        sessionVerified: false,
        error: mapRequestError(error, 'session_expired'),
        pendingLogout: false,
      };
    }
  } catch {
    return cleanSignedOut({ error: unknownError() });
  }
}

export interface SignInInput {
  email: string;
  password: string;
}

export async function signIn(
  prev: AuthState,
  input: SignInInput,
  deps?: SessionDeps,
): Promise<AuthState> {
  const store = deps?.store;
  const request = deps?.request;
  try {
    const deviceId = await getOrCreateDeviceId(store);
    const metadata = deviceMetadata();
    let result;
    try {
      result = await loginWithPassword(
        {
          email: input.email,
          password: input.password,
          deviceId,
          deviceName: metadata.device_name,
          platform: metadata.platform,
        },
        { request },
      );
    } catch (error) {
      return {
        ...cleanSignedOut(),
        error: mapRequestError(error, 'invalid_credentials'),
      };
    }
    // Isolation: purge any previous account slot (token + pending flag)
    // before storing the new account's credentials.
    await clearAuthCredentials(store);
    await saveAuthCredentials(
      {
        token: result.token,
        userId: result.user.id,
        expiresAt: result.expiresAt,
      },
      store,
    );
    return {
      status: 'signed-in',
      user: result.user,
      sessionVerified: true,
      error: null,
      pendingLogout: false,
      devices: [],
      devicesError: null,
    };
  } catch {
    return { ...cleanSignedOut(), error: unknownError() };
  }
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export type SignUpResult =
  { ok: true; message: string } | { ok: false; error: SessionError };

export async function signUp(
  input: SignUpInput,
  deps?: SessionDeps,
): Promise<SignUpResult> {
  try {
    const deviceId = await getOrCreateDeviceId(deps?.store);
    const { message } = await registerAccount(
      { ...input, deviceId },
      { request: deps?.request },
    );
    return { ok: true, message };
  } catch (error) {
    return { ok: false, error: mapRequestError(error, 'invalid_credentials') };
  }
}

export async function signOut(
  prev: AuthState,
  deps?: SessionDeps,
): Promise<AuthState> {
  const store = deps?.store;
  const request = deps?.request;
  try {
    const credentials = await loadStoredCredentials(store);
    if (!credentials) {
      await clearAuthCredentials(store);
      return cleanSignedOut();
    }
    try {
      await performLogout(credentials.token, { request });
    } catch (error) {
      if (!(error instanceof ApiError && error.kind === 'unauthorized')) {
        // Offline/server failure: clear the in-memory session now, but keep
        // the token with a pending flag so the NEXT restoreSession completes
        // the server revocation. Never used for data access again.
        await setLogoutPending(store);
        return cleanSignedOut({
          pendingLogout: true,
          error: mapRequestError(error, 'session_expired'),
        });
      }
    }
    await clearAuthCredentials(store);
    return cleanSignedOut();
  } catch {
    return { ...prev, error: unknownError() };
  }
}

export async function signOutEverywhere(
  prev: AuthState,
  deps?: SessionDeps,
): Promise<AuthState> {
  const store = deps?.store;
  const request = deps?.request;
  try {
    const credentials = await loadStoredCredentials(store);
    if (!credentials) {
      await clearAuthCredentials(store);
      return cleanSignedOut();
    }
    try {
      await performLogoutAll(credentials.token, { request });
    } catch (error) {
      if (error instanceof ApiError && error.kind !== 'unauthorized') {
        // Server state unknown: stay signed in so the user can retry.
        return { ...prev, error: mapRequestError(error, 'session_expired') };
      }
    }
    await clearAuthCredentials(store);
    return cleanSignedOut();
  } catch {
    return { ...prev, error: unknownError() };
  }
}

export async function refreshProfile(
  prev: AuthState,
  deps?: SessionDeps,
): Promise<AuthState> {
  const store = deps?.store;
  const request = deps?.request;
  try {
    const credentials = await loadStoredCredentials(store);
    if (!credentials) {
      await clearAuthCredentials(store);
      return cleanSignedOut();
    }
    try {
      const user = await fetchMyProfile(credentials.token, { request });
      return {
        ...prev,
        status: 'signed-in',
        user,
        sessionVerified: true,
        error: null,
      };
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'unauthorized') {
        await clearAuthCredentials(store);
        return cleanSignedOut({
          error: { kind: 'session_expired', message: error.message },
        });
      }
      return {
        ...prev,
        status: 'signed-in',
        sessionVerified: false,
        error: mapRequestError(error, 'session_expired'),
      };
    }
  } catch {
    return { ...prev, error: unknownError() };
  }
}

async function requireToken(
  store: SecureBackend | undefined,
): Promise<{ token: string } | { state: AuthState }> {
  try {
    const credentials = await loadStoredCredentials(store);
    if (!credentials) {
      await clearAuthCredentials(store);
      return { state: cleanSignedOut() };
    }
    return { token: credentials.token };
  } catch {
    return {
      state: {
        ...initialAuthState,
        status: 'signed-out',
        error: unknownError(),
      },
    };
  }
}

async function handleUnauthorized(
  store: SecureBackend | undefined,
  message: string,
): Promise<AuthState> {
  await clearAuthCredentials(store);
  return cleanSignedOut({
    error: { kind: 'session_expired', message },
  });
}

export async function loadDevices(
  prev: AuthState,
  deps?: SessionDeps,
): Promise<AuthState> {
  const required = await requireToken(deps?.store);
  if ('state' in required) {
    return required.state;
  }
  try {
    const devices = await listDeviceSessions(required.token, {
      request: deps?.request,
    });
    // A successful list proves the token is accepted by the server.
    return {
      ...prev,
      status: 'signed-in',
      sessionVerified: true,
      error: null,
      devices,
      devicesError: null,
    };
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'unauthorized') {
      return handleUnauthorized(deps?.store, error.message);
    }
    return {
      ...prev,
      devicesError: mapRequestError(error, 'session_expired'),
    };
  }
}

export interface DeviceMutationResult {
  state: AuthState;
  ok: boolean;
}

export async function renameDevice(
  prev: AuthState,
  sessionId: number,
  deviceName: string,
  deps?: SessionDeps,
): Promise<DeviceMutationResult> {
  const trimmed = deviceName.trim();
  if (trimmed === '' || trimmed.length > 255) {
    return {
      ok: false,
      state: {
        ...prev,
        devicesError: {
          kind: 'validation',
          message: 'Device name must be 1-255 characters.',
          fields: { device_name: ['Device name must be 1-255 characters.'] },
        },
      },
    };
  }
  const required = await requireToken(deps?.store);
  if ('state' in required) {
    return { ok: false, state: required.state };
  }
  try {
    await renameDeviceSession(required.token, sessionId, trimmed, {
      request: deps?.request,
    });
    const devices = await listDeviceSessions(required.token, {
      request: deps?.request,
    });
    return {
      ok: true,
      state: { ...prev, devices, devicesError: null },
    };
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'unauthorized') {
      return {
        ok: false,
        state: await handleUnauthorized(deps?.store, error.message),
      };
    }
    return {
      ok: false,
      state: {
        ...prev,
        devicesError: mapRequestError(error, 'session_expired'),
      },
    };
  }
}

export async function revokeDevice(
  prev: AuthState,
  sessionId: number,
  deps?: SessionDeps,
): Promise<DeviceMutationResult> {
  const required = await requireToken(deps?.store);
  if ('state' in required) {
    return { ok: false, state: required.state };
  }
  try {
    await revokeDeviceSession(required.token, sessionId, {
      request: deps?.request,
    });
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'unauthorized') {
      return {
        ok: false,
        state: await handleUnauthorized(deps?.store, error.message),
      };
    }
    return {
      ok: false,
      state: {
        ...prev,
        devicesError: mapRequestError(error, 'session_expired'),
      },
    };
  }
  // If this revoked our own current session, the next call is rejected and
  // we sign out locally (the server already revoked it: nothing pending).
  try {
    const devices = await listDeviceSessions(required.token, {
      request: deps?.request,
    });
    return { ok: true, state: { ...prev, devices, devicesError: null } };
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'unauthorized') {
      await clearAuthCredentials(deps?.store);
      return { ok: true, state: cleanSignedOut() };
    }
    return {
      ok: true,
      state: {
        ...prev,
        devicesError: mapRequestError(error, 'session_expired'),
      },
    };
  }
}
