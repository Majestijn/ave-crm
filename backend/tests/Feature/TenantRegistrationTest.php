<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\Tenant;
use App\Models\User;

class TenantRegistrationTest extends TestCase
{
    // use RefreshDatabase; // Cannot use RefreshDatabase because we create a database which commits transactions

    protected function setUp(): void
    {
        parent::setUp();
        fwrite(STDERR, "setUp started\n");
        // Ensure clean state
        // $this->cleanupTenant();
        fwrite(STDERR, "setUp finished\n");
    }

    protected function tearDown(): void
    {
        // $this->cleanupTenant();
        parent::tearDown();
    }

    protected function cleanupTenant()
    {
        // Delete tenant from landlord DB
        $tenant = Tenant::where('slug', 'acme-corp')->orWhere('name', 'Acme Corp')->first();
        if ($tenant) {
            $dbName = $tenant->database;
            // Drop tenant DB
            try {
                \Illuminate\Support\Facades\DB::connection('landlord')->statement("DROP DATABASE IF EXISTS \"{$dbName}\"");
            } catch (\Exception $e) {
                // Ignore if DB doesn't exist or other errors during cleanup
            }
            $tenant->delete();
        }

        // Also cleanup user if exists in landlord (though users are now in tenant DB, 
        // if we had any landlord users we'd clean them here. 
        // But wait, the test asserts checking 'users' table. 
        // In the new architecture, users are in tenant DB. 
        // The test code: $this->assertDatabaseHas('users', ...) checks the default connection.
        // If default is landlord, users table shouldn't have this user.
        // Ah, the controller creates user in TENANT DB.
        // So assertDatabaseHas('users') without connection arg checks default (landlord?).
        // We need to be careful about which connection we assert on.
    }

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

        try {
            fwrite(STDERR, "Starting test_can_register_new_tenant\n");
            $response = $this->postJson('/api/v1/auth/register-tenant', $payload);
            fwrite(STDERR, "Finished request. Status: " . $response->status() . "\n");
            if ($response->status() !== 201) {
                fwrite(STDERR, "Response Content: " . $response->content() . "\n");
            }

            $response->assertStatus(201)
                ->assertJsonStructure([
                    'tenant' => ['uid', 'name', 'slug', 'domain'],
                    'user' => ['uid', 'name', 'email', 'role'],
                    'token',
                ]);

            $this->assertDatabaseHas('tenants', [
                'name' => 'Acme Corp',
            ], 'landlord');

            $tenant = Tenant::where('name', 'Acme Corp')->first();
            $this->assertNotNull($tenant);

            // Switch to tenant context to verify user
            $tenant->makeCurrent();

            $this->assertDatabaseHas('users', [
                'email' => 'john@acme.com',
                'role' => 'owner',
            ], 'tenant');
        } catch (\Throwable $e) {
            dump("Caught exception: " . $e->getMessage());
            dump("Trace: " . $e->getTraceAsString());
            throw $e;
        }
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
