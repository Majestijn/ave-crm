<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Contact;
use App\Services\LinkedInProfileParsingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LinkedInImportController extends Controller
{
    public function __construct(
        protected LinkedInProfileParsingService $parser
    ) {}

    /**
     * Import a LinkedIn profile as a contact and link to an assignment.
     *
     * Request body:
     * - profile_text: string (required) - plain text extracted from LinkedIn profile
     * - linkedin_url: string (optional) - URL of the LinkedIn profile
     * - assignment_uid: string (required) - UID of the assignment to link to
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'profile_text' => ['required', 'string', 'min:50', 'max:50000'],
            'linkedin_url' => ['nullable', 'url', 'max:500'],
            'assignment_uid' => ['required', 'string'],
        ]);

        $user = $request->user();
        if (!$user->can('create', Contact::class)) {
            abort(403, 'Geen rechten om contacten aan te maken.');
        }

        $assignment = Assignment::where('uid', $validated['assignment_uid'])->first();

        if (!$assignment) {
            return response()->json([
                'message' => 'Opdracht niet gevonden',
            ], 404);
        }

        $result = $this->parser->parseProfile($validated['profile_text']);

        if (!$result['success']) {
            return response()->json([
                'message' => $result['error'] ?? 'Parsen mislukt',
            ], 422);
        }

        $data = $result['data'];

        // Map parsed data to Contact model
        $contactData = [
            'first_name' => $data['first_name'] ?? '',
            'prefix' => $data['prefix'] ?? null,
            'last_name' => $data['last_name'] ?? '',
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'location' => $data['location'] ?? null,
            'education' => $data['education'] ?? null,
            'current_company' => $data['current_company'] ?? null,
            'company_role' => $data['company_role'] ?? null,
            'linkedin_url' => $validated['linkedin_url'] ?? null,
            'notes' => $data['notes'] ?? null,
            'network_roles' => ['candidate'],
        ];

        $contact = Contact::create($contactData);

        // Link to assignment with default status 'called'
        $assignment->candidates()->attach($contact->id, ['status' => 'called']);

        return response()->json([
            'message' => 'Contact aangemaakt en gekoppeld aan opdracht',
            'contact' => $contact,
            'assignment' => [
                'uid' => $assignment->uid,
                'title' => $assignment->title,
            ],
        ], 201);
    }
}
