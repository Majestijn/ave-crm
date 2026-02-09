<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Contact;

class ContactPolicy
{
    public function before(User $auth, string $ability): ?bool
    {
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
        return in_array($auth->role, ['owner', 'admin', 'management', 'recruiter']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $auth, Contact $model): bool
    {
        return in_array($auth->role, ['owner', 'admin', 'management', 'recruiter']);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $auth): bool
    {
        return in_array($auth->role, ['owner', 'admin', 'management', 'recruiter']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $auth, Contact $model): bool
    {
        return in_array($auth->role, ['owner', 'admin', 'management', 'recruiter']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $auth, Contact $model): bool
    {
        return in_array($auth->role, ['owner', 'admin', 'management', 'recruiter']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $auth, Contact $model): bool
    {
        return in_array($auth->role, ['owner', 'admin', 'management']);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $auth, Contact $model): bool
    {
        return in_array($auth->role, ['owner', 'admin', 'management']);
    }
}
