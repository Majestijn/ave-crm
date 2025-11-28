<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\Tenant;
use App\Models\User;

class TenantRegistrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that a new tenant can be registered successfully.
     */
    public function test_can_register_new_tenant()
    {
        $payload = [
            'company' => 'Acme Corp',
            'name' => 'John Doe',
            'email' => 'john@acme.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        $response = $this->postJson('/api/v1/auth/register-tenant', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'tenant' => ['uid', 'name', 'slug'],
                'user' => ['uid', 'name', 'email', 'role'],
                'token',
            ]);

        $this->assertDatabaseHas('tenants', [
            'name' => 'Acme Corp',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@acme.com',
            'role' => 'owner',
        ]);

        // Verify the user is associated with the tenant
        $tenant = Tenant::where('name', 'Acme Corp')->first();
        $user = User::where('email', 'john@acme.com')->first();

        $this->assertEquals($tenant->id, $user->tenant_id);
    }

    /**
     * Test that registration fails with invalid data.
     */
    public function test_registration_fails_with_invalid_data()
    {
        $payload = [
            'company' => '', // Required
            'name' => '', // Required
            'email' => 'invalid-email', // Invalid email
            'password' => 'weak', // Too short, no number/special char
            'password_confirmation' => 'mismatch',
        ];

        $response = $this->postJson('/api/v1/auth/register-tenant', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['company', 'name', 'email', 'password']);
    }
}
