<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class ResendVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function genericBody(): array
    {
        return ['message' => 'If an unverified account exists for this email, a verification link has been sent.'];
    }

    public function test_unverified_account_receives_notification(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();

        $this->postJson('/api/v1/auth/resend-verification', ['email' => $user->email])
            ->assertOk()
            ->assertExactJson($this->genericBody());

        Notification::assertSentTo($user, VerifyEmail::class);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_verified_account_receives_no_new_notification(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/resend-verification', ['email' => $user->email])
            ->assertOk()
            ->assertExactJson($this->genericBody());

        Notification::assertNotSentTo($user, VerifyEmail::class);
    }

    public function test_unknown_email_matches_other_responses(): void
    {
        $unverified = User::factory()->unverified()->create();
        $verified = User::factory()->create();

        $bodies = [];
        foreach ([$unverified->email, $verified->email, 'nobody@example.com'] as $email) {
            $bodies[] = $this->postJson('/api/v1/auth/resend-verification', ['email' => $email])
                ->assertOk()
                ->getContent();
        }

        $this->assertSame($bodies[0], $bodies[1]);
        $this->assertSame($bodies[0], $bodies[2]);
    }

    public function test_resend_creates_no_token_or_session(): void
    {
        $user = User::factory()->unverified()->create();

        $this->postJson('/api/v1/auth/resend-verification', ['email' => $user->email])
            ->assertOk();

        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::count());
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_account_limit_blocks_fourth_send_in_15_minutes(): void
    {
        $user = User::factory()->unverified()->create();
        $payload = ['email' => $user->email];

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/auth/resend-verification', $payload)->assertOk();
        }

        $this->postJson('/api/v1/auth/resend-verification', $payload)
            ->assertTooManyRequests();
    }

    public function test_ip_limit_blocks_eleventh_request_per_minute(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson(
                '/api/v1/auth/resend-verification',
                ['email' => "unknown{$i}@example.com"]
            )->assertOk();
        }

        $this->postJson('/api/v1/auth/resend-verification', ['email' => 'unknown10@example.com'])
            ->assertTooManyRequests();
    }

    public function test_send_failure_returns_generic_response(): void
    {
        config(['mail.default' => 'smtp']);
        $user = User::factory()->unverified()->create();

        $this->postJson('/api/v1/auth/resend-verification', ['email' => $user->email])
            ->assertOk()
            ->assertExactJson($this->genericBody());

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertSame(0, DB::table('security_audit_logs')->count());
    }

    public function test_audit_has_no_secrets(): void
    {
        $user = User::factory()->unverified()->create();

        $this->postJson('/api/v1/auth/resend-verification', ['email' => $user->email])
            ->assertOk();

        $rows = DB::table('security_audit_logs')->get();
        $this->assertSame(1, $rows->count());
        $this->assertSame('email.resend_sent', $rows->first()->event_type);

        $dump = json_encode($rows);
        $this->assertStringNotContainsString('signature', $dump);
        $this->assertStringNotContainsString('http', $dump);
    }
}
