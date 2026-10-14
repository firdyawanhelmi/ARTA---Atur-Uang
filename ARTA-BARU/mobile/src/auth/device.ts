/**
 * Device identity for the ARTA mobile app (PRD sections 7-8,
 * `backend/docs/auth-decisions.md` point 3).
 *
 * - `device_id` is a client-generated UUID (v4) created once per
 *   installation, persisted in SecureStore, and sent on register/login.
 *   It is immutable for the life of the installation and identifies the
 *   installation, never the account: logout and account switches never
 *   regenerate or clear it.
 * - `device_name`/`platform` are display/metadata strings. The backend
 *   accepts them as nullable; `app_version` is intentionally omitted for
 *   now (no `expo-application` dependency is added by this task, and the
 *   field is nullable server-side).
 *
 * No new dependencies: UUID v4 is generated locally (version/variant bits
 * set per RFC 4122) using `crypto.getRandomValues` with a Math.random
 * fallback.
 */

import { Platform } from 'react-native';

import { loadDeviceId, saveDeviceId, type SecureBackend } from './tokenStorage';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function defaultRandomBytes(count: number): Uint8Array {
  const globalCrypto = (
    globalThis as {
      crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
    }
  ).crypto;
  if (globalCrypto?.getRandomValues) {
    return globalCrypto.getRandomValues(new Uint8Array(count));
  }
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

export function newDeviceUuid(
  randomBytes: (count: number) => Uint8Array = defaultRandomBytes,
): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return (
    `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-` +
    `${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-` +
    `${hex.slice(10, 16).join('')}`
  );
}

/**
 * Return the persistent install id, creating and storing it on first use.
 * A stored value that is no longer a valid UUID is replaced (defensive;
 * SecureStore is the only writer, so this should not happen in practice).
 */
export async function getOrCreateDeviceId(
  store?: SecureBackend,
): Promise<string> {
  const stored = await loadDeviceId(store);
  if (stored !== null && isUuid(stored)) {
    return stored;
  }
  const created = newDeviceUuid();
  await saveDeviceId(created, store);
  return created;
}

export interface DeviceMetadata {
  device_name: string;
  platform: string;
}

export function deviceMetadata(): DeviceMetadata {
  const os = Platform.OS;
  const label = os === 'android' ? 'Android' : os === 'ios' ? 'iOS' : os;
  return { device_name: `ARTA ${label}`, platform: os };
}
