<?php

namespace App\Policies;

use App\Models\Assignment;
use App\Models\User;

class AssignmentPolicy
{
    /**
     * Rollen die opdrachten mogen beheren (aanmaken/bewerken/verwijderen).
     * Een `viewer` heeft alleen leesrechten.
     *
     * @var array<int, string>
     */
    private const WRITERS = ['owner', 'admin', 'management', 'recruiter'];

    public function viewAny(User $auth): bool
    {
        return true;
    }

    public function view(User $auth, Assignment $model): bool
    {
        return true;
    }

    public function create(User $auth): bool
    {
        return in_array($auth->role, self::WRITERS, true);
    }

    public function update(User $auth, Assignment $model): bool
    {
        return in_array($auth->role, self::WRITERS, true);
    }

    public function delete(User $auth, Assignment $model): bool
    {
        return in_array($auth->role, self::WRITERS, true);
    }

    public function restore(User $auth, Assignment $model): bool
    {
        return false;
    }

    public function forceDelete(User $auth, Assignment $model): bool
    {
        return false;
    }
}
