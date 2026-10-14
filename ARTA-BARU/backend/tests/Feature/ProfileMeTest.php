<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class ProfileMeTest extends TestCase
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

    public function test_me_returns_own_profile_without_secrets(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $response = $this->getJson('/api/v1/me', ['Authorization' => 'Bearer '.$token]);

        $response->assertOk()->assertExactJson([
            'id' => $user->getKey(),
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at->toIso8601String(),
        ]);
    }

    public function test_users_cannot_read_each_others_profile(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $tokenA = $this->login($userA);
        $this->login($userB);

        $body = $this->getJson('/api/v1/me', ['Authorization' => 'Bearer '.$tokenA])
            ->assertOk()->getContent();

        $this->assertStringNotContainsString($userB->email, $body);
        $this->assertStringNotContainsString($userB->name, $body);
    }

    public function test_me_without_authentication_is_rejected(): void
    {
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_me_with_revoked_session_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $user->deviceSessions()->first()->update(['revoked_at' => now()]);

        $this->getJson('/api/v1/me', ['Authorization' => 'Bearer '.$token])
            ->assertUnauthorized();
    }

    public function test_name_update_succeeds(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->patchJson('/api/v1/me', ['name' => 'New Name'], ['Authorization' => 'Bearer '.$token])
            ->assertOk()
            ->assertExactJson([
                'id' => $user->getKey(),
                'name' => 'New Name',
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at->toIso8601String(),
            ]);

        $this->assertSame('New Name', $user->fresh()->name);
    }

    public function test_name_validation_rejects_bad_input(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $headers = ['Authorization' => 'Bearer '.$token];

        $this->patchJson('/api/v1/me', ['name' => ''], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->patchJson('/api/v1/me', ['name' => str_repeat('a', 256)], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->patchJson('/api/v1/me', ['name' => ['array']], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->assertNotSame('', $user->fresh()->name);
    }

    public function test_forbidden_fields_are_ignored(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $originalEmail = $user->email;

        $this->patchJson('/api/v1/me', [
            'name' => 'New Name',
            'email' => 'hacker@example.com',
            'password' => 'hacker-password',
            'is_admin' => true,
        ], ['Authorization' => 'Bearer '.$token])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('New Name', $fresh->name);
        $this->assertSame($originalEmail, $fresh->email);
        $this->assertTrue(Hash::check('password', $fresh->password));
    }

    public function test_patch_without_authentication_is_rejected(): void
    {
        $this->patchJson('/api/v1/me', ['name' => 'X'])->assertUnauthorized();
    }

    public function test_patch_does_not_touch_other_users_or_sensitive_state(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $tokenA = $this->login($userA);
        $sessionsBefore = DeviceSession::count();

        $this->patchJson('/api/v1/me', ['name' => 'A New'], ['Authorization' => 'Bearer '.$tokenA])
            ->assertOk();

        $this->assertSame($userB->name, $userB->fresh()->name);
        $freshA = $userA->fresh();
        $this->assertSame($userA->email, $freshA->email);
        $this->assertNotNull($freshA->email_verified_at);
        $this->assertTrue(Hash::check('password', $freshA->password));
        $this->assertSame($sessionsBefore, DeviceSession::count());
    }

    private function changePassword(User $user, string $token, array $overrides = [])
    {
        $this->app['auth']->forgetGuards();

        return $this->patchJson('/api/v1/me/password', array_merge([
            'current_password' => 'password',
            'password' => 'brand-new-pw',
            'password_confirmation' => 'brand-new-pw',
        ], $overrides), ['Authorization' => 'Bearer '.$token]);
    }

    private function authGet(string $uri, string $token)
    {
        // Same guard-instance discipline as other suites: each call must
        // authenticate from its own header (production boots fresh anyway).
        $this->app['auth']->forgetGuards();

        return $this->getJson($uri, ['Authorization' => 'Bearer '.$token]);
    }

    public function test_password_change_revokes_everything(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $otherToken = $this->login($user);

        $this->changePassword($user, $token)
            ->assertOk()
            ->assertExactJson(['message' => 'Your password has been changed. Log in again.']);

        $this->assertTrue(Hash::check('brand-new-pw', $user->fresh()->password));
        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::whereNull('revoked_at')->count());
        $this->assertSame(2, DeviceSession::whereNotNull('revoked_at')->count());
        $this->authGet('/api/user', $token)->assertUnauthorized();
        $this->authGet('/api/user', $otherToken)->assertUnauthorized();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'brand-new-pw',
            'device_id' => (string) Str::uuid(),
        ])->assertCreated();
    }

    public function test_wrong_current_password_changes_nothing(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->changePassword($user, $token, ['current_password' => 'not-the-password'])
            ->assertUnprocessable();

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
        $this->assertSame(1, PersonalAccessToken::count());
        $this->assertSame(1, DeviceSession::whereNull('revoked_at')->count());
        $this->authGet('/api/user', $token)->assertOk();
    }

    public function test_new_password_validation(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->changePassword($user, $token, ['password' => 'short', 'password_confirmation' => 'short'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->changePassword($user, $token, [
            'password' => $user->email, 'password_confirmation' => $user->email,
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->changePassword($user, $token, ['password_confirmation' => 'different-pw'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_password_change_needs_authentication_and_isolation(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $tokenA = $this->login($userA);
        $tokenB = $this->login($userB);

        $this->patchJson('/api/v1/me/password', [
            'current_password' => 'password',
            'password' => 'brand-new-pw',
            'password_confirmation' => 'brand-new-pw',
        ])->assertUnauthorized();

        $this->changePassword($userA, $tokenA)->assertOk();

        $this->assertTrue(Hash::check('password', $userB->fresh()->password));
        $this->authGet('/api/user', $tokenB)->assertOk();
    }

    public function test_password_change_account_limit_blocks_fourth_attempt(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $wrong = ['current_password' => 'not-the-password'];

        for ($i = 0; $i < 3; $i++) {
            $this->changePassword($user, $token, $wrong)->assertUnprocessable();
        }

        $this->changePassword($user, $token, $wrong)->assertTooManyRequests();

        // Rejected-by-limiter request changed nothing.
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
        $this->assertSame(1, PersonalAccessToken::count());
        $this->assertSame(1, DeviceSession::whereNull('revoked_at')->count());
    }

    public function test_password_throttle_is_per_account(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $tokenA = $this->login($userA);
        $tokenB = $this->login($userB);
        $wrong = ['current_password' => 'not-the-password'];

        for ($i = 0; $i < 3; $i++) {
            $this->changePassword($userA, $tokenA, $wrong)->assertUnprocessable();
        }
        $this->changePassword($userA, $tokenA, $wrong)->assertTooManyRequests();

        // The other account (same IP) is unaffected.
        $this->changePassword($userB, $tokenB)->assertOk();
    }
}
