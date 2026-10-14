import {
  ApiError,
  type ApiRequestOptions,
  type RequestFn,
} from '../src/api/client';
import {
  initialAuthState,
  loadDevices,
  refreshProfile,
  renameDevice,
  restoreSession,
  revokeDevice,
  signIn,
  signOut,
  signOutEverywhere,
  signUp,
  type AuthState,
  type SessionDeps,
} from '../src/auth/session';
import {
  isLogoutPending,
  loadStoredCredentials,
  type SecureBackend,
} from '../src/auth/tokenStorage';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class FakeStore implements SecureBackend {
  private map = new Map<string, string>();
  fail = false;

  private guard(): void {
    if (this.fail) {
      throw new Error('secure store down');
    }
  }

  async getItemAsync(key: string): Promise<string | null> {
    this.guard();
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.guard();
    this.map.set(key, value);
  }

  async deleteItemAsync(key: string): Promise<void> {
    this.guard();
    this.map.delete(key);
  }

  async seed(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      this.map.set(key, value);
    }
  }
}

type Scripted = { ok: unknown } | { failure: ApiError };

function scripted(script: Scripted[]): {
  fn: RequestFn;
  calls: ApiRequestOptions[];
} {
  const calls: ApiRequestOptions[] = [];
  const fn: RequestFn = async <T>(options: ApiRequestOptions): Promise<T> => {
    calls.push(options);
    const next = script.shift();
    if (!next) {
      throw new Error(
        `No scripted response left for ${options.method} ${options.path}`,
      );
    }
    if ('failure' in next) {
      throw next.failure;
    }
    return next.ok as T;
  };
  return { fn, calls };
}

function depsFor(
  store: FakeStore,
  script: Scripted[],
): { deps: SessionDeps; calls: ApiRequestOptions[] } {
  const { fn, calls } = scripted(script);
  return { deps: { store, request: fn }, calls };
}

const userA = {
  id: '0193e2a1-7c49-7a1b-9c2d-3f4a5b6c7d8e',
  name: 'Pengguna A',
  email: 'a@example.com',
  email_verified_at: '2026-10-13T00:00:00Z',
};

const userB = {
  id: '0193e2a1-7c49-7a1b-9c2d-aaaaaaaaaaaa',
  name: 'Pengguna B',
  email: 'b@example.com',
  email_verified_at: '2026-10-13T00:00:00Z',
};

const loginA = {
  user: userA,
  token: 'token-a',
  token_type: 'Bearer',
  expires_at: '2026-11-13T00:00:00Z',
};

const loginB = {
  user: userB,
  token: 'token-b',
  token_type: 'Bearer',
  expires_at: '2026-11-13T00:00:00Z',
};

const deviceRow = {
  id: 7,
  device_id: '11111111-2222-4333-8444-555555555555',
  device_name: 'Ponsel',
  platform: 'android',
  app_version: null,
  created_at: '2026-10-13T00:00:00Z',
  last_used_at: null,
  expires_at: '2026-11-13T00:00:00Z',
  status: 'active',
};

const networkFailure = () => new ApiError('network', 'Network request failed.');
const unauthorized = (
  message = 'These credentials do not match our records.',
) => new ApiError('unauthorized', message, 401);

async function storedToken(store: FakeStore): Promise<string | null> {
  const credentials = await loadStoredCredentials(store);
  return credentials?.token ?? null;
}

