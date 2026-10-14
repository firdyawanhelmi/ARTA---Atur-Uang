<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResendVerificationRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    /**
     * Account registration. Creates an UNVERIFIED user only: no token, no
     * device session (login requires a verified email per PRD). Email
     * verification delivery belongs to a later task; nothing is sent here.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $email = $request->string('email')->toString();

        // Approved Option B: a taken address receives the byte-identical
        // public response below. Lookup is case-insensitive via the
        // database collation, matching the registration constraint.
        if (User::where('email', $email)->exists()) {
            $this->auditRegisterDuplicate($request, $email);

            return $this->registrationAcceptedResponse();
        }

        try {
            // User creation, verification dispatch, and its audit row share
            // one transaction: an audit failure rolls the account back too,
            // so a mutation never exists without its trail. Email dispatch
            // is external and cannot be recalled — a rolled-back send leaves
            // only a harmless log line whose link can never validate.
            // Failures surface as a generic 500 via the API exception
            // renderer; nothing internal is exposed.
            DB::transaction(function () use ($request) {
                $created = User::create([
                    'name' => $request->string('name')->toString(),
                    'email' => $request->string('email')->toString(),
                    // Hashed automatically by the model's 'hashed' cast.
                    'password' => $request->string('password')->toString(),
                ]);
                $created->sendEmailVerificationNotification();

                DB::table('security_audit_logs')->insert([
                    'user_id' => $created->getKey(),
                    'device_id' => $request->input('device_id'),
                    'event_type' => 'register.success',
                    'metadata' => json_encode([]),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'created_at' => Carbon::now(),
                ]);
            });
        } catch (QueryException $e) {
            // Unique-race safety net: only this table's email unique
            // violation takes the generic path; anything else still throws.
            if ($e->getCode() === '23000'
                && str_contains($e->getMessage(), 'users_email_unique')) {
                $this->auditRegisterDuplicate($request, $email);

                return $this->registrationAcceptedResponse();
            }
            throw $e;
        }

        return $this->registrationAcceptedResponse();
    }

    private function registrationAcceptedResponse(): JsonResponse
    {
        // Identical for new and duplicate addresses. No per-account data:
        // any stored field echoed here would re-open the oracle.
        return response()->json([
            'message' => 'If this email address is not yet registered, an account has been created. Email verification is required before login.',
        ], 201);
    }

    private function auditRegisterDuplicate(Request $request, string $email): void
    {
        DB::table('security_audit_logs')->insert([
            'user_id' => User::where('email', $email)->value('id'),
            'device_id' => $request->input('device_id'),
            'event_type' => 'register.duplicate',
            'metadata' => json_encode([]),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now(),
        ]);
    }

    /**
     * Resend the verification notification. The public response is identical
     * for unknown, verified, and unverified addresses, and for delivery
     * failures, so account status is never revealed. No session, token, or
     * verification-state change happens here.
     */
    public function resendVerification(ResendVerificationRequest $request): JsonResponse
    {
        // Normalized exactly like the account limiter key.
        $email = strtolower(trim($request->string('email')->toString()));
        $user = User::where('email', $email)->first();

        if ($user !== null && ! $user->hasVerifiedEmail()) {
            try {
                $user->sendEmailVerificationNotification();
            } catch (\Throwable) {
                // Delivery failure: same generic response, nothing leaked.
                return $this->resendAcceptedResponse();
            }

            DB::table('security_audit_logs')->insert([
                'user_id' => $user->getKey(),
                'device_id' => null,
                'event_type' => 'email.resend_sent',
                'metadata' => json_encode([]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => Carbon::now(),
            ]);
        }

        return $this->resendAcceptedResponse();
    }

    private function resendAcceptedResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'If an unverified account exists for this email, a verification link has been sent.',
        ]);
    }

    /**
     * Request a password-reset token. The public response is identical for
     * known and unknown addresses, for throttled repeats, and for delivery
     * failures, so account existence is never revealed. Works for unverified
     * accounts (recovery path); verification state is left untouched.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $email = strtolower(trim($request->string('email')->toString()));
        $user = User::where('email', $email)->first();

        if ($user !== null) {
            try {
                Password::sendResetLink(['email' => $email]);
            } catch (\Throwable) {
                return $this->passwordResetAcceptedResponse();
            }

            DB::table('security_audit_logs')->insert([
                'user_id' => $user->getKey(),
                'device_id' => null,
                'event_type' => 'password.forgot_sent',
                'metadata' => json_encode([]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => Carbon::now(),
            ]);
        }

        return $this->passwordResetAcceptedResponse();
    }

    /**
     * Reset the password and revoke every session/token of the account in
     * one transaction: the broker callback, the broker's own token deletion
     * (same connection, joins this transaction), and the audit row commit
     * or roll back together. Unknown email and bad/expired/used tokens share
     * one generic 400 response.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $email = strtolower(trim($request->string('email')->toString()));

        $status = DB::transaction(function () use ($request, $email) {
            return Password::reset(
                [
                    'email' => $email,
                    'token' => $request->input('token'),
                    'password' => $request->input('password'),
                    'password_confirmation' => $request->input('password_confirmation'),
                ],
                function ($user, $password) use ($request) {
                    // Hashed automatically by the model's 'hashed' cast.
                    $user->forceFill(['password' => $password])->save();

                    $tokensDeleted = $user->tokens()->count();
                    $user->tokens()->delete();

                    $sessionsRevoked = DeviceSession::where('user_id', $user->getKey())
                        ->whereNull('revoked_at')
                        ->update(['revoked_at' => Carbon::now()]);

                    DB::table('security_audit_logs')->insert([
                        'user_id' => $user->getKey(),
                        'device_id' => null,
                        'event_type' => 'password.reset_success',
                        'metadata' => json_encode([
                            'sessions_revoked' => $sessionsRevoked,
                            'tokens_deleted' => $tokensDeleted,
                        ]),
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'created_at' => Carbon::now(),
                    ]);
                }
            );
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(
                ['message' => 'This password reset token is invalid.'],
                400
            );
        }

        return response()->json(['message' => 'Your password has been reset.']);
    }

    private function passwordResetAcceptedResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'If an account exists for this email, a password reset link has been sent.',
        ]);
    }

    /**
     * Logout the current device only: revoke its device session and delete
     * the token in use, atomically. Other devices are untouched. The
     * current request already passed authentication, so it still completes;
     * only subsequent requests with this token are rejected.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->currentAccessToken();

        DB::transaction(function () use ($request, $user, $token) {
            $session = DeviceSession::where('sanctum_token_id', $token->getKey())->first();
            $session?->update(['revoked_at' => Carbon::now()]);
            $token->delete();

            DB::table('security_audit_logs')->insert([
                'user_id' => $user->getKey(),
                'device_id' => $session?->device_id,
                'event_type' => 'logout.success',
                'metadata' => json_encode([
                    'session_id' => $session?->getKey(),
                    'token_id' => $token->getKey(),
                ]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => Carbon::now(),
            ]);
        });

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * Logout all devices: delete every personal access token of the
     * authenticated user and revoke all active device sessions, atomically.
     * Financial data is never touched.
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($request, $user) {
            $tokensDeleted = $user->tokens()->count();
            $user->tokens()->delete();

            $sessionsRevoked = DeviceSession::where('user_id', $user->getKey())
                ->whereNull('revoked_at')
                ->update(['revoked_at' => Carbon::now()]);

            DB::table('security_audit_logs')->insert([
                'user_id' => $user->getKey(),
                'device_id' => null,
                'event_type' => 'logout_all.success',
                'metadata' => json_encode([
                    'sessions_revoked' => $sessionsRevoked,
                    'tokens_deleted' => $tokensDeleted,
                ]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => Carbon::now(),
            ]);
        });

        return response()->json(['message' => 'Logged out from all devices.']);
    }

    /**
     * Email/password login. Issues a Sanctum token with fixed 30-day expiry
     * and a linked device session atomically. All credential failures share
     * one generic response so account existence is never revealed.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $email = $request->string('email')->toString();
        $password = $request->string('password')->toString();

        $user = User::where('email', $email)->first();

        $credentialsValid = $user !== null
            && Hash::check($password, $user->password);

        if ($user === null) {
            // Normalize timing; never reveal whether the email exists.
            Hash::check($password, '$2y$10$'.str_repeat('0', 53));
        }

        $verified = $user !== null && $user->email_verified_at !== null;

        if (! $credentialsValid || ! $verified) {
            $this->auditLogin($request, $user?->getKey(), $credentialsValid ? 'email_unverified' : 'invalid_credentials');

            return response()->json(
                ['message' => 'These credentials do not match our records.'],
                401
            );
        }

        // Single fixed-expiry instant shared by token and session row.
        // Never extended by later activity.
        $expiresAt = Carbon::now()->addDays(30);

        [$newToken, $session] = DB::transaction(function () use ($request, $user, $expiresAt) {
            $newToken = $user->createToken(
                $request->input('device_name') ?? 'device',
                ['*'],
                $expiresAt
            );

            $session = DeviceSession::create([
                'user_id' => $user->getKey(),
                'device_id' => $request->input('device_id'),
                'sanctum_token_id' => $newToken->accessToken->getKey(),
                'device_name' => $request->input('device_name'),
                'platform' => $request->input('platform'),
                'app_version' => $request->input('app_version'),
                'expires_at' => $expiresAt,
            ]);

            $this->auditLogin($request, $user->getKey(), 'login.success', [
                'session_id' => $session->getKey(),
                'token_id' => $newToken->accessToken->getKey(),
            ]);

            return [$newToken, $session];
        });

        return response()->json([
            'user' => [
                'id' => $user->getKey(),
                'name' => $user->name,
                'email' => $user->email,
            ],
            'token' => $newToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $session->expires_at->toIso8601String(),
        ], 201);
    }

    /**
     * Append-only audit row. Never receives passwords or plaintext tokens.
     *
     * @param  array<string, mixed>  $metadata
     */
    private function auditLogin(LoginRequest $request, int|string|null $userId, string $event, array $metadata = []): void
    {
        DB::table('security_audit_logs')->insert([
            'user_id' => $userId,
            'device_id' => $request->input('device_id'),
            'event_type' => $event,
            'metadata' => json_encode($metadata),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now(),
        ]);
    }
}
