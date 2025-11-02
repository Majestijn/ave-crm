<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;
use App\Models\Tenant;
use App\Models\User;

class LoginController extends Controller
{
    public function store(Request $request)
    {
        $credentials = $request->validate([
            'slug' => ['nullable', 'alpha_dash', 'max:64'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $tenantId = null;
        if (!empty($credentials['slug'])) {
            $tenant = Tenant::where('slug', $credentials['slug'])->first();
            if (!$tenant) {
                throw ValidationException::withMessages(['slug' => 'Tenant niet gevonden']);
            }
            $tenantId = $tenant->id;
        }

        $query = User::query()->where('email', $credentials['email']);
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }
        $user = $query->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Ongeldige inloggegevens',
            ]);
        }

        $tokenRecord = $user->createToken('pat');
        $fullToken = $tokenRecord->plainTextToken;

        $userData = [
            'uid'   => $user->uid,
            'name'  => $user->name ?? '',
            'email' => $user->email,
            'role'  => $user->role,
        ];

        Log::info('LoginController: Returning user data', [
            'user_name' => $user->name,
            'user_data' => $userData,
        ]);

        return response()->json([
            'token' => $fullToken,
            'user'  => $userData,
            'tenant' => $user->tenant ? [
                'uid'  => $user->tenant->uid,
                'name' => $user->tenant->name,
                'slug' => $user->tenant->slug ?? null,
            ] : null,
        ]);
    }
}
