<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;
use App\Models\Candidate;
use App\Models\Client;
use App\Policies\CandidatePolicy;
use App\Policies\ClientPolicy;
use Illuminate\Support\Facades\Log;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Candidate::class => CandidatePolicy::class,
        Client::class => ClientPolicy::class,
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
                'result' => in_array($user->role, ['owner', 'admin']),
            ]);
            return in_array($user->role, ['owner', 'admin']);
        });
    }
}
