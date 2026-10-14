<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class LogoutTest extends TestCase
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

    private function authGet(string $uri, string $token)
    {
        $this->app['auth']->forgetGuards();

        return $this->getJson($uri, ['Authorization' => 'Bearer '.$token]);
    }

    private function authPost(string $uri, string $token, array $data = [])
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson($uri, $data, ['Authorization' => 'Bearer '.$token]);
    }

    public function test_logout_revokes_current_token_and_session(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->authPost('/api/v1/auth/logout', $token)
            ->assertOk()
            ->assertExactJson(['message' => 'Logged out.']);

        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(1, DeviceSession::whereNotNull('revoked_at')->count());
        $this->authGet('/api/user', $token)->assertUnauthorized();
    }

    public function test_logout_leaves_other_devices_alone(): void
    {
        $user = User::factory()->create();
        $tokenA = $this->login($user);
        $tokenB = $this->login($user);
        $this->assertSame(2, DeviceSession::count());

        $this->authPost('/api/v1/auth/logout', $tokenA)->assertOk();

        $this->assertSame(1, PersonalAccessToken::count());
        $this->assertSame(1, DeviceSession::whereNull('revoked_at')->count());
        $this->authGet('/api/user', $tokenA)->assertUnauthorized();
        $this->authGet('/api/user', $tokenB)->assertOk();
    }

    public function test_logout_all_revokes_everything(): void
    {
        $user = User::factory()->create();
        $tokenA = $this->login($user);
        $tokenB = $this->login($user);

        $this->authPost('/api/v1/auth/logout-all', $tokenA)
            ->assertOk()
            ->assertExactJson(['message' => 'Logged out from all devices.']);

        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::whereNull('revoked_at')->count());
        $this->assertSame(2, DeviceSession::whereNotNull('revoked_at')->count());
        $this->authGet('/api/user', $tokenA)->assertUnauthorized();
        $this->authGet('/api/user', $tokenB)->assertUnauthorized();
    }

    public function test_user_cannot_revoke_other_users_sessions(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $tokenA = $this->login($userA);
        $tokenB = $this->login($userB);

        $this->authPost('/api/v1/auth/logout-all', $tokenA)->assertOk();

        $this->assertSame(1, PersonalAccessToken::count());
        $this->authGet('/api/user', $tokenB)->assertOk();
        $this->authGet('/api/user', $tokenA)->assertUnauthorized();
    }

    public function test_logout_without_authentication_is_rejected(): void
    {
        $this->postJson('/api/v1/auth/logout')->assertUnauthorized();
        $this->postJson('/api/v1/auth/logout-all')->assertUnauthorized();
    }

    public function test_failed_logout_leaves_state_untouched(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => 'Bearer invalid'])
            ->assertUnauthorized();

        $this->assertSame(1, PersonalAccessToken::count());
        $this->assertSame(1, DeviceSession::whereNull('revoked_at')->count());
        $this->authGet('/api/user', $token)->assertOk();
    }

    public function test_logout_audit_has_no_secrets(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $this->authPost('/api/v1/auth/logout', $token)->assertOk();
        $this->authPost('/api/v1/auth/logout', $token)->assertUnauthorized();

        $dump = json_encode(DB::table('security_audit_logs')->get()->toArray());
        $this->assertStringNotContainsString($token, $dump);
    }
}
