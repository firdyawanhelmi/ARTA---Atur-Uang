<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class EmailChangeTest extends TestCase
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

    private function authed(string $method, string $uri, string $token, array $data = [])
    {
        $this->app['auth']->forgetGuards();

        return $this->json($method, $uri, $data, ['Authorization' => 'Bearer '.$token]);
    }

    private function changePayload(array $overrides = []): array
    {
        return array_merge([
            'current_password' => 'password',
            'email' => 'new-address@example.com',
        ], $overrides);
    }

    private function pendingUrlFor(User $user): string
    {
        return URL::temporarySignedRoute(
            'profile.email.verify',
            Carbon::now()->addMinutes(60),
            ['id' => $user->getKey(), 'hash' => sha1($user->fresh()->pending_email)]
        );
    }

    private function pathOf(string $url): string
    {
        return parse_url($url, PHP_URL_PATH).'?'.parse_url($url, PHP_URL_QUERY);
    }

    public function test_valid_request_stores_pending_and_keeps_active(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->authed('PATCH', '/api/v1/me/email', $token, $this->changePayload())
            ->assertAccepted();

        $fresh = $user->fresh();
        $this->assertSame('new-address@example.com', $fresh->pending_email);
        $this->assertSame($user->email, $fresh->email);
        $this->assertNotNull($fresh->email_verified_at);
    }

    public function test_wrong_current_password_and_bad_input(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->authed('PATCH', '/api/v1/me/email', $token,
            $this->changePayload(['current_password' => 'wrong-password'])
        )->assertUnprocessable();

        $this->authed('PATCH', '/api/v1/me/email', $token,
            $this->changePayload(['email' => 'not-an-email'])
        )->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->authed('PATCH', '/api/v1/me/email', $token,
            $this->changePayload(['email' => $user->email])
        )->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertNull($user->fresh()->pending_email);
    }

    public function test_active_and_pending_collisions_share_neutral_422(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $other->forceFill(['pending_email' => 'taken-pending@example.com'])->save();
        $token = $this->login($user);

        $active = $this->authed('PATCH', '/api/v1/me/email', $token,
            $this->changePayload(['email' => $other->email]));
        $pending = $this->authed('PATCH', '/api/v1/me/email', $token,
            $this->changePayload(['email' => 'taken-pending@example.com']));

        $active->assertUnprocessable();
        $pending->assertUnprocessable();
        $this->assertSame($active->getContent(), $pending->getContent());
        $this->assertNull($user->fresh()->pending_email);
    }

    public function test_unauthenticated_revoked_and_cross_user(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $tokenA = $this->login($userA);
        $tokenB = $this->login($userB);

        $this->patchJson('/api/v1/me/email', $this->changePayload())->assertUnauthorized();

        $userA->deviceSessions()->first()->update(['revoked_at' => now()]);
        $this->authed('PATCH', '/api/v1/me/email', $tokenA, $this->changePayload())
            ->assertUnauthorized();
        $this->assertNull($userA->fresh()->pending_email);

        // B's request cannot touch A's pending row.
        $this->authed('PATCH', '/api/v1/me/email', $tokenB, $this->changePayload())
            ->assertAccepted();
        $this->assertNull($userA->fresh()->pending_email);
        $this->assertSame('new-address@example.com', $userB->fresh()->pending_email);
    }

    public function test_verify_moves_email_and_revokes_everything(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $oldEmail = $user->email;
        $this->authed('PATCH', '/api/v1/me/email', $token, $this->changePayload())
            ->assertAccepted();

        $this->get($this->pathOf($this->pendingUrlFor($user)))
            ->assertOk()
            ->assertJsonPath('user.email', 'new-address@example.com');

        $fresh = $user->fresh();
        $this->assertSame('new-address@example.com', $fresh->email);
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertNull($fresh->pending_email);
        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::whereNull('revoked_at')->count());
        $this->authed('get', '/api/user', $token)->assertUnauthorized();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'new-address@example.com',
            'password' => 'password',
            'device_id' => (string) Str::uuid(),
        ])->assertCreated();
        $this->postJson('/api/v1/auth/login', [
            'email' => $oldEmail,
            'password' => 'password',
            'device_id' => (string) Str::uuid(),
        ])->assertUnauthorized();
    }

    public function test_stale_expired_tampered_and_reused_links_rejected(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $this->authed('PATCH', '/api/v1/me/email', $token, $this->changePayload())
            ->assertAccepted();
        $firstUrl = $this->pendingUrlFor($user);

        // Superseded by a newer request.
        $this->authed('PATCH', '/api/v1/me/email', $token,
            $this->changePayload(['email' => 'second@example.com']))->assertAccepted();
        $this->get($this->pathOf($firstUrl))->assertForbidden();

        // Expired and tampered.
        $expired = URL::temporarySignedRoute('profile.email.verify', Carbon::now()->subMinutes(5),
            ['id' => $user->getKey(), 'hash' => sha1('second@example.com')]);
        $this->get($this->pathOf($expired))->assertForbidden();
        $this->get($this->pathOf($this->pendingUrlFor($user).'x'))->assertForbidden();

        // Valid use, then reuse of the same link.
        $goodUrl = $this->pendingUrlFor($user);
        $this->get($this->pathOf($goodUrl))->assertOk();
        $this->get($this->pathOf($goodUrl))->assertForbidden();

        $this->assertSame('second@example.com', $user->fresh()->email);
    }

    public function test_audit_has_no_secrets(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $token = $this->login($user);
        $this->authed('PATCH', '/api/v1/me/email', $token, $this->changePayload())
            ->assertAccepted();
        $this->get($this->pathOf($this->pendingUrlFor($user)))->assertOk();

        $dump = json_encode(DB::table('security_audit_logs')->get()->toArray());
        $this->assertStringNotContainsString('password', $dump);
        $this->assertStringNotContainsString('signature', $dump);
        $this->assertStringNotContainsString('new-address@example.com', $dump);
    }
}
