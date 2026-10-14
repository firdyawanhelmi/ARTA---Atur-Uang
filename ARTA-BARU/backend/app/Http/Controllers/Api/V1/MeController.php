<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangeEmailRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Models\DeviceSession;
use App\Models\User;
use App\Notifications\VerifyPendingEmail;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;

class MeController extends Controller
{
    /**
     * Read the authenticated user's own profile. Identity comes only from
     * the Sanctum session; no id is accepted from the request. Shape is
     * minimal on purpose: only columns that exist today (currency and
     * notification preference stay out until their migration is approved).
     * Never returns password material, tokens, or session metadata.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json($this->profileShape($user));
    }

    /**
     * Update only the display name. Every other attribute (email, verified
     * state, password, tokens, sessions) is unreachable here by
     * construction: only the validated name is assigned. No audit event is
     * recorded: the profile.updated name is still USULAN, not approved.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update(['name' => $request->validated()['name']]);

        return response()->json($this->profileShape($user->fresh()));
    }

    /**
     * Change the authenticated user's own password. Verifies the current
     * password first (generic failure), then — in one transaction —
     * stores the new hash, deletes every personal access token including
     * the one in use, revokes every active device session, and audits.
     * The caller must log in again. No passwords or hashes reach the
     * audit log. Revocation mirrors the reset-password pattern exactly.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->string('current_password')->toString(), $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        DB::transaction(function () use ($request, $user) {
            // Hashed automatically by the model's 'hashed' cast.
            $user->forceFill(['password' => $request->string('password')->toString()])->save();

            $tokensDeleted = $user->tokens()->count();
            $user->tokens()->delete();

            $sessionsRevoked = DeviceSession::where('user_id', $user->getKey())
                ->whereNull('revoked_at')
                ->update(['revoked_at' => Carbon::now()]);

            DB::table('security_audit_logs')->insert([
                'user_id' => $user->getKey(),
                'device_id' => null,
                'event_type' => 'password.changed',
                'metadata' => json_encode([
                    'sessions_revoked' => $sessionsRevoked,
                    'tokens_deleted' => $tokensDeleted,
                ]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => Carbon::now(),
            ]);
        });

        return response()->json(['message' => 'Your password has been changed. Log in again.']);
    }

    /**
     * Request an email change. Stores the new address as pending and sends
     * a signed verification link bound to it; the active address, verified
     * state, sessions, and tokens are untouched until that link is used.
     * Collisions with other accounts' active or pending addresses share one
     * neutral 422 shape (same as validation failures).
     */
    public function changeEmail(ChangeEmailRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->string('current_password')->toString(), $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        $email = $request->string('email')->toString();

        $taken = User::where('email', $email)->where('id', '!=', $user->getKey())->exists()
            || User::where('pending_email', $email)->where('id', '!=', $user->getKey())->exists();

        if ($taken) {
            return response()->json([
                'message' => 'The email is not available.',
                'errors' => ['email' => ['The email is not available.']],
            ], 422);
        }

        try {
            DB::transaction(function () use ($request, $user, $email) {
                $user->forceFill(['pending_email' => $email])->save();

                $url = URL::temporarySignedRoute(
                    'profile.email.verify',
                    Carbon::now()->addMinutes(60),
                    ['id' => $user->getKey(), 'hash' => sha1($email)]
                );
                $user->notify(new VerifyPendingEmail($url));

                DB::table('security_audit_logs')->insert([
                    'user_id' => $user->getKey(),
                    'device_id' => null,
                    'event_type' => 'email.change_requested',
                    'metadata' => json_encode([]),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'created_at' => Carbon::now(),
                ]);
            });
        } catch (QueryException $e) {
            // Pending-email race: only this table's unique violation takes
            // the neutral path; anything else still throws.
            if ($e->getCode() === '23000'
                && str_contains($e->getMessage(), 'users_pending_email_unique')) {
                return response()->json([
                    'message' => 'The email is not available.',
                    'errors' => ['email' => ['The email is not available.']],
                ], 422);
            }
            throw $e;
        }

        return response()->json([
            'message' => 'Verification link sent to the new address. Confirm it within 60 minutes.',
        ], 202);
    }

    /**
     * @param  User  $user
     * @return array<string, mixed>
     */
    private function profileShape($user): array
    {
        return [
            'id' => $user->getKey(),
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
        ];
    }
}
