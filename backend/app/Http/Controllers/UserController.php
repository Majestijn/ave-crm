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
    public function __construct()
    {
        $this->authorizeResource(\App\Models\User::class, 'user');
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $auth = $request->user();
        
        // Double-check tenant_id matches (security check)
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }

        // User model doesn't use global scope, so we can query directly
        // We need to exclude the current user
        $query = User::where('tenant_id', $auth->tenant_id)
            ->where('id', '!=', $auth->id)
            ->orderBy('name');

        $users = $query->paginate(perPage: (int) $request->query('per_page', 15));

        return UserResource::collection($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request, User $user)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        $data = $request->validated();

        // Explicitly set tenant_id
        $user = User::create([
            'tenant_id' => $auth->tenant_id,
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
    public function show(Request $request, string $id)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        // Find user and verify tenant_id matches
        $user = User::where('uid', $id)
            ->where('tenant_id', $auth->tenant_id)
            ->firstOrFail();
        
        // Authorization is handled by the policy via authorizeResource
        $this->authorize('view', $user);
        
        return new UserResource($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        // CRITICAL: Verify tenant_id matches before any operation
        if ($user->tenant_id !== $auth->tenant_id) {
            abort(403, 'Cannot access user from different tenant');
        }
        
        if ($request->filled('role') && $user->id === $auth->id) {
            return response()->json([
                'message' => 'Je kunt je eigen rol niet wijzigen'
            ], 422);
        }

        $data = $request->validated();

        // Prevent tenant_id and uid from being changed
        unset($data['tenant_id'], $data['uid']);

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
    public function destroy(Request $request, string $id)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        // Find the user, then verify tenant_id manually
        $user = User::where('uid', $id)->firstOrFail();
        
        // CRITICAL: Verify tenant_id matches before any operation
        if ($user->tenant_id !== $auth->tenant_id) {
            abort(403, 'Cannot access user from different tenant');
        }
        
        // Authorization is handled by the policy via authorizeResource
        $this->authorize('delete', $user);
        
        $user->delete();
        
        return response()->json(['message' => 'Gebruiker succesvol verwijderd'], 200);
    }
}
