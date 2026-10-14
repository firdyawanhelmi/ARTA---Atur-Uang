<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class DeviceSessionMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function activeSession(User $user, int $tokenId): DeviceSession
    {
        return DeviceSession::create([
            'user_id' => $user->id,
            'device_id' => (string) Str::uuid(),
            'sanctum_token_id' => $tokenId,
            'expires_at' => Carbon::now()->addDays(30),
        ]);
    }

    public function test_valid_token_with_active_session_is_allowed(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-device')->plainTextToken;
        $this->activeSession($user, $user->tokens()->first()->getKey());

        $this->withToken($token)->getJson('/api/user')->assertOk();
    }

    public function test_token_without_device_session_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-device')->plainTextToken;

        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_revoked_session_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-device')->plainTextToken;
        $session = $this->activeSession($user, $user->tokens()->first()->getKey());
        $session->update(['revoked_at' => Carbon::now()]);

        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_expired_session_is_rejected(): void
    {
        $user = User::factory()->create();
        // PAT itself has no expiry (Sanctum passes); the session is expired.
        $token = $user->createToken('test-device')->plainTextToken;
        $session = $this->activeSession($user, $user->tokens()->first()->getKey());
        $session->update(['expires_at' => Carbon::now()->subMinute()]);

        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_session_bound_to_different_token_is_rejected(): void
    {
        $user = User::factory()->create();
        $tokenA = $user->createToken('device-a')->plainTextToken;
        $tokenB = $user->createToken('device-b')->plainTextToken;
        $tokenBId = $user->tokens()->where('name', 'device-b')->first()->getKey();
        $this->activeSession($user, $tokenBId);

        $this->getJson('/api/user', ['Authorization' => 'Bearer '.$tokenA])->assertUnauthorized();
        // Guards cache the resolved user per app instance; reset so the
        // second call authenticates from its own header (production boots
        // fresh per request and is unaffected).
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/user', ['Authorization' => 'Bearer '.$tokenB])->assertOk();
    }

    public function test_invalid_token_is_rejected(): void
    {
        $this->withToken('999999|invalid-token-value')->getJson('/api/user')->assertUnauthorized();
        $this->getJson('/api/user')->assertUnauthorized();
    }
}
