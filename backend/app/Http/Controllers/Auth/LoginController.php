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
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        // Tenant context should be set by middleware (NeedsTenant)
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Ongeldige inloggegevens',
            ]);
        }

        $tokenRecord = $user->createToken('pat');
        $fullToken = $tokenRecord->plainTextToken;

        $userData = [
            'uid' => $user->uid,
            'name' => $user->name ?? '',
            'email' => $user->email,
            'role' => $user->role,
        ];

        Log::info('LoginController: Returning user data', [
            'user_name' => $user->name,
            'user_data' => $userData,
        ]);

        $tenant = \Spatie\Multitenancy\Models\Tenant::current();

        return response()->json([
            'token' => $fullToken,
            'user' => $userData,
            'tenant' => $tenant ? [
                'uid' => $tenant->uid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
            ] : null,
        ]);
    }
}
