<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function register(array $overrides = []): array
    {
        $response = $this->postJson('/api/v1/auth/register', array_merge([
            'name' => 'Test User',
            'email' => 'user@example.com',
            'password' => 'secret-password',
        ], $overrides));
        $response->assertCreated();

        return [$response, User::where('email', $overrides['email'] ?? 'user@example.com')->first()];
    }

    /** The exact URL production would email, via the default notification. */
    private function verificationUrlFor(User $user): string
    {
        $method = new \ReflectionMethod(VerifyEmail::class, 'verificationUrl');

        return $method->invoke(new VerifyEmail, $user);
    }

    private function pathOf(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH);
        $query = parse_url($url, PHP_URL_QUERY);

        return $path.($query ? "?{$query}" : '');
    }

    public function test_verification_notification_is_sent_without_real_email(): void
    {
        Notification::fake();

        [$response, $user] = $this->register();
        $response->assertCreated();

        Notification::assertSentTo($user, VerifyEmail::class);
        // Fake swaps the mail channel: the notification is recorded and
        // nothing is delivered anywhere.
    }

    public function test_verification_url_expires_in_60_minutes(): void
    {
        [, $user] = $this->register();
        $expires = [];
        parse_str((string) parse_url($this->verificationUrlFor($user), PHP_URL_QUERY), $expires);

        $this->assertArrayHasKey('expires', $expires);
        $this->assertLessThanOrEqual(
            120,
            abs((int) $expires['expires'] - Carbon::now()->addMinutes(60)->getTimestamp())
        );
    }

    public function test_verification_marks_email_verified(): void
    {
        [, $user] = $this->register();

        $this->get($this->pathOf($this->verificationUrlFor($user)))
            ->assertOk()
            ->assertJsonPath('user.email', 'user@example.com');

        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertSame(1, DB::table('security_audit_logs')
            ->where('event_type', 'email.verified')->count());
        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::count());
    }

    public function test_login_after_verification_follows_normal_flow(): void
    {
        [, $user] = $this->register();
        $this->get($this->pathOf($this->verificationUrlFor($user)))->assertOk();

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'user@example.com',
            'password' => 'secret-password',
            'device_id' => (string) Str::uuid(),
        ]);
        $login->assertCreated();

        $this->getJson('/api/user', ['Authorization' => 'Bearer '.$login->json('token')])
            ->assertOk();
    }

    public function test_tampered_signature_is_rejected(): void
    {
        [, $user] = $this->register();
        $url = $this->verificationUrlFor($user);
        $tampered = substr($url, 0, -1).(substr($url, -1) === 'a' ? 'b' : 'a');

        $this->get($this->pathOf($tampered))
            ->assertForbidden()
            ->assertJsonPath('message', 'Invalid signature.');

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_expired_url_is_rejected(): void
    {
        [, $user] = $this->register();
        $expired = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->subMinutes(5),
            ['id' => $user->getKey(), 'hash' => sha1($user->email)]
        );

        $this->get($this->pathOf($expired))->assertForbidden();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_mismatched_identity_is_rejected(): void
    {
        // A validly signed link whose email no longer matches the account
        // (e.g. changed after sending): signature passes, identity check fails.
        [, $user] = $this->register();
        $url = $this->verificationUrlFor($user);
        $user->forceFill(['email' => 'changed@example.com'])->save();

        $this->get($this->pathOf($url))
            ->assertForbidden()
            ->assertJsonPath('message', 'Invalid signature.');

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_unknown_user_is_rejected(): void
    {
        // Valid UUID shape that belongs to nobody: passes routing, fails lookup.
        $url = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            ['id' => '123e4567-e89b-12d3-a456-426614174000', 'hash' => sha1('ghost@example.com')]
        );

        $this->get($this->pathOf($url))->assertForbidden();
        $this->assertSame(0, User::count());
    }

    public function test_non_numeric_id_returns_404(): void
    {
        $this->get('/api/v1/auth/verify-email/abc/'.str_repeat('0', 40).'?expires=9999999999&signature=invalid')
            ->assertNotFound();
    }

    public function test_reuse_is_idempotent_and_creates_no_session(): void
    {
        [, $user] = $this->register();
        $path = $this->pathOf($this->verificationUrlFor($user));

        $this->get($path)->assertOk();
        $verifiedAt = $user->fresh()->email_verified_at;
        $this->get($path)->assertOk();

        $this->assertTrue($user->fresh()->email_verified_at->equalTo($verifiedAt));
        $this->assertSame(0, PersonalAccessToken::count());
        $this->assertSame(0, DeviceSession::count());
    }

    public function test_responses_and_audit_log_leak_nothing(): void
    {
        [, $user] = $this->register();
        $url = $this->verificationUrlFor($user);
        $hash = sha1($user->email);
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $signature = $query['signature'] ?? '';

        $bodies = [
            $this->get($this->pathOf($url))->getContent(),
            $this->get($this->pathOf($url.'tampered'))->getContent(),
        ];

        // Value-level checks: the words in generic framework messages are
        // fine, but no actual signature, hash, URL, or expiry value may leak.
        foreach ($bodies as $body) {
            $this->assertStringNotContainsString($signature, $body);
            $this->assertStringNotContainsString($hash, $body);
            $this->assertStringNotContainsString($url, $body);
            $this->assertStringNotContainsString('expires=', $body);
        }

        $dump = json_encode(DB::table('security_audit_logs')->get()->toArray());
        $this->assertStringNotContainsString($signature, $dump);
        $this->assertStringNotContainsString($hash, $dump);
        $this->assertStringNotContainsString('expires=', $dump);
    }

    public function test_verify_rate_limit(): void
    {
        [, $user] = $this->register();
        $path = $this->pathOf($this->verificationUrlFor($user));

        for ($i = 0; $i < 10; $i++) {
            $this->get($path)->assertOk();
        }

        $this->get($path)->assertTooManyRequests();
    }
}
