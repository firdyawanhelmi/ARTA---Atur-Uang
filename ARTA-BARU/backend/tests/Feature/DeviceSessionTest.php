<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class DeviceSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_belongs_to_user_and_user_has_many_sessions(): void
    {
        $user = User::factory()->create();
        $session = DeviceSession::create([
            'user_id' => $user->id,
            'device_id' => (string) Str::uuid(),
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        $this->assertTrue($session->user->is($user));
        $this->assertTrue($user->deviceSessions->contains($session));
    }

    public function test_session_links_to_sanctum_token_and_allows_null(): void
    {
        $user = User::factory()->create();
        $accessToken = $user->createToken('test-device')->accessToken;

        $linked = DeviceSession::create([
            'user_id' => $user->id,
            'device_id' => (string) Str::uuid(),
            'sanctum_token_id' => $accessToken->getKey(),
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        $this->assertTrue($linked->sanctumToken->is($accessToken));

        $archived = DeviceSession::create([
            'user_id' => $user->id,
            'device_id' => (string) Str::uuid(),
            'sanctum_token_id' => null,
            'expires_at' => Carbon::now()->addDays(30),
            'revoked_at' => Carbon::now(),
        ]);

        $this->assertNull($archived->sanctumToken);
    }

    public function test_datetime_casts(): void
    {
        $user = User::factory()->create();
        $session = DeviceSession::create([
            'user_id' => $user->id,
            'device_id' => (string) Str::uuid(),
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        $this->assertInstanceOf(Carbon::class, $session->expires_at);
        $this->assertNull($session->last_used_at);
        $this->assertNull($session->revoked_at);
    }
}