describe('auth session orchestration (session.ts)', () => {
  describe('restoreSession (startup)', () => {
    it('signs out when nothing is stored', async () => {
      const store = new FakeStore();
      const { deps, calls } = depsFor(store, []);

      const next = await restoreSession(initialAuthState, deps);

      expect(next.status).toBe('signed-out');
      expect(calls).toHaveLength(0);
    });

    it('restores a valid session via GET /me', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
      });
      const { deps, calls } = depsFor(store, [{ ok: userA }]);

      const next = await restoreSession(initialAuthState, deps);

      expect(next.status).toBe('signed-in');
      expect(next.sessionVerified).toBe(true);
      expect(next.user).toEqual(userA);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        method: 'GET',
        path: '/me',
        token: 'token-a',
      });
    });

    it('purges credentials when the token is rejected (401)', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'stale-token',
        'arta.auth.userId': userA.id,
      });
      const { deps } = depsFor(store, [{ failure: unauthorized() }]);

      const next = await restoreSession(initialAuthState, deps);

      expect(next.status).toBe('signed-out');
      expect(next.error?.kind).toBe('session_expired');
      await expect(loadStoredCredentials(store)).resolves.toBeNull();
    });

    it('keeps credentials but marks unverified when offline', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
      });
      const { deps } = depsFor(store, [{ failure: networkFailure() }]);

      const next = await restoreSession(initialAuthState, deps);

      expect(next.status).toBe('signed-in');
      expect(next.sessionVerified).toBe(false);
      expect(next.user).toBeNull();
      expect(next.error?.kind).toBe('network');
      // Nothing is discarded on an unattributable failure.
      await expect(storedToken(store)).resolves.toBe('token-a');
    });

    it('completes a pending logout before restoring', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
        'arta.auth.logoutPending': '1',
      });
      const { deps, calls } = depsFor(store, [
        { ok: { message: 'Logged out.' } },
      ]);

      const next = await restoreSession(initialAuthState, deps);

      expect(next.status).toBe('signed-out');
      expect(next.pendingLogout).toBe(false);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        method: 'POST',
        path: '/auth/logout',
        token: 'token-a',
      });
      await expect(loadStoredCredentials(store)).resolves.toBeNull();
      await expect(isLogoutPending(store)).resolves.toBe(false);
    });

    it('keeps the pending flag when completion is still offline', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
        'arta.auth.logoutPending': '1',
      });
      const { deps } = depsFor(store, [{ failure: networkFailure() }]);

      const next = await restoreSession(initialAuthState, deps);

      expect(next.status).toBe('signed-out');
      expect(next.pendingLogout).toBe(true);
      await expect(storedToken(store)).resolves.toBe('token-a');
    });

    it('signs out safely when secure storage fails', async () => {
      const store = new FakeStore();
      store.fail = true;
      const { deps, calls } = depsFor(store, [{ ok: userA }]);

      const next = await restoreSession(initialAuthState, deps);

      expect(next.status).toBe('signed-out');
      expect(next.error?.kind).toBe('unknown');
      expect(calls).toHaveLength(0);
    });
  });

  describe('signIn', () => {
    it('stores token, user id, and expiry on success', async () => {
      const store = new FakeStore();
      const { deps, calls } = depsFor(store, [{ ok: loginA }]);

      const next = await signIn(
        initialAuthState,
        { email: 'a@example.com', password: 'password' },
        deps,
      );

      expect(next.status).toBe('signed-in');
      expect(next.sessionVerified).toBe(true);
      expect(next.user).toEqual(userA);
      await expect(loadStoredCredentials(store)).resolves.toEqual({
        token: 'token-a',
        userId: userA.id,
        expiresAt: '2026-11-13T00:00:00Z',
      });
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(calls[0].path).toBe('/auth/login');
      const body = calls[0].body as Record<string, unknown>;
      expect(body.email).toBe('a@example.com');
      expect(UUID_PATTERN.test(body.device_id as string)).toBe(true);
    });

    it('reuses the same persistent device id across sign-ins', async () => {
      const store = new FakeStore();
      const first = depsFor(store, [{ ok: loginA }]);
      await signIn(
        initialAuthState,
        { email: 'a@example.com', password: 'password' },
        first.deps,
      );
      const second = depsFor(store, [{ ok: loginA }]);
      await signIn(
        initialAuthState,
        { email: 'a@example.com', password: 'password' },
        second.deps,
      );

      const firstId = (first.calls[0].body as Record<string, unknown>)
        .device_id;
      const secondId = (second.calls[0].body as Record<string, unknown>)
        .device_id;
      expect(firstId).toBe(secondId);
    });

    it('keeps the generic message on bad credentials and stores nothing', async () => {
      const store = new FakeStore();
      const { deps } = depsFor(store, [{ failure: unauthorized() }]);

      const next = await signIn(
        initialAuthState,
        { email: 'a@example.com', password: 'wrong-password' },
        deps,
      );

      expect(next.status).toBe('signed-out');
      expect(next.error?.kind).toBe('invalid_credentials');
      expect(next.error?.message).toBe(
        'These credentials do not match our records.',
      );
      await expect(loadStoredCredentials(store)).resolves.toBeNull();
    });

    it('isolates accounts: signing in as B purges A first', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
        'arta.auth.expiresAt': '2026-11-13T00:00:00Z',
        'arta.auth.logoutPending': '1',
      });
      const { deps } = depsFor(store, [{ ok: loginB }]);

      const next = await signIn(
        { ...initialAuthState, status: 'signed-out' },
        { email: 'b@example.com', password: 'password' },
        deps,
      );

      expect(next.status).toBe('signed-in');
      expect(next.user).toEqual(userB);
      await expect(loadStoredCredentials(store)).resolves.toEqual({
        token: 'token-b',
        userId: userB.id,
        expiresAt: '2026-11-13T00:00:00Z',
      });
      // The previous account's pending flag is gone with its slot.
      await expect(isLogoutPending(store)).resolves.toBe(false);
    });
  });

  describe('signUp', () => {
    it('returns the generic accepted message without signing in', async () => {
      const store = new FakeStore();
      const { deps, calls } = depsFor(store, [
        { ok: { message: 'If this email address is not yet registered...' } },
      ]);

      const result = await signUp(
        { name: 'Baru', email: 'baru@example.com', password: 'password' },
        deps,
      );

      expect(result.ok).toBe(true);
      expect(calls[0]).toMatchObject({
        method: 'POST',
        path: '/auth/register',
      });
      // No token is issued by registration.
      await expect(loadStoredCredentials(store)).resolves.toBeNull();
    });

    it('surfaces validation field errors', async () => {
      const store = new FakeStore();
      const { deps } = depsFor(store, [
        {
          failure: new ApiError('validation', 'Validation failed.', 422, {
            password: ['too short'],
          }),
        },
      ]);

      const result = await signUp(
        { name: 'B', email: 'bad', password: 'short' },
        deps,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          kind: 'validation',
          message: 'Validation failed.',
          fields: { password: ['too short'] },
        },
      });
    });
  });

  describe('signOut', () => {
    it('revokes on the server and purges local credentials', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
      });
      const signedIn: AuthState = {
        ...initialAuthState,
        status: 'signed-in',
        user: userA,
        sessionVerified: true,
      };
      const { deps, calls } = depsFor(store, [
        { ok: { message: 'Logged out.' } },
      ]);

      const next = await signOut(signedIn, deps);

      expect(next).toMatchObject({
        status: 'signed-out',
        pendingLogout: false,
      });
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        method: 'POST',
        path: '/auth/logout',
        token: 'token-a',
      });
      await expect(loadStoredCredentials(store)).resolves.toBeNull();
    });

    it('treats an already-dead token as signed out', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'dead',
        'arta.auth.userId': userA.id,
      });
      const signedIn: AuthState = { ...initialAuthState, status: 'signed-in' };
      const { deps } = depsFor(store, [
        { failure: unauthorized('Unauthenticated.') },
      ]);

      const next = await signOut(signedIn, deps);

      expect(next.status).toBe('signed-out');
      await expect(loadStoredCredentials(store)).resolves.toBeNull();
    });

    it('defers server revocation with a pending flag when offline', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
      });
      const signedIn: AuthState = {
        ...initialAuthState,
        status: 'signed-in',
        user: userA,
        sessionVerified: true,
      };
      const { deps, calls } = depsFor(store, [{ failure: networkFailure() }]);

      const next = await signOut(signedIn, deps);

      expect(next.status).toBe('signed-out');
      expect(next.pendingLogout).toBe(true);
      expect(next.error?.kind).toBe('network');
      // In-memory session cleared, but the token is retained ONLY to
      // complete the server revocation later. Single attempt, no retry loop.
      expect(calls).toHaveLength(1);
      expect(next.user).toBeNull();
      await expect(storedToken(store)).resolves.toBe('token-a');
      await expect(isLogoutPending(store)).resolves.toBe(true);
    });
  });

  describe('signOutEverywhere', () => {
    it('stays signed in when the request fails (server state unknown)', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
      });
      const signedIn: AuthState = {
        ...initialAuthState,
        status: 'signed-in',
        user: userA,
        sessionVerified: true,
      };
      const { deps } = depsFor(store, [{ failure: networkFailure() }]);

      const next = await signOutEverywhere(signedIn, deps);

      expect(next.status).toBe('signed-in');
      expect(next.error?.kind).toBe('network');
      await expect(storedToken(store)).resolves.toBe('token-a');
    });
  });

  describe('profile and devices', () => {
    it('refreshProfile verifies an unverified session', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
      });
      const unverified: AuthState = {
        ...initialAuthState,
        status: 'signed-in',
        sessionVerified: false,
        error: { kind: 'network', message: 'offline' },
      };
      const { deps } = depsFor(store, [{ ok: userA }]);

      const next = await refreshProfile(unverified, deps);

      expect(next.sessionVerified).toBe(true);
      expect(next.user).toEqual(userA);
      expect(next.error).toBeNull();
    });

    it('loadDevices stores rows and proves the token', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
      });
      const signedIn: AuthState = {
        ...initialAuthState,
        status: 'signed-in',
        sessionVerified: false,
      };
      const { deps } = depsFor(store, [{ ok: { data: [deviceRow] } }]);

      const next = await loadDevices(signedIn, deps);

      expect(next.devices).toHaveLength(1);
      expect(next.devices[0]).toMatchObject({ id: 7, status: 'active' });
      expect(next.sessionVerified).toBe(true);
    });

    it('a 401 while loading devices purges and signs out', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'revoked',
        'arta.auth.userId': userA.id,
      });
      const signedIn: AuthState = {
        ...initialAuthState,
        status: 'signed-in',
        user: userA,
        sessionVerified: true,
      };
      const { deps } = depsFor(store, [
        { failure: unauthorized('Unauthenticated.') },
      ]);

      const next = await loadDevices(signedIn, deps);

      expect(next.status).toBe('signed-out');
      await expect(loadStoredCredentials(store)).resolves.toBeNull();
    });

    it('rename validates locally without a request', async () => {
      const store = new FakeStore();
      const signedIn: AuthState = { ...initialAuthState, status: 'signed-in' };
      const { deps, calls } = depsFor(store, []);

      const result = await renameDevice(signedIn, 7, '   ', deps);

      expect(result.ok).toBe(false);
      expect(result.state.devicesError?.kind).toBe('validation');
      expect(calls).toHaveLength(0);
    });

    it('revoking the current session signs out locally', async () => {
      const store = new FakeStore();
      await store.seed({
        'arta.auth.token': 'token-a',
        'arta.auth.userId': userA.id,
      });
      const signedIn: AuthState = {
        ...initialAuthState,
        status: 'signed-in',
        user: userA,
        sessionVerified: true,
      };
      const { deps, calls } = depsFor(store, [
        { ok: { message: 'Device session revoked.' } },
        { failure: unauthorized('Unauthenticated.') },
      ]);

      const result = await revokeDevice(signedIn, 7, deps);

      expect(result.ok).toBe(true);
      expect(result.state.status).toBe('signed-out');
      expect(calls.map((call) => call.path)).toEqual([
        '/auth/devices/7/session',
        '/auth/devices',
      ]);
      await expect(loadStoredCredentials(store)).resolves.toBeNull();
    });
  });

  describe('credential hygiene', () => {
    it('never writes credentials to logs', async () => {
      const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map(
        (method) =>
          jest.spyOn(console, method).mockImplementation(() => undefined),
      );
      try {
        const store = new FakeStore();
        const login = depsFor(store, [{ ok: loginA }]);
        await signIn(
          initialAuthState,
          { email: 'a@example.com', password: 'password' },
          login.deps,
        );
        const restore = depsFor(store, [{ ok: userA }]);
        const signedIn = await restoreSession(initialAuthState, restore.deps);
        const logout = depsFor(store, [{ ok: { message: 'Logged out.' } }]);
        await signOut(signedIn, logout.deps);

        for (const spy of spies) {
          expect(spy).not.toHaveBeenCalled();
        }
      } finally {
        for (const spy of spies) {
          spy.mockRestore();
        }
      }
    });
  });
});
