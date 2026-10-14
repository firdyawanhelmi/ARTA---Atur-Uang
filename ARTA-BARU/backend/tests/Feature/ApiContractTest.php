<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApiContractTest extends TestCase
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

    public function test_error_envelope_shapes(): void
    {
        $this->getJson('/api/user')->assertUnauthorized()
            ->assertJsonStructure(['message']);
        $this->getJson('/api/v1/me')->assertUnauthorized()
            ->assertJsonStructure(['message']);
        $this->postJson('/api/v1/auth/login', [])->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors']);
    }

    public function test_datetimes_are_iso8601_utc(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);

        $rows = $this->getJson('/api/v1/auth/devices', ['Authorization' => 'Bearer '.$token])
            ->assertOk()->json('data');

        $this->assertNotEmpty($rows);
        foreach (['created_at', 'expires_at'] as $field) {
            $parsed = date_create($rows[0][$field]);
            $this->assertNotFalse($parsed);
            $this->assertSame('+00:00', $parsed->format('P'));
        }
    }

    public function test_throttle_responses_are_json(): void
    {
        $payload = [
            'email' => 'user@example.com',
            'password' => 'wrong-password',
            'device_id' => (string) Str::uuid(),
        ];

        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/v1/auth/login', $payload);
        }

        $this->postJson('/api/v1/auth/login', $payload)
            ->assertTooManyRequests()
            ->assertJsonStructure(['message']);
    }
}
