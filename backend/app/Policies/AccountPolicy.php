<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Account;

class AccountPolicy
{
    public function before(User $auth, string $ability): ?bool
    {
        // In database-per-tenant architecture, if user exists, they're in the correct tenant
        // No need to check tenant_id since it doesn't exist
        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $auth): bool
    {
        // In database-per-tenant, if user exists, they can view accounts in their tenant
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $auth, Account $model): bool
    {
        // In database-per-tenant, if both exist in the same database, they're in the same tenant
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $auth): bool
    {
        // Owners, admins, and recruiters can create accounts
        return in_array($auth->role, ['owner', 'admin', 'recruiter']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $auth, Account $model): bool
    {
        // In database-per-tenant, if both exist in the same database, they're in the same tenant
        return in_array($auth->role, ['owner', 'admin', 'recruiter']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $auth, Account $model): bool
    {
        // In database-per-tenant, if both exist in the same database, they're in the same tenant
        // Owners, admins, and recruiters can delete accounts
        return in_array($auth->role, ['owner', 'admin', 'recruiter']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Account $model): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Account $model): bool
    {
        return false;
    }
}
