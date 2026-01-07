<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AssignmentCandidateController extends Controller
{
    /**
     * Display a listing of candidates for the assignment.
     */
    public function index(string $assignmentUid): JsonResponse
    {
        $assignment = Assignment::where('uid', $assignmentUid)->firstOrFail();
        
        $candidates = $assignment->candidates()
            ->get()
            ->map(function ($contact) {
                return [
                    'id' => $contact->pivot->id ?? $contact->id, // Use pivot ID if needed or just contact ID
                    'contact' => $contact, // The contact resource
                    'status' => $contact->pivot->status,
                    'status_label' => $this->getStatusLabel($contact->pivot->status),
                ];
            });

        return response()->json($candidates);
    }

    /**
     * Store a newly created resource in storage.
     * Attach candidates to assignment.
     */
    public function store(Request $request, string $assignmentUid): JsonResponse
    {
        $assignment = Assignment::where('uid', $assignmentUid)->firstOrFail();

        $validated = $request->validate([
            'contact_uids' => 'required|array',
            'contact_uids.*' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    // Use Contact model directly to ensure tenant connection is used
                    $exists = Contact::where('uid', $value)->exists();
                    if (!$exists) {
                        $fail('The selected contact does not exist.');
                    }
                },
            ],
        ]);

        $contactIds = Contact::whereIn('uid', $validated['contact_uids'])->pluck('id');

        // Attach with default status 'called' if not present
        $syncData = [];
        foreach ($contactIds as $id) {
            $syncData[$id] = ['status' => 'called'];
        }

        $assignment->candidates()->syncWithoutDetaching($syncData);

        return $this->index($assignmentUid);
    }

    /**
     * Update the specified resource in storage.
     * Update status of a candidate for this assignment.
     */
    public function update(Request $request, string $assignmentUid, string $contactUid): JsonResponse
    {
        $assignment = Assignment::where('uid', $assignmentUid)->firstOrFail();
        $contact = Contact::where('uid', $contactUid)->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|string|in:called,proposed,first_interview,second_interview,hired,rejected',
        ]);

        $assignment->candidates()->updateExistingPivot($contact->id, [
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'Status updated',
            'status' => $validated['status'],
            'status_label' => $this->getStatusLabel($validated['status']),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     * Detach candidate from assignment.
     */
    public function destroy(string $assignmentUid, string $contactUid): JsonResponse
    {
        $assignment = Assignment::where('uid', $assignmentUid)->firstOrFail();
        $contact = Contact::where('uid', $contactUid)->firstOrFail();

        $assignment->candidates()->detach($contact->id);

        return response()->json(['message' => 'Candidate removed from assignment']);
    }

    private function getStatusLabel(string $status): string
    {
        $labels = [
            'called' => 'Gebeld',
            'proposed' => 'Voorgesteld',
            'first_interview' => '1e gesprek',
            'second_interview' => '2e gesprek',
            'hired' => 'Aangenomen',
            'rejected' => 'Afgewezen',
        ];

        return $labels[$status] ?? $status;
    }
}
