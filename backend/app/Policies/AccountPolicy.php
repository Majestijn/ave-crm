<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Account;

class AccountPolicy
{
    public function before(User $auth, string $ability): ?bool
    {
        if (empty($auth->tenant_id)) {
            return false;
        }

        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $auth): bool
    {
        return !empty($auth->tenant_id);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $auth, Account $model): bool
    {
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
        if (empty($auth->tenant_id)) {
            return false;
        }
        return in_array($auth->role, ['owner', 'admin', 'recruiter']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $auth, Account $model): bool
    {
        if (empty($auth->tenant_id) || empty($model->tenant_id)) {
            return false;
        }
        return $auth->tenant_id === $model->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $auth, Account $model): bool
    {
        if (empty($auth->tenant_id) || empty($model->tenant_id)) {
            return false;
        }

        if ($auth->tenant_id !== $model->tenant_id) {
            return false;
        }

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

