<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test User',
            'email' => 'user@example.com',
            'password' => 'secret-password',
        ], $overrides);
    }

    public function test_valid_registration_creates_unverified_user(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->payload());

        $response->assertCreated()
            ->assertExactJson(['message' => 'If this email address is not yet registered, an account has been created. Email verification is required before login.']);

        $user = User::where('email', 'user@example.com')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        $this->assertTrue(Hash::check('secret-password', $user->password));
        $this->assertNotSame('secret-password', $user->password);
        // PRD §43: user primary keys are UUID v7 (version nibble 7).
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
            (string) $user->getKey()
        );
    }

    public function test_no_token_or_session_before_verification(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();

        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::count());
    }

    public function test_duplicate_email_matches_success_response(): void
    {
        $original = User::factory()->create([
            'name' => 'Original Name',
            'email' => 'user@example.com',
        ]);
        $originalHash = $original->password;

        $fresh = $this->postJson(
            '/api/v1/auth/register',
            $this->payload(['email' => 'fresh@example.com'])
        )->assertCreated();

        $duplicate = $this->postJson('/api/v1/auth/register', $this->payload([
            'name' => 'Attacker Name',
            'email' => 'user@example.com',
            'password' => 'attacker-password',
        ]))->assertCreated();

        // Byte-identical public response for new and duplicate addresses.
        $this->assertSame($fresh->getContent(), $duplicate->getContent());

        // No new account, old data intact, nothing issued or sent.
        $this->assertSame(1, User::where('email', 'user@example.com')->count());
        $kept = User::where('email', 'user@example.com')->firstOrFail();
        $this->assertSame('Original Name', $kept->name);
        $this->assertSame($originalHash, $kept->password);
        $this->assertTrue(Hash::check('password', $kept->password));
        $this->assertFalse(Hash::check('attacker-password', $kept->password));
        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::count());
    }

    public function test_duplicate_sends_no_verification_mail(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'user@example.com']);

        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();

        Notification::assertNotSentTo(
            User::where('email', 'user@example.com')->first(),
            VerifyEmail::class
        );
    }

    public function test_invalid_name_or_email_fails_validation(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload(['email' => 'not-an-email']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->postJson('/api/v1/auth/register', $this->payload(['name' => '']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertSame(0, User::count());
    }

    public function test_weak_or_email_matching_password_fails(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload(['password' => 'short']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->postJson(
            '/api/v1/auth/register',
            $this->payload(['email' => 'longenough@example.com', 'password' => 'longenough@example.com'])
        )->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertSame(0, User::count());
    }

    public function test_audit_log_has_no_secrets(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();

        $rows = DB::table('security_audit_logs')->get();
        $this->assertSame(1, $rows->count());
        $this->assertSame('register.success', $rows->first()->event_type);

        $dump = json_encode($rows);
        $this->assertStringNotContainsString('secret-password', $dump);
    }

    public function test_register_rate_limit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson(
                '/api/v1/auth/register',
                $this->payload(['email' => "user{$i}@example.com"])
            )->assertCreated();
        }

        $this->postJson('/api/v1/auth/register', $this->payload(['email' => 'blocked@example.com']))
            ->assertTooManyRequests();
    }
}
