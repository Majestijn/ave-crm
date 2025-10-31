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
        Log::info("LALALA");
        $auth = $request->user();

        Log::info(json_encode($auth));

        $query = User::forTenant($auth->tenant_id)->except($auth)->orderBy('name');

        Log::info(json_encode($query));

        $users = $query->paginate(perPage: (int) $request->query('per_page', 15));

        Log::info(json_encode($users));

        return UserResource::collection($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request, User $user)
    {
        $auth = $request->user();
        $data = $request->validated();

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
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        if ($request->filled('role') && $user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Je kunt je eigen rol niet wijzigen'
            ], 422);
        }

        $data = $request->validated();

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
    public function destroy(string $id)
    {
        //
    }
}
