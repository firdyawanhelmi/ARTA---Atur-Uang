import {
  AUTH_EXPIRES_AT_KEY,
  AUTH_LOGOUT_PENDING_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_ID_KEY,
  DEVICE_ID_KEY,
  clearAuthCredentials,
  isLogoutPending,
  loadDeviceId,
  loadStoredCredentials,
  saveAuthCredentials,
  saveDeviceId,
  setLogoutPending,
  type SecureBackend,
} from '../src/auth/tokenStorage';

class FakeStore implements SecureBackend {
  private map = new Map<string, string>();

  async getItemAsync(key: string): Promise<string | null> {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async deleteItemAsync(key: string): Promise<void> {
    this.map.delete(key);
  }

  keys(): string[] {
    return [...this.map.keys()];
  }
}

describe('secure token storage (tokenStorage.ts)', () => {
  it('round-trips credentials through the injected store', async () => {
    const store = new FakeStore();
    await saveAuthCredentials(
      { token: 'tok', userId: 'user-1', expiresAt: '2030-01-01T00:00:00Z' },
      store,
    );

    await expect(loadStoredCredentials(store)).resolves.toEqual({
      token: 'tok',
      userId: 'user-1',
      expiresAt: '2030-01-01T00:00:00Z',
    });
  });

  it('returns null when the token is missing', async () => {
    const store = new FakeStore();
    await store.setItemAsync(AUTH_USER_ID_KEY, 'user-1');

    await expect(loadStoredCredentials(store)).resolves.toBeNull();
  });

  it('clearing auth credentials preserves the device id', async () => {
    const store = new FakeStore();
    await saveAuthCredentials(
      { token: 'tok', userId: 'user-1', expiresAt: null },
      store,
    );
    await saveDeviceId('device-uuid', store);
    await setLogoutPending(store);

    await clearAuthCredentials(store);

    await expect(loadStoredCredentials(store)).resolves.toBeNull();
    expect(store.keys()).toEqual([DEVICE_ID_KEY]);
    await expect(loadDeviceId(store)).resolves.toBe('device-uuid');
    await expect(isLogoutPending(store)).resolves.toBe(false);
  });

  it('tracks the pending-logout flag', async () => {
    const store = new FakeStore();
    await expect(isLogoutPending(store)).resolves.toBe(false);
    await setLogoutPending(store);
    await expect(isLogoutPending(store)).resolves.toBe(true);
  });

  it('uses distinct keys for credentials, flags, and device identity', () => {
    const keys = [
      AUTH_TOKEN_KEY,
      AUTH_USER_ID_KEY,
      AUTH_EXPIRES_AT_KEY,
      AUTH_LOGOUT_PENDING_KEY,
      DEVICE_ID_KEY,
    ];
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key.startsWith('arta.')).toBe(true);
    }
  });
});
