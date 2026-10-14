<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function forgot(string $email): string
    {
        $token = '';
        Notification::fake();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])->assertOk();
        $user = User::where('email', $email)->first();
        if ($user !== null) {
            Notification::assertSentTo(
                $user,
                ResetPasswordNotification::class,
                function ($notification) use (&$token) {
                    $token = $notification->token;

                    return true;
                }
            );
        }

        return $token;
    }

    private function resetPayload(string $email, string $token, string $password = 'new-secret-pw'): array
    {
        return [
            'email' => $email,
            'token' => $token,
            'password' => $password,
            'password_confirmation' => $password,
        ];
    }

    public function test_forgot_sends_notification_to_existing_account(): void
    {
        $user = User::factory()->create();

        $token = $this->forgot($user->email);

        $this->assertNotSame('', $token);
        $this->assertSame(1, DB::table('security_audit_logs')
            ->where('event_type', 'password.forgot_sent')->count());
    }

    public function test_unknown_email_matches_known_response(): void
    {
        $user = User::factory()->create();
        $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);

        $unknown = $this->postJson(
            '/api/v1/auth/forgot-password',
            ['email' => 'nobody@example.com']
        )->assertOk();

        $this->assertSame($known->getContent(), $unknown->getContent());
    }

    public function test_valid_token_resets_password_and_login_works(): void
    {
        $user = User::factory()->create();
        $token = $this->forgot($user->email);

        $this->postJson('/api/v1/auth/reset-password', $this->resetPayload($user->email, $token))
            ->assertOk()
            ->assertExactJson(['message' => 'Your password has been reset.']);

        $this->assertTrue(Hash::check('new-secret-pw', $user->fresh()->password));

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'new-secret-pw',
            'device_id' => (string) Str::uuid(),
        ])->assertCreated();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
            'device_id' => (string) Str::uuid(),
        ])->assertUnauthorized();
    }

    public function test_wrong_token_is_rejected(): void
    {
        $user = User::factory()->create();
        $this->forgot($user->email);

        $this->postJson(
            '/api/v1/auth/reset-password',
            $this->resetPayload($user->email, 'wrong-token')
        )->assertBadRequest()
            ->assertExactJson(['message' => 'This password reset token is invalid.']);
    }

    public function test_expired_token_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $this->forgot($user->email);

        DB::table('password_reset_tokens')->where('email', $user->email)
            ->update(['created_at' => Carbon::now()->subMinutes(31)]);

        $this->postJson('/api/v1/auth/reset-password', $this->resetPayload($user->email, $token))
            ->assertBadRequest();
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_fresh_token_within_window_is_accepted(): void
    {
        $user = User::factory()->create();
        $token = $this->forgot($user->email);

        DB::table('password_reset_tokens')->where('email', $user->email)
            ->update(['created_at' => Carbon::now()->subMinutes(29)]);

        $this->postJson('/api/v1/auth/reset-password', $this->resetPayload($user->email, $token))
            ->assertOk();
    }

    public function test_used_token_cannot_be_reused(): void
    {
        $user = User::factory()->create();
        $token = $this->forgot($user->email);

        $this->postJson('/api/v1/auth/reset-password', $this->resetPayload($user->email, $token))
            ->assertOk();

        $this->postJson(
            '/api/v1/auth/reset-password',
            $this->resetPayload($user->email, $token, 'another-secret-pw')
        )->assertBadRequest();
        $this->assertTrue(Hash::check('new-secret-pw', $user->fresh()->password));
    }

    public function test_reset_revokes_all_tokens_and_sessions(): void
    {
        $user = User::factory()->create();
        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
            'device_id' => (string) Str::uuid(),
        ]);
        $login->assertCreated();
        $oldBearer = $login->json('token');
        $this->assertSame(1, PersonalAccessToken::count());
        $this->assertSame(1, DeviceSession::count());

        $token = $this->forgot($user->email);
        $this->postJson('/api/v1/auth/reset-password', $this->resetPayload($user->email, $token))
            ->assertOk();

        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::whereNull('revoked_at')->count());
        $this->assertSame(1, DeviceSession::whereNotNull('revoked_at')->count());

        $this->getJson('/api/user', ['Authorization' => 'Bearer '.$oldBearer])
            ->assertUnauthorized();
    }

    public function test_forgot_account_limit_blocks_fourth_request(): void
    {
        $user = User::factory()->create();
        $payload = ['email' => $user->email];

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/auth/forgot-password', $payload)->assertOk();
        }

        $this->postJson('/api/v1/auth/forgot-password', $payload)->assertTooManyRequests();
    }

    public function test_forgot_ip_limit_blocks_eleventh_request(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson(
                '/api/v1/auth/forgot-password',
                ['email' => "unknown{$i}@example.com"]
            )->assertOk();
        }

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'unknown10@example.com'])
            ->assertTooManyRequests();
    }

    public function test_reset_attempt_limit_blocks_fourth_attempt(): void
    {
        $user = User::factory()->create();
        $payload = $this->resetPayload($user->email, 'wrong-token');

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/auth/reset-password', $payload)->assertBadRequest();
        }

        $this->postJson('/api/v1/auth/reset-password', $payload)->assertTooManyRequests();
    }

    public function test_audit_log_contains_no_secrets(): void
    {
        $user = User::factory()->create();
        $token = $this->forgot($user->email);
        $this->postJson('/api/v1/auth/reset-password', $this->resetPayload($user->email, $token))
            ->assertOk();

        $dump = json_encode(DB::table('security_audit_logs')->get()->toArray());
        $this->assertStringNotContainsString('new-secret-pw', $dump);
        $this->assertStringNotContainsString($token, $dump);
    }
}
