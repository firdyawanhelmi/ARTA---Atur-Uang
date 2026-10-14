<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    use RefreshDatabase;

    private function payload(User $user, array $overrides = []): array
    {
        return array_merge([
            'email' => $user->email,
            'password' => 'password',
            'device_id' => (string) Str::uuid(),
            'device_name' => 'Test Device',
            'platform' => 'android',
            'app_version' => '1.0.0',
        ], $overrides);
    }

    public function test_verified_credentials_issue_token_and_session(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/auth/login', $this->payload($user));

        $response->assertCreated()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token', 'token_type', 'expires_at']);

        $expiresAt = Carbon::parse($response->json('expires_at'));
        $this->assertTrue($expiresAt->between(
            Carbon::now()->addDays(30)->subHour(),
            Carbon::now()->addDays(30)->addHour()
        ));

        $tokenId = (int) explode('|', $response->json('token'))[0];
        $tokenRow = PersonalAccessToken::find($tokenId);
        $this->assertNotNull($tokenRow);
        $this->assertTrue($tokenRow->expires_at->equalTo($expiresAt));

        $session = DeviceSession::where('sanctum_token_id', $tokenId)->firstOrFail();
        $this->assertTrue($session->user->is($user));
        $this->assertTrue($session->expires_at->equalTo($expiresAt));
        $this->assertNull($session->revoked_at);
    }

    public function test_wrong_password_is_rejected_generically_without_orphans(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson(
            '/api/v1/auth/login',
            $this->payload($user, ['password' => 'wrong-password'])
        );

        $response->assertUnauthorized()
            ->assertExactJson(['message' => 'These credentials do not match our records.']);

        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::count());
        $this->assertSame(1, DB::table('security_audit_logs')
            ->where('event_type', 'invalid_credentials')->count());
    }

    public function test_unknown_email_matches_wrong_password_response(): void
    {
        $user = User::factory()->create();
        $wrong = $this->postJson(
            '/api/v1/auth/login',
            $this->payload($user, ['password' => 'wrong-password'])
        );

        $unknown = $this->postJson(
            '/api/v1/auth/login',
            $this->payload($user, ['email' => 'nobody@example.com'])
        );

        $unknown->assertUnauthorized();
        $this->assertSame($wrong->getContent(), $unknown->getContent());
        $this->assertSame(0, PersonalAccessToken::count());
    }

    public function test_unverified_email_is_rejected_like_bad_credentials(): void
    {
        $user = User::factory()->unverified()->create();

        $response = $this->postJson('/api/v1/auth/login', $this->payload($user));

        $response->assertUnauthorized()
            ->assertExactJson(['message' => 'These credentials do not match our records.']);
        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::count());
    }

    public function test_invalid_device_id_fails_validation(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/login', $this->payload($user, ['device_id' => 'not-a-uuid']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('device_id');

        $this->assertSame(0, PersonalAccessToken::count());
    }

    public function test_rate_limit_blocks_sixth_attempt_per_minute(): void
    {
        $user = User::factory()->create();
        $payload = $this->payload($user, ['password' => 'wrong-password']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', $payload)->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', $payload)->assertTooManyRequests();
    }

    public function test_rate_limit_shares_bucket_across_email_case_variants(): void
    {
        $user = User::factory()->create();
        $variants = [
            'USER@EXAMPLE.COM',
            'User@Example.Com',
            '  user@example.com  ',
            'uSeR@eXaMpLe.cOm',
            'USER@example.com',
        ];

        foreach ($variants as $email) {
            $this->postJson('/api/v1/auth/login', $this->payload($user, [
                'email' => $email,
                'password' => 'wrong-password',
            ]))->assertUnauthorized();
        }

        // Sixth attempt for the same account+IP, regardless of casing.
        // (Fixed address: the bucket key is the normalized input email.)
        $this->postJson('/api/v1/auth/login', $this->payload($user, [
            'email' => 'user@example.com',
            'password' => 'wrong-password',
        ]))->assertTooManyRequests();
    }

    public function test_issued_token_passes_session_middleware(): void
    {
        $user = User::factory()->create();
        $login = $this->postJson('/api/v1/auth/login', $this->payload($user));

        $this->getJson('/api/user', ['Authorization' => 'Bearer '.$login->json('token')])
            ->assertOk();
    }

    public function test_audit_log_contains_no_secrets(): void
    {
        $user = User::factory()->create();
        $password = 'password';
        $login = $this->postJson('/api/v1/auth/login', $this->payload($user));

        $rows = DB::table('security_audit_logs')->get();
        $this->assertGreaterThanOrEqual(1, $rows->count());

        foreach ($rows as $row) {
            $dump = json_encode($row);
            $this->assertStringNotContainsString($password, $dump);
            $this->assertStringNotContainsString($login->json('token'), $dump);
        }
    }
}
