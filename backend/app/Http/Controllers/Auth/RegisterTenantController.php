<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RegisterTenantController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = $request->validate([
            'company' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'alpha_dash', 'max:64', 'unique:tenants,slug'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'regex:/\d/', 'regex:/[^A-Za-z0-9]/', 'confirmed'],
        ]);

        [$tenant, $admin, $token] = DB::transaction(function () use ($data) {
            $baseSlug = $data['slug'] ?? Str::slug($data['company']);
            $slug = $this->uniqueTenantSlug($baseSlug);

            $tenant = Tenant::create([
                'name' => $data['company'],
                'slug' => $slug,
            ]);

            $admin = User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => 'owner',
            ]);

            $token = $admin->createToken('pat')->plainTextToken;

            return [$tenant, $admin, $token];
        });

        return response()->json([
            'tenant' => [
                'uid' => $tenant->uid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
            ],
            'user' => [
                'uid' => $admin->uid,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
            ],
            'token' => $token,
        ], 201);
    }

    private function uniqueTenantSlug(string $base): string
    {
        $slug = Str::lower($base);
        $slug = preg_replace('/[^a-z0-9\-]+/', '-', $slug);
        $slug = trim(preg_replace('/-+/', '-', $slug), '-');

        if ($slug === '') {
            $slug = 'tenant';
        }

        $try = $slug;
        $i = 1;
        while (Tenant::where('slug', $try)->exists()) {
            $try = $slug . '-' . $i++;
        }
        return $try;
    }
}
