<?php

namespace App\Http\Middleware;

use App\Models\DeviceSession;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class ValidateDeviceSession
{
    /**
     * Ensure the Sanctum token is bound to an active ARTA device session.
     * Runs after auth:sanctum. Never extends expiry.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        $session = $token instanceof PersonalAccessToken
            ? DeviceSession::where('sanctum_token_id', $token->getKey())->first()
            : null;

        if (! $user
            || ! $session
            || $session->user_id !== $user->getKey()
            || $session->revoked_at !== null
            || $session->expires_at === null
            || $session->expires_at->isPast()
        ) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Mirror Sanctum's own last-used tracking onto the device session.
        // Telemetry only: never extends expiry. Plain query update, so no
        // model events fire and updated_at is untouched.
        DeviceSession::whereKey($session->getKey())->update(['last_used_at' => Carbon::now()]);

        return $next($request);
    }
}
