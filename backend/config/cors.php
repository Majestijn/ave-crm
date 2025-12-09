<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => ['*.lvh.me', '*.localhost', 'localhost'],

    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true, // if you send cookies; ok with tokens too
];
