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
        $activities = $account->activities()
            ->with(['contact:id,uid,first_name,last_name', 'assignment:id,title'])
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
            'contact_uid' => 'nullable|exists:contacts,uid',
            'assignment_id' => 'nullable|exists:assignments,id',
        ]);

        $data = [
            'type' => $validated['type'],
            'description' => $validated['description'],
            'date' => $validated['date'],
            'assignment_id' => $validated['assignment_id'] ?? null,
        ];

        // Resolve contact_uid to contact_id
        if (!empty($validated['contact_uid'])) {
            $contact = \App\Models\Contact::where('uid', $validated['contact_uid'])->first();
            if ($contact) {
                $data['contact_id'] = $contact->id;
            }
        }

        $activity = $account->activities()->create($data);

        return response()->json($activity->load(['contact', 'assignment']), 201);
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
