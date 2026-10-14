import { Platform } from 'react-native';

import {
  deviceMetadata,
  getOrCreateDeviceId,
  isUuid,
  newDeviceUuid,
} from '../src/auth/device';
import type { SecureBackend } from '../src/auth/tokenStorage';

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
}

describe('device identity (device.ts)', () => {
  it('generates RFC 4122 v4 UUIDs', () => {
    const fixed = newDeviceUuid(() =>
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
    );
    expect(fixed).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    expect(isUuid(fixed)).toBe(true);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newDeviceUuid()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(isUuid(id)).toBe(true);
    }
  });

  it('persists one install id and reuses it', async () => {
    const store = new FakeStore();
    const first = await getOrCreateDeviceId(store);
    const second = await getOrCreateDeviceId(store);

    expect(isUuid(first)).toBe(true);
    expect(second).toBe(first);
  });

  it('replaces a stored value that is not a UUID', async () => {
    const store = new FakeStore();
    await store.setItemAsync('arta.device.id', 'not-a-uuid');

    const id = await getOrCreateDeviceId(store);

    expect(isUuid(id)).toBe(true);
    expect(id).not.toBe('not-a-uuid');
  });

  it('derives display metadata from the platform', () => {
    const metadata = deviceMetadata();
    expect(metadata.platform).toBe(Platform.OS);
    expect(metadata.device_name.startsWith('ARTA ')).toBe(true);
    expect(metadata.device_name).toContain(
      Platform.OS === 'ios' ? 'iOS' : Platform.OS,
    );
  });
});
