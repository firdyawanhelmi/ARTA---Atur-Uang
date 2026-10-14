<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class SanctumGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_request_to_protected_route_returns_401(): void
    {
        // Uses the scaffold-default GET /api/user route (auth:sanctum).
        // No application endpoint is created for this probe.
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_valid_sanctum_token_grants_access(): void
    {
        $user = User::factory()->create();
        $newAccessToken = $user->createToken('test-device');
        $token = $newAccessToken->plainTextToken;
        DeviceSession::create([
            'user_id' => $user->id,
            'device_id' => (string) Str::uuid(),
            'sanctum_token_id' => $newAccessToken->accessToken->getKey(),
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', $user->email);
    }
}
