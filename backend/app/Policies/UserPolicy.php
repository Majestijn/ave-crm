<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    public function before(User $auth, string $ability): ?bool
    {
        // CRITICAL SECURITY: Always verify user has tenant_id
        if (empty($auth->tenant_id)) {
            return false;
        }
        
        // Owners have full access, admins have access except for deleting owners
        if ($auth->role === 'owner') {
            return true;
        }
        return null; // Let individual methods handle admin permissions
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $auth): bool
    {
        // Security: user must have tenant_id
        return !empty($auth->tenant_id);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $auth, User $model): bool
    {
        // CRITICAL: Always verify tenant_id matches
        if (empty($auth->tenant_id) || empty($model->tenant_id)) {
            return false;
        }
        return $auth->tenant_id === $model->tenant_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $auth): bool
    {
        // Security: user must have tenant_id
        if (empty($auth->tenant_id)) {
            return false;
        }
        return in_array($auth->role, ['owner', 'admin']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $auth, User $model): bool
    {
        // CRITICAL: Always verify tenant_id matches
        if (empty($auth->tenant_id) || empty($model->tenant_id)) {
            return false;
        }
        return $auth->tenant_id === $model->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $auth, User $model): bool
    {
        // Can't delete yourself
        if ($auth->id === $model->id) {
            return false;
        }
        
        // Must be in same tenant
        if ($auth->tenant_id !== $model->tenant_id) {
            return false;
        }
        
        // Admins cannot delete owners
        if ($auth->role === 'admin' && $model->role === 'owner') {
            return false;
        }
        
        // Owners and admins can delete other users (except owners for admins)
        return in_array($auth->role, ['owner', 'admin']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        return false;
    }
}
