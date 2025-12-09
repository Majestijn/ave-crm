<?php

namespace App\Tasks;

use Spatie\Multitenancy\Models\Tenant;
use Spatie\Multitenancy\Tasks\SwitchTenantTask;
use Spatie\Multitenancy\Contracts\IsTenant;

class SwitchTenantCacheTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void
    {
        $this->setCachePrefix("tenant_{$tenant->getKey()}_");
    }

    public function forgetCurrent(): void
    {
        $this->setCachePrefix('laravel_cache_');
    }

    protected function setCachePrefix(string $prefix): void
    {
        config(['cache.prefix' => $prefix]);
        app('cache')->forgetDriver(config('cache.default'));
    }
}
