<?php

namespace App\Http\Controllers;

use App\Models\AccountActivity;
use App\Models\Assignment;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AssignmentActivityController extends Controller
{
    /**
     * Display activities for a specific assignment.
     */
    public function index(string $assignmentUid): JsonResponse
    {
        $assignment = Assignment::where('uid', $assignmentUid)->firstOrFail();

        $activities = AccountActivity::where('assignment_id', $assignment->id)
            ->with(['contact:id,uid,first_name,last_name', 'user:id,name'])
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'type' => $activity->type,
                    'description' => $activity->description,
                    'date' => $activity->date,
                    'contact' => $activity->contact ? [
                        'uid' => $activity->contact->uid,
                        'first_name' => $activity->contact->first_name,
                        'last_name' => $activity->contact->last_name,
                    ] : null,
                    'created_by' => $activity->user ? $activity->user->name : null,
                    'created_at' => $activity->created_at,
                ];
            });

        return response()->json($activities);
    }

    /**
     * Store a new activity for an assignment.
     */
    public function store(Request $request, string $assignmentUid): JsonResponse
    {
        $assignment = Assignment::where('uid', $assignmentUid)->firstOrFail();

        $validated = $request->validate([
            'type' => 'required|string',
            'description' => 'required|string',
            'date' => 'required|date',
            'contact_uid' => 'nullable|string',
        ]);

        $data = [
            'account_id' => $assignment->account_id, // Keep account reference for backwards compatibility
            'assignment_id' => $assignment->id,
            'user_id' => $request->user()->id, // Store who created the activity
            'type' => $validated['type'],
            'description' => $validated['description'],
            'date' => $validated['date'],
        ];

        // Resolve contact_uid to contact_id
        if (!empty($validated['contact_uid'])) {
            $contact = Contact::where('uid', $validated['contact_uid'])->first();
            if ($contact) {
                $data['contact_id'] = $contact->id;
            }
        }

        $activity = AccountActivity::create($data);
        $activity->load(['contact:id,uid,first_name,last_name', 'user:id,name']);

        return response()->json([
            'id' => $activity->id,
            'type' => $activity->type,
            'description' => $activity->description,
            'date' => $activity->date,
            'contact' => $activity->contact ? [
                'uid' => $activity->contact->uid,
                'first_name' => $activity->contact->first_name,
                'last_name' => $activity->contact->last_name,
            ] : null,
            'created_by' => $activity->user ? $activity->user->name : null,
            'created_at' => $activity->created_at,
        ], 201);
    }

    /**
     * Delete an activity.
     */
    public function destroy(int $activityId): JsonResponse
    {
        $activity = AccountActivity::findOrFail($activityId);
        $activity->delete();

        return response()->json(['message' => 'Activiteit verwijderd']);
    }
}

