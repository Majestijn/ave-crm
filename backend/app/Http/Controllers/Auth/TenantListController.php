<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TenantListController extends Controller
{
    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = $validated['email'];

        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            try {
                $tenant->makeCurrent();

                $userExists = User::where('email', $email)->exists();

                \Spatie\Multitenancy\Models\Tenant::forgetCurrent();

                if ($userExists) {
                    return response()->json([
                        'domain' => $tenant->domain,
                    ]);
                }
            } catch (\Exception $e) {
                \Spatie\Multitenancy\Models\Tenant::forgetCurrent();
                continue;
            }
        }

        throw ValidationException::withMessages([
            'email' => 'Geen account gevonden met dit e-mailadres.',
        ]);
    }
}

