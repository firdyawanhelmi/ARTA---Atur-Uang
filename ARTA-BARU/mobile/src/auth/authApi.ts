/**
 * Typed wrappers around the ARTA auth/profile/device endpoints.
 *
 * Contract source: backend `routes/api.php`, controllers
 * `Api\V1\Auth\AuthController`, `Api\V1\Auth\DeviceController`,
 * `Api\V1\MeController`, and `backend/docs/api-contract.md`.
 * This module does not rebuild any endpoint; it only speaks the contract:
 *
 * - POST /auth/register {name,email,password,device_id?} -> 201 {message}
 *   (generic anti-enumeration message, identical for new/duplicates; no token)
 * - POST /auth/login {email,password,device_id,device_name?,platform?}
 *   -> 201 {user{id,name,email},token,token_type,expires_at}
 * - GET /me -> 200 {id,name,email,email_verified_at}
 * - POST /auth/logout | POST /auth/logout-all -> 200 {message}
 * - GET /auth/devices -> 200 {data:[...]} (no tokens, own sessions only)
 * - PATCH /auth/devices/{id} {device_name} -> 200 {id,device_name}
 * - DELETE /auth/devices/{id}/session -> 200 {message}
 *
 * ID policy: `user.id` is a UUID v7 string issued by the server and treated
 * as an opaque string client-side (never generated or parsed here).
 * `device_sessions.id` is an integer row id; `device_id` is the client UUID.
 *
 * Every response body is validated at runtime: a well-formed HTTP status
 * with a malformed body surfaces as `invalid_response`, never as silently
 * accepted partial data.
 */

import { ApiError, api, type RequestFn } from '../api/client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  email_verified_at: string | null;
}

export interface LoginResult {
  user: UserProfile;
  token: string;
  tokenType: string;
  expiresAt: string;
}

export type DeviceSessionStatus = 'active' | 'expired' | 'revoked';

export interface DeviceSessionRow {
  id: number;
  device_id: string;
  device_name: string | null;
  platform: string | null;
  app_version: string | null;
  created_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  status: DeviceSessionStatus;
}

export interface AuthApiDeps {
  request?: RequestFn;
}

function resolveRequest(deps?: AuthApiDeps): RequestFn {
  return deps?.request ?? api.request;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
): string {
  const value = record[field];
  if (typeof value !== 'string' || value === '') {
    throw new ApiError(
      'invalid_response',
      `Server response field "${field}" is missing or invalid.`,
    );
  }
  return value;
}

function optionalString(
  record: Record<string, unknown>,
  field: string,
): string | null {
  const value = record[field];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ApiError(
      'invalid_response',
      `Server response field "${field}" is missing or invalid.`,
    );
  }
  return value;
}

export function parseUserProfile(value: unknown): UserProfile {
  if (!isRecord(value)) {
    throw new ApiError('invalid_response', 'Server returned an invalid user.');
  }
  return {
    id: requiredString(value, 'id'),
    name: requiredString(value, 'name'),
    email: requiredString(value, 'email'),
    email_verified_at: optionalString(value, 'email_verified_at'),
  };
}

export function parseLoginResult(value: unknown): LoginResult {
  if (!isRecord(value)) {
    throw new ApiError(
      'invalid_response',
      'Server returned an invalid login response.',
    );
  }
  const tokenType = requiredString(value, 'token_type');
  if (tokenType !== 'Bearer') {
    throw new ApiError(
      'invalid_response',
      'Server returned an unsupported token type.',
    );
  }
  return {
    user: parseUserProfile(value.user),
    token: requiredString(value, 'token'),
    tokenType,
    expiresAt: requiredString(value, 'expires_at'),
  };
}

function parseDeviceSessionRow(value: unknown): DeviceSessionRow {
  if (!isRecord(value)) {
    throw new ApiError(
      'invalid_response',
      'Server returned an invalid device session.',
    );
  }
  const id = value.id;
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    throw new ApiError(
      'invalid_response',
      'Server response field "id" is missing or invalid.',
    );
  }
  const status = value.status;
  if (status !== 'active' && status !== 'expired' && status !== 'revoked') {
    throw new ApiError(
      'invalid_response',
      'Server response field "status" is missing or invalid.',
    );
  }
  return {
    id,
    device_id: requiredString(value, 'device_id'),
    device_name: optionalString(value, 'device_name'),
    platform: optionalString(value, 'platform'),
    app_version: optionalString(value, 'app_version'),
    created_at: optionalString(value, 'created_at'),
    last_used_at: optionalString(value, 'last_used_at'),
    expires_at: optionalString(value, 'expires_at'),
    status,
  };
}

