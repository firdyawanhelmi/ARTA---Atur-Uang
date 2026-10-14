<?php

namespace Tests\Feature;

use App\Models\DeviceSession;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class UuidV7ConversionTest extends TestCase
{
    use RefreshDatabase;

    private function converter(): object
    {
        $migration = require database_path('migrations/2026_10_14_030737_convert_users_id_to_uuid_v7.php');

        $this->assertIsObject($migration);

        return $migration;
    }

    public function test_conversion_remaps_legacy_ids_and_all_references(): void
    {
        $legacy = User::factory()->make();
        $legacy->id = '1';
        $legacy->save();

        $this->postJson('/api/v1/auth/login', [
            'email' => $legacy->email,
            'password' => 'password',
            'device_id' => (string) Str::uuid(),
        ])->assertCreated();

        $this->assertSame('1', (string) $legacy->fresh()->getKey());
        $this->assertSame(1, DeviceSession::where('user_id', '1')->count());

        $this->converter()->up();

        $uuid = (string) User::firstOrFail()->getKey();
        $this->assertNotSame('1', $uuid);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
            $uuid
        );

        $this->assertSame(1, User::count());
        $this->assertSame($uuid, (string) DeviceSession::firstOrFail()->user_id);
        $this->assertSame($uuid, (string) DB::table('personal_access_tokens')->first()->tokenable_id);
        $this->assertSame(
            $uuid,
            (string) DB::table('security_audit_logs')->where('event_type', 'login.success')->first()->user_id
        );

        // The restored foreign key must reject orphan references.
        $this->expectException(QueryException::class);
        DeviceSession::create([
            'user_id' => '00000000-0000-4000-8000-000000000000',
            'device_id' => (string) Str::uuid(),
            'expires_at' => Carbon::now()->addDays(30),
        ]);
    }

    public function test_conversion_is_explicitly_irreversible(): void
    {
        $this->expectException(\RuntimeException::class);

        $this->converter()->down();
    }
}
