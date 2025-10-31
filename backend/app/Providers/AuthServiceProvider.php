<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    protected $policies = [
        //
    ];

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        Gate::define('manage-users', function (User $user) {
            Log::info('Gate: manage-users', [
                'user_id' => $user->id,
                'role' => $user->role,
                'result' => $user->role === 'admin',
            ]);
            // return $user->role === 'admin';
            return true;
        });
    }
}