function parseMessage(value: unknown): { message: string } {
  if (!isRecord(value)) {
    throw new ApiError(
      'invalid_response',
      'Server returned an invalid response.',
    );
  }
  return { message: requiredString(value, 'message') };
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  deviceId?: string;
}

export async function registerAccount(
  input: RegisterInput,
  deps?: AuthApiDeps,
): Promise<{ message: string }> {
  const body: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    password: input.password,
  };
  if (input.deviceId !== undefined) {
    body.device_id = input.deviceId;
  }
  const payload = await resolveRequest(deps)<unknown>({
    method: 'POST',
    path: '/auth/register',
    body,
  });
  return parseMessage(payload);
}

export interface LoginInput {
  email: string;
  password: string;
  deviceId: string;
  deviceName: string;
  platform: string;
}

export async function loginWithPassword(
  input: LoginInput,
  deps?: AuthApiDeps,
): Promise<LoginResult> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'POST',
    path: '/auth/login',
    body: {
      email: input.email,
      password: input.password,
      device_id: input.deviceId,
      device_name: input.deviceName,
      platform: input.platform,
    },
  });
  return parseLoginResult(payload);
}

export async function fetchMyProfile(
  token: string,
  deps?: AuthApiDeps,
): Promise<UserProfile> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'GET',
    path: '/me',
    token,
  });
  return parseUserProfile(payload);
}

export async function performLogout(
  token: string,
  deps?: AuthApiDeps,
): Promise<{ message: string }> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'POST',
    path: '/auth/logout',
    token,
  });
  return parseMessage(payload);
}

export async function performLogoutAll(
  token: string,
  deps?: AuthApiDeps,
): Promise<{ message: string }> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'POST',
    path: '/auth/logout-all',
    token,
  });
  return parseMessage(payload);
}

export async function listDeviceSessions(
  token: string,
  deps?: AuthApiDeps,
): Promise<DeviceSessionRow[]> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'GET',
    path: '/auth/devices',
    token,
  });
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new ApiError(
      'invalid_response',
      'Server returned an invalid device list.',
    );
  }
  return payload.data.map(parseDeviceSessionRow);
}

export async function renameDeviceSession(
  token: string,
  sessionId: number,
  deviceName: string,
  deps?: AuthApiDeps,
): Promise<{ id: number; device_name: string }> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'PATCH',
    path: `/auth/devices/${sessionId}`,
    token,
    body: { device_name: deviceName },
  });
  if (!isRecord(payload)) {
    throw new ApiError(
      'invalid_response',
      'Server returned an invalid device response.',
    );
  }
  const id = payload.id;
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    throw new ApiError(
      'invalid_response',
      'Server response field "id" is missing or invalid.',
    );
  }
  return { id, device_name: requiredString(payload, 'device_name') };
}

export async function revokeDeviceSession(
  token: string,
  sessionId: number,
  deps?: AuthApiDeps,
): Promise<{ message: string }> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'DELETE',
    path: `/auth/devices/${sessionId}/session`,
    token,
  });
  return parseMessage(payload);
}

export async function resendEmailVerification(
  email: string,
  deps?: AuthApiDeps,
): Promise<{ message: string }> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'POST',
    path: '/auth/resend-verification',
    body: { email },
  });
  return parseMessage(payload);
}

export async function requestPasswordReset(
  email: string,
  deps?: AuthApiDeps,
): Promise<{ message: string }> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'POST',
    path: '/auth/forgot-password',
    body: { email },
  });
  return parseMessage(payload);
}

export interface ResetPasswordInput {
  email: string;
  token: string;
  password: string;
  passwordConfirmation: string;
}

export async function submitPasswordReset(
  input: ResetPasswordInput,
  deps?: AuthApiDeps,
): Promise<{ message: string }> {
  const payload = await resolveRequest(deps)<unknown>({
    method: 'POST',
    path: '/auth/reset-password',
    body: {
      email: input.email,
      token: input.token,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
  });
  return parseMessage(payload);
}
