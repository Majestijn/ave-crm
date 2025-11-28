<?php

namespace App\Http\Controllers;

use App\Models\AccountActivity;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AccountActivityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, Account $account)
    {
        // Ensure account belongs to tenant (handled by auth.tenant middleware and global scope usually, 
        // but binding resolution might need explicit check if not using scoped bindings)

        $activities = $account->activities()
            ->with(['candidate:id,uid,first_name,last_name', 'assignment:id,title'])
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($activities);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, Account $account)
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'description' => 'required|string',
            'date' => 'required|date',
            'candidate_id' => 'nullable|exists:candidates,id',
            'assignment_id' => 'nullable|exists:assignments,id',
        ]);

        $activity = $account->activities()->create([
            ...$validated,
            'tenant_id' => $request->user()->tenant_id,
        ]);

        return response()->json($activity->load(['candidate', 'assignment']), 201);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AccountActivity $accountActivity)
    {
        // Authorization check needed? Assuming tenant scope handles visibility.
        $accountActivity->delete();

        return response()->noContent();
    }
}
