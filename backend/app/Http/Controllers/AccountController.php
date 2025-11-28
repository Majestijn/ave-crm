<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $auth = $request->user();

        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }

        // Authorization check
        if (!$auth->can('viewAny', Account::class)) {
            abort(403, 'This action is unauthorized.');
        }

        $accounts = Account::where('tenant_id', $auth->tenant_id)
            ->withCount('assignments')
            ->orderBy('name')
            ->get()
            ->toArray();

        return response()->json($accounts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $auth = $request->user();

        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }

        // Authorization check
        if (!$auth->can('create', Account::class)) {
            abort(403, 'This action is unauthorized.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'revenue_cents' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $account = Account::create([
            'tenant_id' => $auth->tenant_id,
            ...$data,
        ]);

        return response()->json($account, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $account)
    {
        $auth = $request->user();

        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }

        // Find account by uid (route parameter name is 'account' but contains the uid value)
        $accountModel = Account::where('uid', $account)
            ->where('tenant_id', $auth->tenant_id)
            ->with(['contacts', 'assignments'])
            ->firstOrFail();

        // Authorization check
        if (!$auth->can('view', $accountModel)) {
            abort(403, 'This action is unauthorized.');
        }

        return response()->json($accountModel);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $account)
    {
        $auth = $request->user();

        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }

        // Find account by uid
        $accountModel = Account::where('uid', $account)
            ->where('tenant_id', $auth->tenant_id)
            ->firstOrFail();

        // Authorization check
        if (!$auth->can('update', $accountModel)) {
            abort(403, 'This action is unauthorized.');
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'revenue_cents' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        unset($data['tenant_id'], $data['uid']);

        $accountModel->fill($data)->save();

        return response()->json($accountModel);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $account)
    {
        $auth = $request->user();

        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }

        // Find account by uid
        $accountModel = Account::where('uid', $account)
            ->where('tenant_id', $auth->tenant_id)
            ->firstOrFail();

        // Authorization check
        if (!$auth->can('delete', $accountModel)) {
            abort(403, 'This action is unauthorized.');
        }

        // Soft delete
        $accountModel->delete();

        return response()->json(['message' => 'Account succesvol verwijderd'], 200);
    }
}

