<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Contact;
use App\Services\LinkedInProfileParsingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LinkedInImportController extends Controller
{
    public function __construct(
        protected LinkedInProfileParsingService $parser
    ) {}

    /**
     * Import a LinkedIn profile as a contact; optionally link to an assignment.
     *
     * Request body:
     * - profile_text: string (required) — plain text from LinkedIn (e.g. Ctrl+A, Ctrl+C)
     * - linkedin_url: string (optional) — profile URL if known
     * - assignment_uid: string (optional) — when set, attach new contact to this assignment
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'profile_text' => ['required', 'string', 'min:30', 'max:50000'],
            'linkedin_url' => ['nullable', 'string', 'url', 'max:255'],
            'assignment_uid' => ['nullable', 'string', 'max:26'],
        ]);

        $user = $request->user();
        if (!$user->can('create', Contact::class)) {
            abort(403, 'Geen rechten om contacten aan te maken.');
        }

        $assignmentUid = isset($validated['assignment_uid']) ? trim((string) $validated['assignment_uid']) : '';
        $assignment = null;
        if ($assignmentUid !== '') {
            $assignment = Assignment::where('uid', $assignmentUid)->first();
            if (!$assignment) {
                return response()->json([
                    'message' => 'Opdracht niet gevonden',
                ], 404);
            }
            if (in_array($assignment->status, ['completed', 'cancelled'], true)) {
                return response()->json([
                    'message' => 'Deze opdracht is afgerond of geannuleerd; kies een andere opdracht of laat leeg.',
                ], 422);
            }
        }

        $result = $this->parser->parseProfile($validated['profile_text']);

        if (!$result['success']) {
            return response()->json([
                'message' => $result['error'] ?? 'Parsen mislukt',
            ], 422);
        }

        $data = $result['data'];

        $duplicate = $this->findDuplicateContact($data);
        if ($duplicate) {
            return response()->json([
                'message' => 'Er bestaat al een contact met deze naam.',
                'duplicate_contact' => [
                    'uid' => $duplicate->uid,
                    'name' => $duplicate->name,
                ],
            ], 409);
        }

        $linkedinUrl = $this->resolveLinkedinUrl($validated['linkedin_url'] ?? null, $validated['profile_text']);

        $notes = $data['notes'] ?? null;
        if (!empty($data['skills']) && is_string($data['skills'])) {
            $skillsBlock = "\n\nVaardigheden (LinkedIn): " . trim($data['skills']);
            $notes = $notes !== null && $notes !== '' ? trim($notes) . $skillsBlock : ltrim($skillsBlock);
        }

        $contactData = [
            'first_name' => $data['first_name'] ?? '',
            'prefix' => !empty($data['prefix']) ? trim((string) $data['prefix']) : null,
            'last_name' => $data['last_name'] ?? '',
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'location' => $data['location'] ?? null,
            'education' => $data['education'] ?? null,
            'current_company' => $data['current_company'] ?? null,
            'company_role' => $data['company_role'] ?? null,
            'linkedin_url' => $linkedinUrl,
            'notes' => $notes,
            'network_roles' => ['candidate'],
        ];

        $workExperiences = $this->sanitizeWorkExperiences($data['work_experiences'] ?? []);

        $contact = DB::transaction(function () use ($contactData, $workExperiences, $assignment) {
            $contact = Contact::create($contactData);

            foreach ($workExperiences as $idx => $we) {
                $contact->workExperiences()->create([
                    'job_title' => $we['job_title'],
                    'company_name' => $we['company_name'],
                    'start_date' => $we['start_date'],
                    'end_date' => $we['end_date'] ?? null,
                    'location' => $we['location'] ?? null,
                    'description' => $we['description'] ?? null,
                    'sort_order' => $idx,
                ]);
            }

            if (!empty($workExperiences)) {
                $contact->syncCurrentRoleFromWorkExperiences();
            }

            if ($assignment) {
                $assignment->candidates()->syncWithoutDetaching([
                    $contact->id => ['status' => 'called'],
                ]);
            }

            return $contact->fresh(['workExperiences']);
        });

        $message = $assignment
            ? 'Contact aangemaakt en gekoppeld aan opdracht'
            : 'Contact aangemaakt';

        return response()->json([
            'message' => $message,
            'contact' => $contact,
            'assignment' => $assignment ? [
                'uid' => $assignment->uid,
                'title' => $assignment->title,
            ] : null,
        ], 201);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function findDuplicateContact(array $data): ?Contact
    {
        $first = mb_strtolower(trim((string) ($data['first_name'] ?? '')));
        $last = mb_strtolower(trim((string) ($data['last_name'] ?? '')));
        if ($first === '' || $last === '') {
            return null;
        }

        $prefixRaw = isset($data['prefix']) ? trim((string) $data['prefix']) : '';
        $prefixNorm = $prefixRaw !== '' ? mb_strtolower($prefixRaw) : '';

        $query = Contact::query()
            ->whereRaw('LOWER(TRIM(first_name)) = ?', [$first])
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [$last]);

        if ($prefixNorm !== '') {
            $query->whereRaw('LOWER(TRIM(COALESCE(prefix, \'\'))) = ?', [$prefixNorm]);
        } else {
            $query->where(function ($q) {
                $q->whereNull('prefix')->orWhereRaw("TRIM(COALESCE(prefix, '')) = ''");
            });
        }

        return $query->first();
    }

    private function resolveLinkedinUrl(?string $fromRequest, string $profileText): ?string
    {
        $url = $fromRequest ? trim($fromRequest) : null;
        if ($url) {
            return Str::limit($url, 255, '');
        }

        $extracted = $this->extractLinkedInUrlFromText($profileText);

        return $extracted ? Str::limit($extracted, 255, '') : null;
    }

    private function extractLinkedInUrlFromText(string $text): ?string
    {
        if (!preg_match('#https?://(?:[\w.-]+\.)?linkedin\.com/in/[^\s"\'<>]+#i', $text, $m)) {
            return null;
        }
        $url = $m[0];
        $qPos = strpos($url, '?');
        if ($qPos !== false) {
            $url = substr($url, 0, $qPos);
        }

        return $url;
    }

    /**
     * @param  mixed  $raw
     * @return array<int, array{job_title: string, company_name: string, start_date: string, end_date: ?string, location: ?string, description: ?string}>
     */
    private function sanitizeWorkExperiences(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }

        $out = [];
        foreach ($raw as $we) {
            if (!is_array($we)) {
                continue;
            }
            $title = isset($we['job_title']) ? trim((string) $we['job_title']) : '';
            $company = isset($we['company_name']) ? trim((string) $we['company_name']) : '';
            if ($title === '' || $company === '') {
                continue;
            }
            $start = $this->normalizeDateString($we['start_date'] ?? null);
            if ($start === null) {
                continue;
            }
            $end = $this->normalizeDateString($we['end_date'] ?? null);
            $out[] = [
                'job_title' => Str::limit($title, 255, ''),
                'company_name' => Str::limit($company, 255, ''),
                'start_date' => $start,
                'end_date' => $end,
                'location' => isset($we['location']) ? Str::limit(trim((string) $we['location']), 255, '') : null,
                'description' => isset($we['description']) ? (trim((string) $we['description']) ?: null) : null,
            ];
        }

        return $out;
    }

    private function normalizeDateString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_string($value) && strtolower(trim($value)) === 'null') {
            return null;
        }
        $str = trim((string) $value);
        try {
            $dt = new \DateTimeImmutable($str);

            return $dt->format('Y-m-d');
        } catch (\Exception) {
            return null;
        }
    }
}
