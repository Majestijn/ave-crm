<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    use UsesTenantConnection;
}
