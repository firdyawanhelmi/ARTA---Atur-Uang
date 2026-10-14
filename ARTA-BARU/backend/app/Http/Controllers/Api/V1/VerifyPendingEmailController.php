<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class VerifyPendingEmailController extends Controller
{
    /**
     * Confirm a pending email address from its signed link (signature and
     * 60-minute expiry are enforced by the 'signed' middleware first).
     * The link is valid only while it matches the CURRENT pending address,
     * so superseded or reused links fail closed. On success, exactly one
     * transaction moves the address, stamps verification, clears pending,
     * revokes every token/session including the current one, and audits.
     * No URL, signature, or hash is logged or returned.
     */
    public function __invoke(Request $request, string $id, string $hash): JsonResponse
    {
        $user = User::find($id);
        $pending = $user?->pending_email;

        if ($user === null || $pending === null
            || ! hash_equals(sha1($pending), $hash)
        ) {
            if ($user !== null) {
                DB::table('security_audit_logs')->insert([
                    'user_id' => $user->getKey(),
                    'device_id' => null,
                    'event_type' => 'email.change_verify_failed',
                    'metadata' => json_encode(['reason' => 'identity_mismatch']),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'created_at' => Carbon::now(),
                ]);
            }

            return response()->json(['message' => 'Invalid signature.'], 403);
        }

        DB::transaction(function () use ($request, $user, $pending) {
            $user->forceFill([
                'email' => $pending,
                'email_verified_at' => Carbon::now(),
                'pending_email' => null,
            ])->save();

            $tokensDeleted = $user->tokens()->count();
            $user->tokens()->delete();

            $sessionsRevoked = DeviceSession::where('user_id', $user->getKey())
                ->whereNull('revoked_at')
                ->update(['revoked_at' => Carbon::now()]);

            DB::table('security_audit_logs')->insert([
                'user_id' => $user->getKey(),
                'device_id' => null,
                'event_type' => 'email.change_verified',
                'metadata' => json_encode([
                    'sessions_revoked' => $sessionsRevoked,
                    'tokens_deleted' => $tokensDeleted,
                ]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => Carbon::now(),
            ]);
        });

        return response()->json([
            'message' => 'Email address changed. Log in again.',
            'user' => [
                'id' => $user->getKey(),
                'email' => $user->fresh()->email,
            ],
        ]);
    }
}
