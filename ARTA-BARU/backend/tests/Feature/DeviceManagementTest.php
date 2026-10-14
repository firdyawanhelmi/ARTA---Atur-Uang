<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class DeviceManagementTest extends TestCase
{
    use RefreshDatabase;

    private function login(User $user): string
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
            'device_id' => (string) Str::uuid(),
        ]);
        $response->assertCreated();

        return $response->json('token');
    }

    private function authAs(string $method, string $uri, string $token, array $data = [])
    {
        $this->app['auth']->forgetGuards();

        return $method === 'get'
            ? $this->getJson($uri, ['Authorization' => 'Bearer '.$token])
            : $this->json($method, $uri, $data, ['Authorization' => 'Bearer '.$token]);
    }

    public function test_listing_returns_only_own_sessions_without_tokens(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $this->login($userA);
        $tokenB = $this->login($userB);

        $response = $this->authAs('get', '/api/v1/auth/devices', $tokenB)->assertOk();
        $rows = $response->json('data');

        $this->assertCount(1, $rows);
        $this->assertSame($userB->deviceSessions()->first()->getKey(), $rows[0]['id']);
        $this->assertSame('active', $rows[0]['status']);
        foreach ($rows as $row) {
            $this->assertArrayNotHasKey('token', $row);
            $this->assertArrayNotHasKey('user_id', $row);
        }
        $dump = $response->getContent();
        $this->assertStringNotContainsString($tokenB, $dump);
    }

    public function test_same_device_id_lists_as_separate_rows(): void
    {
        $user = User::factory()->create();
        $deviceId = (string) Str::uuid();
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email, 'password' => 'password', 'device_id' => $deviceId,
        ])->assertCreated();
        $token = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email, 'password' => 'password', 'device_id' => $deviceId,
        ])->assertCreated()->json('token');

        $rows = $this->authAs('get', '/api/v1/auth/devices', $token)->assertOk()->json('data');

        $this->assertCount(2, $rows);
        $this->assertNotSame($rows[0]['id'], $rows[1]['id']);
        $this->assertSame($deviceId, $rows[0]['device_id']);
        $this->assertSame($deviceId, $rows[1]['device_id']);
    }

    public function test_rename_changes_only_name(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $session = $user->deviceSessions()->first();

        $this->authAs('patch', "/api/v1/auth/devices/{$session->getKey()}", $token, [
            'device_name' => 'Renamed',
            'user_id' => 999,
            'device_id' => (string) Str::uuid(),
            'revoked_at' => now()->toIso8601String(),
            'expires_at' => now()->toIso8601String(),
        ])->assertOk()->assertJsonPath('device_name', 'Renamed');

        $fresh = $session->fresh();
        $this->assertSame('Renamed', $fresh->device_name);
        $this->assertSame($session->device_id, $fresh->device_id);
        $this->assertSame($user->getKey(), $fresh->user_id);
        $this->assertNull($fresh->revoked_at);
    }

    public function test_rename_unknown_or_foreign_id_returns_404(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $tokenA = $this->login($userA);
        $this->login($userB);
        $foreignId = $userB->deviceSessions()->first()->getKey();

        $this->authAs('patch', '/api/v1/auth/devices/999999', $tokenA, ['device_name' => 'X'])
            ->assertNotFound();
        $this->authAs('patch', "/api/v1/auth/devices/{$foreignId}", $tokenA, ['device_name' => 'X'])
            ->assertNotFound();
        $this->assertNotSame('X', $userB->deviceSessions()->first()->fresh()->device_name);
    }

    public function test_revoke_deletes_token_and_stamps_session(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $sessionId = $user->deviceSessions()->first()->getKey();

        $this->authAs('delete', "/api/v1/auth/devices/{$sessionId}/session", $token)
            ->assertOk()
            ->assertExactJson(['message' => 'Device session revoked.']);

        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertNotNull(DeviceSession::find($sessionId)->revoked_at);
    }

    public function test_revoke_leaves_other_sessions_alone(): void
    {
        $user = User::factory()->create();
        $tokenA = $this->login($user);
        $tokenB = $this->login($user);
        $idA = $user->deviceSessions()->orderBy('id')->first()->getKey();

        $this->authAs('delete', "/api/v1/auth/devices/{$idA}/session", $tokenA)->assertOk();

        $this->assertSame(1, PersonalAccessToken::count());
        $this->assertSame(1, DeviceSession::whereNull('revoked_at')->count());
        $this->authAs('get', '/api/user', $tokenA)->assertUnauthorized();
        $this->authAs('get', '/api/user', $tokenB)->assertOk();
    }

    public function test_cross_user_revoke_changes_nothing(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $tokenA = $this->login($userA);
        $tokenB = $this->login($userB);
        $idB = $userB->deviceSessions()->first()->getKey();

        $this->authAs('delete', "/api/v1/auth/devices/{$idB}/session", $tokenA)
            ->assertNotFound();

        $this->assertSame(2, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::whereNotNull('revoked_at')->count());
        $this->authAs('get', '/api/user', $tokenB)->assertOk();
    }

    public function test_revoking_current_session_blocks_next_request(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $sessionId = $user->deviceSessions()->first()->getKey();

        $this->authAs('delete', "/api/v1/auth/devices/{$sessionId}/session", $token)->assertOk();
        $this->authAs('get', '/api/user', $token)->assertUnauthorized();
    }

    public function test_session_without_token_row_is_handled_safely(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $session = $user->deviceSessions()->first();
        PersonalAccessToken::query()->delete();

        // Token row gone: Sanctum guard rejects first, nothing crashes.
        $this->authAs('delete', "/api/v1/auth/devices/{$session->getKey()}/session", $token)
            ->assertUnauthorized();

        // Plain row without token link revokes cleanly via its own session.
        $orphan = DeviceSession::create([
            'user_id' => $user->id,
            'device_id' => (string) Str::uuid(),
            'sanctum_token_id' => null,
            'expires_at' => now()->addDays(30),
        ]);
        $freshToken = $this->login($user);
        $this->authAs('delete', "/api/v1/auth/devices/{$orphan->getKey()}/session", $freshToken)
            ->assertOk();
        $this->assertNotNull($orphan->fresh()->revoked_at);
    }

    public function test_guarded_requests_update_last_used_at(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->assertNull($user->deviceSessions()->first()->last_used_at);
        $this->authAs('get', '/api/v1/auth/devices', $token)->assertOk();
        $this->assertNotNull($user->deviceSessions()->first()->fresh()->last_used_at);
    }
}
