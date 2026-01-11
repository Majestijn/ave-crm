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
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\AssignmentActivityController;
use App\Http\Controllers\AssignmentCandidateController;
use App\Http\Controllers\AccountContactController;
use App\Http\Controllers\CalendarEventController;
use App\Http\Controllers\CalendarFeedController;
use App\Http\Controllers\ContactDocumentController;
use App\Http\Controllers\BatchCvImportController;
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
        Route::post('/contacts/smart-import', [ContactController::class, 'smartBulkImport']);
        Route::get('/contacts/smart-import/{batchId}', [ContactController::class, 'smartBulkImportStatus']);
        Route::apiResource('contacts', ContactController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

        // Legacy CV route (for backward compatibility)
        Route::get('/contacts/cv/{path}', function (Request $request, string $path) {
            // User is already authenticated in the tenant context
            $filePath = storage_path('app/public/' . urldecode($path));

            if (!file_exists($filePath)) {
                abort(404, 'CV file not found');
            }

            return response()->file($filePath);
        })->where('path', '.*');

        // Contact documents (R2 storage)
        Route::get('/contacts/{contact}/documents', [ContactDocumentController::class, 'index']);
        Route::post('/contacts/{contact}/documents', [ContactDocumentController::class, 'store']);
        Route::get('/contact-documents/{document}/download', [ContactDocumentController::class, 'download'])
            ->name('contact-documents.download');
        Route::get('/contact-documents/{document}/url', [ContactDocumentController::class, 'getSignedUrl']);
        Route::delete('/contact-documents/{document}', [ContactDocumentController::class, 'destroy']);

        Route::apiResource('accounts', AccountController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

        Route::get('/accounts/{account}/activities', [AccountActivityController::class, 'index']);
        Route::post('/accounts/{account}/activities', [AccountActivityController::class, 'store']);
        Route::delete('/activities/{accountActivity}', [AccountActivityController::class, 'destroy']);

        // Account contacts (contactpersonen per klant)
        Route::get('/accounts/{account}/contacts', [AccountContactController::class, 'index']);
        Route::post('/accounts/{account}/contacts', [AccountContactController::class, 'store']);
        Route::delete('/account-contacts/{contact}', [AccountContactController::class, 'destroy']);

        Route::get('/accounts/{account}/assignments', [AssignmentController::class, 'byAccount']);
        Route::apiResource('assignments', AssignmentController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::delete('/assignments/{assignment}/notes-image', [AssignmentController::class, 'deleteNotesImage']);

        // Assignment activities (per opdracht)
        Route::get('/assignments/{assignment}/activities', [AssignmentActivityController::class, 'index']);
        Route::post('/assignments/{assignment}/activities', [AssignmentActivityController::class, 'store']);
        Route::delete('/assignment-activities/{activity}', [AssignmentActivityController::class, 'destroy']);

        // Assignment candidates (kandidaten per opdracht)
        Route::get('/assignments/{assignment}/candidates', [AssignmentCandidateController::class, 'index']);
        Route::post('/assignments/{assignment}/candidates', [AssignmentCandidateController::class, 'store']);
        Route::put('/assignments/{assignment}/candidates/{contact}', [AssignmentCandidateController::class, 'update']);
        Route::delete('/assignments/{assignment}/candidates/{contact}', [AssignmentCandidateController::class, 'destroy']);

        // Calendar events (agenda)
        Route::get('/calendar-events', [CalendarEventController::class, 'index']);
        Route::post('/calendar-events', [CalendarEventController::class, 'store']);
        Route::get('/calendar-events/{event}', [CalendarEventController::class, 'show']);
        Route::put('/calendar-events/{event}', [CalendarEventController::class, 'update']);
        Route::delete('/calendar-events/{event}', [CalendarEventController::class, 'destroy']);

        // Calendar feed URL management (authenticated)
        Route::get('/calendar-feed/url', [CalendarFeedController::class, 'getUrl']);
        Route::post('/calendar-feed/regenerate', [CalendarFeedController::class, 'regenerateToken']);

        // Batch CV import (Vertex AI)
        Route::post('/cv-import/batch', [BatchCvImportController::class, 'upload']);
        Route::get('/cv-import/batch', [BatchCvImportController::class, 'index']);
        Route::get('/cv-import/batch/{batchUid}', [BatchCvImportController::class, 'status']);
    });

    // Public iCal feed (authenticated via token in URL, tenant via path)
    Route::get('/calendar-feed/{tenantDomain}/{token}', [CalendarFeedController::class, 'feed']);
});

Route::get('/health', function () {
    $start = microtime(true);

    $response = response()->json(['status' => 'ok']);

    $duration = microtime(true) - $start;
    Log::info('Health check took ' . number_format($duration * 1000, 2) . ' ms');

    return $response;
});
