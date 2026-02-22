<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    // Note: Authorization is handled by:
    // 1. Route middleware: 'can:manage-users' for create/update/delete
    // 2. FormRequest authorize() methods for additional checks
    // We don't use authorizeResource here because it conflicts with FormRequest authorization
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $auth = $request->user();

        // We are already in the tenant context, so we just query the users table
        $query = User::query()->orderBy('name');

        // By default exclude current user (e.g. for user management); use ?all=1 for dropdowns
        if (!$request->boolean('all')) {
            $query->where('id', '!=', $auth->id);
        }

        $users = $query->paginate(perPage: (int) $request->query('per_page', 15));

        return UserResource::collection($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => $data['password'] ?? str()->password(12),
        ]);

        return response()->json($user, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, User $user)
    {
        // Authorization is handled by the policy via authorizeResource
        // The User model binding automatically finds the user in the current tenant DB

        return new UserResource($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $auth = $request->user();

        if ($request->filled('role') && $user->id === $auth->id) {
            return response()->json([
                'message' => 'Je kunt je eigen rol niet wijzigen'
            ], 422);
        }

        $data = $request->validated();

        // Prevent uid from being changed
        unset($data['uid']);

        if (array_key_exists('password', $data) && blank($data['password'])) {
            unset($data['password']);
        }

        if (array_key_exists('email', $data) && $data['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        $user->fill($data)->save();

        return response()->json([
            'uid' => $user->uid,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, User $user)
    {
        // Authorization is handled by the policy via authorizeResource

        $user->delete();

        return response()->json(['message' => 'Gebruiker succesvol verwijderd'], 200);
    }
}
