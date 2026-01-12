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

// Development origins (localhost with any port)
$devOrigins = [
    'http://localhost:5173',   // Vite dev server
    'http://localhost:8080',   // Backend/nginx
    'http://localhost:3000',   // Alternative frontend port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
];

// Patterns need regex delimiters (#...#)
$devPatterns = [
    '#https?://localhost(:\d+)?#',
    '#https?://127\.0\.0\.1(:\d+)?#',
    '#https?://[a-z0-9-]+\.localhost(:\d+)?#',
    '#https?://[a-z0-9-]+\.lvh\.me(:\d+)?#',
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
    'allowed_origins' => $isProduction ? $prodOrigins : array_merge($devOrigins, $prodOrigins),
    'allowed_origins_patterns' => $isProduction ? $prodPatterns : array_merge($devPatterns, $prodPatterns),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
