<?php

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
|
| Development: APP_ENV=local → allows localhost:* patterns
| Production:  APP_ENV=production → uses CORS_ALLOWED_ORIGIN from .env
|
*/

$isProduction = env('APP_ENV') === 'production';
$hasProdCors = ! empty(trim((string) (env('CORS_ALLOWED_ORIGIN') ?? ''))) || ! empty(trim((string) (env('CORS_PATTERN') ?? '')));

// In production without CORS config, fall back to dev origins (avoids block when .env is misconfigured)
$useDevCors = ! $isProduction || ! $hasProdCors;

// Development origins (localhost with any port)
$devOrigins = [
    'http://localhost:5173',   // Vite dev server (default)
    'http://localhost:8080',   // Backend/nginx (Docker)
    'http://localhost:8000',   // php artisan serve
    'http://localhost:3000',   // Alternative frontend port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8000',
];

// Patterns need regex delimiters (#...#)
$devPatterns = [
    '#https?://localhost(:\d+)?#',
    '#https?://127\.0\.0\.1(:\d+)?#',
    '#https?://[a-z0-9-]+\.localhost(:\d+)?#',
    '#https?://[a-z0-9-]+\.lvh\.me(:\d+)?#',
];

// Chrome extension (LinkedIn import) - allow in both dev and prod
$extensionPatterns = [
    '#^chrome-extension://[a-z]+$#',  // LinkedIn extension
];

// Production origins from .env
$prodOrigins = array_filter([
    env('CORS_ALLOWED_ORIGIN'),
    env('APP_URL'),
]);

// Wrap production pattern in delimiters if set
$prodPattern = env('CORS_PATTERN');
$prodPatterns = $prodPattern ? ['#' . $prodPattern . '#'] : [];

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $useDevCors ? array_merge($devOrigins, $prodOrigins) : $prodOrigins,
    'allowed_origins_patterns' => $useDevCors
        ? array_merge($devPatterns, $prodPatterns, $extensionPatterns)
        : array_merge($prodPatterns, $extensionPatterns),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
