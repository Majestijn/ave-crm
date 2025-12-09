<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    public function before(User $auth, string $ability): ?bool
    {
        // In database-per-tenant architecture, if user exists, they're in the correct tenant
        // No need to check tenant_id since it doesn't exist
        if ($auth->role === 'owner') {
            return true;
        }
        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $auth): bool
    {
        // In database-per-tenant, if user exists, they can view users in their tenant
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $auth, User $model): bool
    {
        // In database-per-tenant, if both users exist in the same database, they're in the same tenant
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $auth): bool
    {
        // Only owners and admins can create users
        return in_array($auth->role, ['owner', 'admin']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $auth, User $model): bool
    {
        // In database-per-tenant, if both users exist, they're in the same tenant
        // Users can update themselves, admins/owners can update others
        return $auth->id === $model->id || in_array($auth->role, ['owner', 'admin']);
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
        
        // Admins cannot delete owners
        if ($auth->role === 'admin' && $model->role === 'owner') {
            return false;
        }
        
        // Only owners and admins can delete users
        // In database-per-tenant, if both users exist, they're in the same tenant
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
