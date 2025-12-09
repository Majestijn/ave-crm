<?php

use App\Http\Controllers\Auth\RegisterTenantController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CandidateController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\AccountActivityController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

Route::prefix('/v1')->group(function () {


    Route::middleware(['throttle:20,1'])->group(function () {
        Route::post('/auth/register-tenant', RegisterTenantController::class);
    });

    Route::middleware(['throttle:login', \Spatie\Multitenancy\Http\Middleware\NeedsTenant::class])->post('/auth/login', [LoginController::class, 'store']);

    Route::middleware([\Spatie\Multitenancy\Http\Middleware\NeedsTenant::class, 'auth:sanctum'])->group(function () {
        Route::get('/auth/me', MeController::class);
        Route::post('/auth/logout', [LogoutController::class, 'destroy']);

        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);

        Route::middleware('can:manage-users')->group(function () {
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::patch('/users/{user}', [UserController::class, 'update']);
            Route::delete('/users/{user}', [UserController::class, 'destroy']);
        });

        Route::apiResource('candidates', CandidateController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('/candidates/bulk-import', [CandidateController::class, 'bulkImport']);

        Route::get('/candidates/cv/{path}', function (Request $request, string $path) {
            // User is already authenticated in the tenant context
            $filePath = storage_path('app/public/' . urldecode($path));

            if (!file_exists($filePath)) {
                abort(404, 'CV file not found');
            }

            return response()->file($filePath);
        })->where('path', '.*');

        Route::apiResource('accounts', AccountController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

        Route::get('/accounts/{account}/activities', [AccountActivityController::class, 'index']);
        Route::post('/accounts/{account}/activities', [AccountActivityController::class, 'store']);
        Route::delete('/activities/{accountActivity}', [AccountActivityController::class, 'destroy']);
    });
});

Route::get('/health', function () {
    $start = microtime(true);

    $response = response()->json(['status' => 'ok']);

    $duration = microtime(true) - $start;
    Log::info('Health check took ' . number_format($duration * 1000, 2) . ' ms');

    return $response;
});
