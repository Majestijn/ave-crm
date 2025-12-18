<?php

use App\Http\Controllers\Auth\RegisterTenantController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\TenantListController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\AccountActivityController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Spatie\Multitenancy\Http\Middleware\NeedsTenant;

Route::prefix('/v1')->group(function () {


    Route::middleware(['throttle:20,1'])->group(function () {
        Route::post('/auth/register-tenant', RegisterTenantController::class);
        Route::post('/auth/find-tenant', TenantListController::class); // Find tenant domain by email
    });

    Route::middleware(['throttle:login', NeedsTenant::class])->post('/auth/login', [LoginController::class, 'store']);

    Route::middleware([NeedsTenant::class, 'auth:sanctum'])->group(function () {
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

        // Specific routes must come before apiResource to avoid route conflicts
        Route::get('/contacts/candidates', [ContactController::class, 'candidates']);
        Route::post('/contacts/bulk-import', [ContactController::class, 'bulkImport']);
        Route::apiResource('contacts', ContactController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

        Route::get('/contacts/cv/{path}', function (Request $request, string $path) {
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
