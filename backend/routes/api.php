<?php

use App\Http\Controllers\Auth\RegisterTenantController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;

Route::prefix('/v1')->group(function () {


    Route::middleware(['throttle:20,1'])->group(function () {
        Route::post('/auth/register-tenant', RegisterTenantController::class);
    });

    Route::middleware('auth.tenant')->group(function () {});
});

Route::get('/health', function () {
    $start = microtime(true);

    // Simuleer je health check logic (of laat leeg)
    $response = response()->json(['status' => 'ok']);

    $duration = microtime(true) - $start;
    Log::info('Health check took ' . number_format($duration * 1000, 2) . ' ms');

    return $response;
});
