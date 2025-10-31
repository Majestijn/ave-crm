<?php

use App\Http\Controllers\Auth\RegisterTenantController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;

Route::prefix('/v1')->group(function () {


    Route::middleware(['throttle:20,1'])->group(function () {
        Route::post('/auth/register-tenant', RegisterTenantController::class);
    });

    Route::middleware('throttle:login')->post('/auth/login', [LoginController::class, 'store']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', MeController::class);
        Route::post('/auth/logout', [LogoutController::class, 'destroy']);

        Route::middleware('can:manage-users')->group(function () {
            Route::apiResource('users', UserController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        });
    });

    Route::middleware('auth.tenant')->group(function () {});
});

Route::get('/health', function () {
    $start = microtime(true);

    $response = response()->json(['status' => 'ok']);

    $duration = microtime(true) - $start;
    Log::info('Health check took ' . number_format($duration * 1000, 2) . ' ms');

    return $response;
});
