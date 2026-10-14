<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuditConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private function breakAuditInserts(): void
    {
        DB::listen(function ($query) {
            $sql = strtolower(ltrim($query->sql));
            if (str_starts_with($sql, 'insert') && str_contains($sql, 'security_audit_logs')) {
                throw new \RuntimeException('injected audit fault');
            }
        });
    }

    public function test_register_audit_failure_rolls_back_user(): void
    {
        $this->breakAuditInserts();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => 'user@example.com',
            'password' => 'secret-password',
        ])->assertServerError();

        $this->assertSame(0, User::count());
        $this->assertSame(0, DB::table('security_audit_logs')->count());
    }

    public function test_verify_audit_failure_keeps_unverified(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            ['id' => $user->getKey(), 'hash' => sha1($user->email)]
        );
        $path = parse_url($url, PHP_URL_PATH).'?'.parse_url($url, PHP_URL_QUERY);

        $this->breakAuditInserts();

        $this->get($path)->assertServerError();
        $this->assertNull($user->fresh()->email_verified_at);
    }
}
