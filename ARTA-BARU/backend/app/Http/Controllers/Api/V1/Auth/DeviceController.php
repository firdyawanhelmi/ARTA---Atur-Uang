<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\DeviceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class DeviceController extends Controller
{
    /**
     * List the authenticated user's device sessions, one row per session.
     * Only safe metadata is exposed; never tokens or other users' data.
     */
    public function index(Request $request): JsonResponse
    {
        $sessions = DeviceSession::where('user_id', $request->user()->getKey())
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DeviceSession $session) => [
                'id' => $session->getKey(),
                'device_id' => $session->device_id,
                'device_name' => $session->device_name,
                'platform' => $session->platform,
                'app_version' => $session->app_version,
                'created_at' => $session->created_at?->toIso8601String(),
                'last_used_at' => $session->last_used_at?->toIso8601String(),
                'expires_at' => $session->expires_at?->toIso8601String(),
                'status' => $this->statusOf($session),
            ]);

        return response()->json(['data' => $sessions]);
    }

    /**
     * Rename a device session. Only the display name is writable; the id
     * resolves strictly within the authenticated user's sessions.
     */
    public function update(Request $request, int $device): JsonResponse
    {
        $validated = $request->validate([
            'device_name' => ['required', 'string', 'max:255'],
        ]);

        $session = DeviceSession::where('id', $device)
            ->where('user_id', $request->user()->getKey())
            ->first();

        if ($session === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $session->update(['device_name' => $validated['device_name']]);

        return response()->json([
            'id' => $session->getKey(),
            'device_name' => $session->device_name,
        ]);
    }

    /**
     * Revoke one device session: stamp revoked_at and delete the linked
     * token atomically. Idempotent for already-revoked rows; unknown or
     * foreign ids share one generic 404. Revoking the current session is
     * allowed: this request still completes, later ones are rejected.
     */
    public function revoke(Request $request, int $device): JsonResponse
    {
        $user = $request->user();
        $session = DeviceSession::where('id', $device)
            ->where('user_id', $user->getKey())
            ->first();

        if ($session === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        DB::transaction(function () use ($request, $user, $session) {
            $session->update(['revoked_at' => Carbon::now()]);

            if ($session->sanctum_token_id !== null) {
                PersonalAccessToken::whereKey($session->sanctum_token_id)->delete();
            }

            DB::table('security_audit_logs')->insert([
                'user_id' => $user->getKey(),
                'device_id' => $session->device_id,
                'event_type' => 'device.session_revoked',
                'metadata' => json_encode(['session_id' => $session->getKey()]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => Carbon::now(),
            ]);
        });

        return response()->json(['message' => 'Device session revoked.']);
    }

    private function statusOf(DeviceSession $session): string
    {
        if ($session->revoked_at !== null) {
            return 'revoked';
        }

        if ($session->expires_at === null || $session->expires_at->isPast()) {
            return 'expired';
        }

        return 'active';
    }
}
