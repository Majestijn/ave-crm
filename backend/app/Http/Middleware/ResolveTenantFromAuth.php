<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Log;

class ResolveTenantFromAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user) {
            Log::warning('ResolveTenantFromAuth: No authenticated user found');
            abort(401, 'Unauthenticated');
        }
        
        if (empty($user->tenant_id)) {
            Log::error('ResolveTenantFromAuth: User has no tenant_id', [
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);
            abort(403, 'User is not associated with a tenant');
        }
        
        $tenantContext = app(TenantContext::class);
        $tenantContext->id = $user->tenant_id;
        
        Log::debug('ResolveTenantFromAuth: Tenant context set', [
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
        ]);
        
        return $next($request);
    }
}
