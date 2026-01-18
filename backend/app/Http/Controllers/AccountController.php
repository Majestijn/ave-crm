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

        if (!$auth->can('viewAny', Account::class)) {
            abort(403, 'This action is unauthorized.');
        }

        $accounts = Account::query()
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

        // Authorization check
        if (!$auth->can('create', Account::class)) {
            abort(403, 'This action is unauthorized.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'fte_count' => ['nullable', 'integer', 'min:0'],
            'revenue_cents' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $account = Account::create($data);

        return response()->json($account, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $account)
    {
        $auth = $request->user();

        // Find account by uid (route parameter name is 'account' but contains the uid value)
        $accountModel = Account::where('uid', $account)
            ->with(['contacts.contact', 'assignments'])
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

        // Find account by uid (database-per-tenant ensures isolation)
        $accountModel = Account::where('uid', $account)->firstOrFail();

        // Authorization check
        if (!$auth->can('update', $accountModel)) {
            abort(403, 'This action is unauthorized.');
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'fte_count' => ['nullable', 'integer', 'min:0'],
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

        // Find account by uid (database-per-tenant ensures isolation)
        $accountModel = Account::where('uid', $account)->firstOrFail();

        // Authorization check
        if (!$auth->can('delete', $accountModel)) {
            abort(403, 'This action is unauthorized.');
        }

        // Soft delete
        $accountModel->delete();

        return response()->json(['message' => 'Account succesvol verwijderd'], 200);
    }
}
