<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class VerifyEmailController extends Controller
{
    /**
     * Verify an email address from a signed link (signature + expiry are
     * enforced by the 'signed' middleware before this runs). Idempotent:
     * reusing a link never unverifies and never touches sessions/tokens.
     * No verification URL, signature, or hash is logged or returned.
     */
    public function __invoke(Request $request, string $id, string $hash): JsonResponse
    {
        $user = User::find($id);

        if ($user === null || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            if ($user !== null) {
                DB::table('security_audit_logs')->insert([
                    'user_id' => $user->getKey(),
                    'device_id' => null,
                    'event_type' => 'email.verify_failed',
                    'metadata' => json_encode(['reason' => 'identity_mismatch']),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'created_at' => Carbon::now(),
                ]);
            }

            return response()->json(['message' => 'Invalid signature.'], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            DB::transaction(function () use ($request, $user) {
                $user->markEmailAsVerified();

                DB::table('security_audit_logs')->insert([
                    'user_id' => $user->getKey(),
                    'device_id' => null,
                    'event_type' => 'email.verified',
                    'metadata' => json_encode([]),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'created_at' => Carbon::now(),
                ]);
            });
        }

        return response()->json([
            'message' => 'Email verified. You can now log in.',
            'user' => [
                'id' => $user->getKey(),
                'email' => $user->email,
            ],
        ]);
    }
}
