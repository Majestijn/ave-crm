<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins
    |--------------------------------------------------------------------------
    |
    | Production: Set CORS_ALLOWED_ORIGIN in .env to your domain
    | Example: CORS_ALLOWED_ORIGIN=https://ave-crm.nl
    |
    | Development: Falls back to allowing localhost patterns
    |
    */
    'allowed_origins' => array_filter([
        env('CORS_ALLOWED_ORIGIN'),  // Production: set in .env
    ]),

    'allowed_origins_patterns' => env('APP_ENV') === 'production'
        ? [env('CORS_PATTERN', 'https?://.*\.ave-crm\.nl')]  // Production: only your domain
        : ['https?://.*\.lvh\.me', 'https?://.*\.localhost', 'https?://localhost'],  // Development

    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
