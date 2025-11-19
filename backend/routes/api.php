<?php

use App\Http\Controllers\Auth\RegisterTenantController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CandidateController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

Route::prefix('/v1')->group(function () {


    Route::middleware(['throttle:20,1'])->group(function () {
        Route::post('/auth/register-tenant', RegisterTenantController::class);
    });

    Route::middleware('throttle:login')->post('/auth/login', [LoginController::class, 'store']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', MeController::class);
        Route::post('/auth/logout', [LogoutController::class, 'destroy']);
    });

    // All tenant-scoped routes require auth.tenant middleware
    // This ensures tenant context is set before any queries
    Route::middleware('auth.tenant')->group(function () {
        // View users - allowed for all authenticated users in the tenant
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        
        // Manage users - only for owners and admins
        Route::middleware('can:manage-users')->group(function () {
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::patch('/users/{user}', [UserController::class, 'update']);
            Route::delete('/users/{user}', [UserController::class, 'destroy']);
        });
        
        // Candidates - owners, admins, and recruiters can manage
        Route::apiResource('candidates', CandidateController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('/candidates/bulk-import', [CandidateController::class, 'bulkImport']);
        
        // CV file access route
        Route::get('/candidates/cv/{path}', function (Request $request, string $path) {
            $auth = $request->user();
            
            // Security check: ensure user has tenant_id
            if (empty($auth->tenant_id)) {
                abort(403, 'User is not associated with a tenant');
            }
            
            // Decode the path and get the full file path
            $filePath = storage_path('app/public/' . urldecode($path));
            
            if (!file_exists($filePath)) {
                abort(404, 'CV file not found');
            }
            
            return response()->file($filePath);
        })->where('path', '.*');
    });
});

Route::get('/health', function () {
    $start = microtime(true);

    $response = response()->json(['status' => 'ok']);

    $duration = microtime(true) - $start;
    Log::info('Health check took ' . number_format($duration * 1000, 2) . ' ms');

    return $response;
});
