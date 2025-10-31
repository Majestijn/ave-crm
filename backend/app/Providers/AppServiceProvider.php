<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            // limiet per IP + e-mail samen; pas aan naar smaak
            $email = (string) $request->input('email');
            return [
                Limit::perMinute(10)->by($request->ip()),
                Limit::perMinute(10)->by($email . $request->ip()),
            ];
        });
    }
}
