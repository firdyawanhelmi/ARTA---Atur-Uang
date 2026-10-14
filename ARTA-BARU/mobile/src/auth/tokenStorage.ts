/**
 * Secure credential storage for the ARTA mobile app.
 *
 * Auth secrets live ONLY in `expo-secure-store` (Keychain on iOS,
 * Keystore-backed storage on Android). They are never written to
 * AsyncStorage, SQLite, logs, or config files.
 *
 * Single-active-account model: SecureStore holds the credentials of the
 * currently signed-in account only. Signing in as a different account
 * purges the previous account's slot first (see `session.ts`), so one
 * account's token is never readable while another account is active.
 *
 * Key layout:
 * - `arta.auth.token`         Sanctum bearer token (plaintext secret)
 * - `arta.auth.userId`        Authenticated user id (UUID v7, opaque string)
 * - `arta.auth.expiresAt`     Token expiry as issued by the server (ISO-8601)
 * - `arta.auth.logoutPending` `1` when a server-side logout still has to be
 *                             completed after an offline logout
 * - `arta.device.id`          Persistent install UUID (NOT a credential;
 *                             never cleared by logout)
 */

import * as SecureStore from 'expo-secure-store';

export interface SecureBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

const defaultBackend: SecureBackend = SecureStore;

export const AUTH_TOKEN_KEY = 'arta.auth.token';
export const AUTH_USER_ID_KEY = 'arta.auth.userId';
export const AUTH_EXPIRES_AT_KEY = 'arta.auth.expiresAt';
export const AUTH_LOGOUT_PENDING_KEY = 'arta.auth.logoutPending';
export const DEVICE_ID_KEY = 'arta.device.id';

export interface StoredCredentials {
  token: string;
  userId: string;
  expiresAt: string | null;
}

export async function loadStoredCredentials(
  store: SecureBackend = defaultBackend,
): Promise<StoredCredentials | null> {
  const [token, userId, expiresAt] = await Promise.all([
    store.getItemAsync(AUTH_TOKEN_KEY),
    store.getItemAsync(AUTH_USER_ID_KEY),
    store.getItemAsync(AUTH_EXPIRES_AT_KEY),
  ]);
  if (!token || !userId) {
    return null;
  }
  return { token, userId, expiresAt };
}

export async function saveAuthCredentials(
  credentials: StoredCredentials,
  store: SecureBackend = defaultBackend,
): Promise<void> {
  await store.setItemAsync(AUTH_TOKEN_KEY, credentials.token);
  await store.setItemAsync(AUTH_USER_ID_KEY, credentials.userId);
  if (credentials.expiresAt === null) {
    await store.deleteItemAsync(AUTH_EXPIRES_AT_KEY);
  } else {
    await store.setItemAsync(AUTH_EXPIRES_AT_KEY, credentials.expiresAt);
  }
}

/**
 * Purge every auth credential for the active account, including a pending
 * logout flag. The device id is intentionally preserved: it identifies the
 * installation, not the account. Never touches server data.
 */
export async function clearAuthCredentials(
  store: SecureBackend = defaultBackend,
): Promise<void> {
  await Promise.all([
    store.deleteItemAsync(AUTH_TOKEN_KEY),
    store.deleteItemAsync(AUTH_USER_ID_KEY),
    store.deleteItemAsync(AUTH_EXPIRES_AT_KEY),
    store.deleteItemAsync(AUTH_LOGOUT_PENDING_KEY),
  ]);
}

export async function isLogoutPending(
  store: SecureBackend = defaultBackend,
): Promise<boolean> {
  return (await store.getItemAsync(AUTH_LOGOUT_PENDING_KEY)) === '1';
}

export async function setLogoutPending(
  store: SecureBackend = defaultBackend,
): Promise<void> {
  await store.setItemAsync(AUTH_LOGOUT_PENDING_KEY, '1');
}

export async function loadDeviceId(
  store: SecureBackend = defaultBackend,
): Promise<string | null> {
  return store.getItemAsync(DEVICE_ID_KEY);
}

export async function saveDeviceId(
  deviceId: string,
  store: SecureBackend = defaultBackend,
): Promise<void> {
  await store.setItemAsync(DEVICE_ID_KEY, deviceId);
}
