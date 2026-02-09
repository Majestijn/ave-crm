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
        
        // If activity type is "hired" and has an assignment_id, automatically update assignment status to "shadow_management"
        if ($validated['type'] === 'hired' && !empty($data['assignment_id'])) {
            $assignment = \App\Models\Assignment::find($data['assignment_id']);
            if ($assignment) {
                $assignment->status = 'shadow_management';
                $assignment->save();
            }
        }
        
        return response()->json($activity->load(['contact', 'assignment']), 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AccountActivity $accountActivity)
    {
        $validated = $request->validate([
            'type' => 'sometimes|required|string',
            'description' => 'sometimes|required|string',
            'date' => 'sometimes|required|date',
            'contact_uid' => 'nullable|exists:contacts,uid',
        ]);

        $data = [];

        if (isset($validated['type'])) {
            $data['type'] = $validated['type'];
        }
        if (isset($validated['description'])) {
            $data['description'] = $validated['description'];
        }
        if (isset($validated['date'])) {
            $data['date'] = $validated['date'];
        }

        // Resolve contact_uid to contact_id if provided
        if (array_key_exists('contact_uid', $validated)) {
            if (!empty($validated['contact_uid'])) {
                $contact = \App\Models\Contact::where('uid', $validated['contact_uid'])->first();
                $data['contact_id'] = $contact ? $contact->id : null;
            } else {
                $data['contact_id'] = null;
            }
        }

        $accountActivity->update($data);
        
        // If activity type is updated to "hired" and has an assignment_id, automatically update assignment status to "shadow_management"
        if (isset($validated['type']) && $validated['type'] === 'hired' && $accountActivity->assignment_id) {
            $assignment = $accountActivity->assignment;
            if ($assignment) {
                $assignment->status = 'shadow_management';
                $assignment->save();
            }
        }
        
        return response()->json($accountActivity->load(['contact', 'assignment']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AccountActivity $accountActivity)
    {
        $accountActivity->delete();

        return response()->noContent();
    }
}
