<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Account;
use App\Models\DropdownOption;
use App\Models\User;
use App\Services\CvParsingService;
use App\Services\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Spatie\Multitenancy\Models\Tenant;

class AssignmentController extends Controller
{
    public function __construct(
        protected FileStorageService $fileService
    ) {}
    /**
     * Format assignment for JSON response.
     */
    private function formatAssignment(Assignment $assignment): array
    {
        // Generate signed URL for notes image if exists
        $notesImageUrl = null;
        if ($assignment->notes_image_path) {
            try {
                $notesImageUrl = $this->fileService->getSignedUrl($assignment->notes_image_path, 60);
            } catch (\Exception $e) {
                // If URL generation fails, return null
                $notesImageUrl = null;
            }
        }

        $roleProfileUrl = null;
        $roleProfileKind = null;
        $roleProfileDownloadUrl = null;
        if ($assignment->role_profile_path) {
            try {
                $roleProfileUrl = $this->fileService->getSignedUrl($assignment->role_profile_path, 120);
            } catch (\Exception $e) {
                $roleProfileUrl = null;
            }
            $roleProfileKind = $this->roleProfileKindFromPath($assignment->role_profile_path);
            $roleProfileDownloadUrl = url("/api/v1/assignments/{$assignment->uid}/role-profile/download");
        }

        return [
            'id' => $assignment->id,
            'uid' => $assignment->uid,
            'account_id' => $assignment->account_id,
            'recruiter_id' => $assignment->recruiter_id,
            'account' => $assignment->account ? [
                'uid' => $assignment->account->uid,
                'name' => $assignment->account->name,
            ] : null,
            'recruiter' => $assignment->recruiter ? [
                'uid' => $assignment->recruiter->uid,
                'name' => $assignment->recruiter->name,
            ] : null,
            'secondary_recruiters' => $assignment->secondaryRecruiters->map(fn($u) => [
                'uid' => $u->uid,
                'name' => $u->name,
            ])->values()->toArray(),
            'title' => $assignment->title,
            'description' => $assignment->description,
            'status' => $assignment->status,
            'salary_min' => $assignment->salary_min,
            'salary_max' => $assignment->salary_max,
            'vacation_days' => $assignment->vacation_days,
            'bonus_percentage' => $assignment->bonus_percentage,
            'total_fee' => $assignment->total_fee,
            'advance_fee' => $assignment->advance_fee,
            'location' => $assignment->location,
            'employment_type' => $assignment->employment_type,
            'hours_per_week_min' => $assignment->hours_per_week_min,
            'hours_per_week_max' => $assignment->hours_per_week_max,
            'benefits' => $assignment->benefits,
            'start_date' => $assignment->start_date?->format('Y-m-d'),
            'end_date' => $assignment->end_date?->format('Y-m-d'),
            'notes_image_url' => $notesImageUrl,
            'role_profile_url' => $roleProfileUrl,
            'role_profile_download_url' => $roleProfileDownloadUrl,
            'role_profile_original_filename' => $assignment->role_profile_original_filename,
            'role_profile_kind' => $roleProfileKind,
            'created_at' => $assignment->created_at,
            'updated_at' => $assignment->updated_at,
        ];
    }

    /**
     * Display a listing of assignments.
     */
    public function index(Request $request): JsonResponse
    {
        $assignments = Assignment::with(['account:id,uid,name', 'recruiter:id,uid,name', 'secondaryRecruiters:users.id,uid,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($assignment) => $this->formatAssignment($assignment));

        return response()->json($assignments);
    }

    /**
     * Store a newly created assignment.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_uid' => 'required|string',
            'recruiter_uid' => 'nullable|string',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|' . DropdownOption::validationRule('assignment_status'),
            'salary_min' => 'nullable|integer|min:0',
            'salary_max' => 'nullable|integer|min:0',
            'vacation_days' => 'nullable|integer|min:0|max:100',
            'bonus_percentage' => 'nullable|numeric|min:0|max:100',
            'total_fee' => 'nullable|integer|min:0',
            'advance_fee' => 'nullable|integer|min:0|lte:total_fee',
            'location' => 'nullable|string|max:255',
            'employment_type' => 'nullable|string|' . DropdownOption::validationRule('employment_type'),
            'hours_per_week_min' => 'nullable|integer|min:0|max:168',
            'hours_per_week_max' => 'nullable|integer|min:0|max:168|gte:hours_per_week_min',
            'benefits' => 'nullable|array',
            'benefits.*' => 'string|max:100|' . DropdownOption::validationRule('benefit'),
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'secondary_recruiter_uids' => 'nullable|array',
            'secondary_recruiter_uids.*' => 'string',
            'notes_image' => 'nullable|file|image|max:5120',
            'role_profile' => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:15360'],
        ]);

        // Find account by uid (manual check instead of exists rule for multi-tenant)
        $account = Account::where('uid', $validated['account_uid'])->first();
        
        if (!$account) {
            return response()->json([
                'message' => 'De geselecteerde klant bestaat niet.',
                'errors' => ['account_uid' => ['De geselecteerde klant bestaat niet.']]
            ], 422);
        }

        $recruiterId = null;
        if (!empty($validated['recruiter_uid'])) {
            $recruiter = User::where('uid', $validated['recruiter_uid'])->first();
            if ($recruiter) {
                $recruiterId = $recruiter->id;
            }
        }

        $description = $validated['description'] ?? null;
        if ($request->hasFile('role_profile')) {
            try {
                $summary = $this->summarizeRoleProfileFromUpload($request->file('role_profile'));
                if (!empty($summary)) {
                    $description = $this->appendRoleProfileSummary($description, $summary);
                }
            } catch (\Throwable $e) {
                Log::warning('Role profile summary skipped during assignment create', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $assignment = Assignment::create([
            'account_id' => $account->id,
            'recruiter_id' => $recruiterId,
            'title' => $validated['title'],
            'description' => $description,
            'status' => $validated['status'] ?? 'active',
            'salary_min' => $validated['salary_min'] ?? null,
            'salary_max' => $validated['salary_max'] ?? null,
            'vacation_days' => $validated['vacation_days'] ?? null,
            'bonus_percentage' => $validated['bonus_percentage'] ?? null,
            'total_fee' => $validated['total_fee'] ?? null,
            'advance_fee' => $validated['advance_fee'] ?? null,
            'location' => $validated['location'] ?? null,
            'employment_type' => $validated['employment_type'] ?? null,
            'hours_per_week_min' => $validated['hours_per_week_min'] ?? null,
            'hours_per_week_max' => $validated['hours_per_week_max'] ?? null,
            'benefits' => $validated['benefits'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
        ]);

        // Sync secondary recruiters
        if (!empty($validated['secondary_recruiter_uids'])) {
            $secondaryIds = User::whereIn('uid', $validated['secondary_recruiter_uids'])->pluck('id')->toArray();
            $assignment->secondaryRecruiters()->sync($secondaryIds);
        }

        // Handle notes image upload
        if ($request->hasFile('notes_image')) {
            $tenantId = Tenant::current()->id;
            $imagePath = $this->fileService->uploadAssignmentNotesImage(
                $tenantId,
                $assignment->uid,
                $request->file('notes_image')
            );
            $assignment->notes_image_path = $imagePath;
            $assignment->save();
        }

        if ($request->hasFile('role_profile')) {
            $tenantId = Tenant::current()->id;
            $uploaded = $this->fileService->uploadAssignmentRoleProfile(
                $tenantId,
                $assignment->uid,
                $request->file('role_profile')
            );
            $assignment->role_profile_path = $uploaded['path'];
            $assignment->role_profile_original_filename = $uploaded['original_filename'];
            $assignment->save();
        }

        // Load relationship for response
        $assignment->load(['account:id,uid,name', 'recruiter:id,uid,name', 'secondaryRecruiters:users.id,uid,name']);

        return response()->json($this->formatAssignment($assignment), 201);
    }

    /**
     * Display the specified assignment.
     */
    public function show(string $uid): JsonResponse
    {
        $assignment = Assignment::with(['account:id,uid,name', 'recruiter:id,uid,name', 'secondaryRecruiters:users.id,uid,name'])
            ->where('uid', $uid)
            ->firstOrFail();

        return response()->json($this->formatAssignment($assignment));
    }

    /**
     * Update the specified assignment.
     */
    public function update(Request $request, string $uid): JsonResponse
    {
        $assignment = Assignment::where('uid', $uid)->firstOrFail();

        $validated = $request->validate([
            'account_uid' => 'sometimes|string',
            'recruiter_uid' => 'nullable|string',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|' . DropdownOption::validationRule('assignment_status'),
            'salary_min' => 'nullable|integer|min:0',
            'salary_max' => 'nullable|integer|min:0',
            'vacation_days' => 'nullable|integer|min:0|max:100',
            'bonus_percentage' => 'nullable|numeric|min:0|max:100',
            'total_fee' => 'nullable|integer|min:0',
            'advance_fee' => 'nullable|integer|min:0|lte:total_fee',
            'location' => 'nullable|string|max:255',
            'employment_type' => 'nullable|string|' . DropdownOption::validationRule('employment_type'),
            'hours_per_week_min' => 'nullable|integer|min:0|max:168',
            'hours_per_week_max' => 'nullable|integer|min:0|max:168|gte:hours_per_week_min',
            'benefits' => 'nullable|array',
            'benefits.*' => 'string|max:100|' . DropdownOption::validationRule('benefit'),
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'secondary_recruiter_uids' => 'nullable|array',
            'secondary_recruiter_uids.*' => 'string',
            'notes_image' => 'nullable|file|image|max:5120', // max 5MB
        ]);

        // If account_uid is provided, find the account (manual check for multi-tenant)
        if (isset($validated['account_uid'])) {
            $account = Account::where('uid', $validated['account_uid'])->first();
            if (!$account) {
                return response()->json([
                    'message' => 'De geselecteerde klant bestaat niet.',
                    'errors' => ['account_uid' => ['De geselecteerde klant bestaat niet.']]
                ], 422);
            }
            $assignment->account_id = $account->id;
            unset($validated['account_uid']);
        }

        // If recruiter_uid is provided, resolve to user
        if (array_key_exists('recruiter_uid', $validated)) {
            if (empty($validated['recruiter_uid'])) {
                $assignment->recruiter_id = null;
            } else {
                $recruiter = User::where('uid', $validated['recruiter_uid'])->first();
                $assignment->recruiter_id = $recruiter?->id;
            }
            unset($validated['recruiter_uid']);
        }

        // Handle notes image upload
        if ($request->hasFile('notes_image')) {
            // Delete old image if exists
            if ($assignment->notes_image_path) {
                $this->fileService->delete($assignment->notes_image_path);
            }

            $tenantId = Tenant::current()->id;
            $imagePath = $this->fileService->uploadAssignmentNotesImage(
                $tenantId,
                $assignment->uid,
                $request->file('notes_image')
            );
            $validated['notes_image_path'] = $imagePath;
        }

        // Sync secondary recruiters
        if (array_key_exists('secondary_recruiter_uids', $validated)) {
            $secondaryIds = !empty($validated['secondary_recruiter_uids'])
                ? User::whereIn('uid', $validated['secondary_recruiter_uids'])->pluck('id')->toArray()
                : [];
            $assignment->secondaryRecruiters()->sync($secondaryIds);
            unset($validated['secondary_recruiter_uids']);
        }

        unset($validated['notes_image']);
        $assignment->fill($validated);
        $assignment->save();

        // Load relationship for response
        $assignment->load(['account:id,uid,name', 'recruiter:id,uid,name', 'secondaryRecruiters:users.id,uid,name']);

        return response()->json($this->formatAssignment($assignment));
    }

    /**
     * Delete the notes image for a specific assignment.
     */
    public function deleteNotesImage(string $assignment): JsonResponse
    {
        $assignmentModel = Assignment::where('uid', $assignment)->firstOrFail();

        if (!$assignmentModel->notes_image_path) {
            return response()->json(['message' => 'Geen notitie afbeelding gevonden'], 404);
        }

        $this->fileService->delete($assignmentModel->notes_image_path);
        $assignmentModel->notes_image_path = null;
        $assignmentModel->save();

        return response()->json(['message' => 'Notitie afbeelding succesvol verwijderd']);
    }

    /**
     * Upload or replace the rolprofiel document (PDF / Word).
     */
    public function uploadRoleProfile(Request $request, string $assignment): JsonResponse
    {
        $assignmentModel = Assignment::where('uid', $assignment)->firstOrFail();

        $request->validate([
            'role_profile' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:15360'],
        ]);

        if ($assignmentModel->role_profile_path) {
            $this->fileService->delete($assignmentModel->role_profile_path);
        }

        $tenantId = Tenant::current()->id;
        $uploaded = $this->fileService->uploadAssignmentRoleProfile(
            $tenantId,
            $assignmentModel->uid,
            $request->file('role_profile')
        );

        $assignmentModel->role_profile_path = $uploaded['path'];
        $assignmentModel->role_profile_original_filename = $uploaded['original_filename'];
        $assignmentModel->save();

        $assignmentModel->load(['account:id,uid,name', 'recruiter:id,uid,name', 'secondaryRecruiters:users.id,uid,name']);

        return response()->json($this->formatAssignment($assignmentModel));
    }

    /**
     * Download or inline-view the rolprofiel document via same-origin proxy (avoids R2 CORS).
     *
     * Query params:
     * - disposition: "inline" | "attachment" (default: attachment)
     */
    public function downloadRoleProfile(Request $request, string $assignment)
    {
        $assignmentModel = Assignment::where('uid', $assignment)->firstOrFail();

        if (!$assignmentModel->role_profile_path) {
            return response()->json(['message' => 'Geen rolprofiel gevonden'], 404);
        }

        $path = $assignmentModel->role_profile_path;
        $filename = $assignmentModel->role_profile_original_filename
            ?: basename($path);

        $disposition = $request->query('disposition', 'attachment');
        $disposition = $disposition === 'inline' ? 'inline' : 'attachment';

        $mime = $this->mimeTypeFromPath($path);

        $stream = Storage::disk('r2')->readStream($path);
        if ($stream === false) {
            return response()->json(['message' => 'Bestand niet gevonden'], 404);
        }

        return response()->stream(function () use ($stream) {
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => $disposition . '; filename="' . addslashes($filename) . '"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Delete the rolprofiel document for a specific assignment.
     */
    public function deleteRoleProfile(string $assignment): JsonResponse
    {
        $assignmentModel = Assignment::where('uid', $assignment)->firstOrFail();

        if (!$assignmentModel->role_profile_path) {
            return response()->json(['message' => 'Geen rolprofiel gevonden'], 404);
        }

        $this->fileService->delete($assignmentModel->role_profile_path);
        $assignmentModel->role_profile_path = null;
        $assignmentModel->role_profile_original_filename = null;
        $assignmentModel->save();

        return response()->json(['message' => 'Rolprofiel succesvol verwijderd']);
    }

    private function roleProfileKindFromPath(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return $ext === 'pdf' ? 'pdf' : 'word';
    }

    private function mimeTypeFromPath(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($ext) {
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            default => 'application/octet-stream',
        };
    }

    private function summarizeRoleProfileFromUpload(\Illuminate\Http\UploadedFile $file): ?string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: '');
        if (!in_array($extension, ['pdf', 'doc', 'docx'], true)) {
            return null;
        }

        $tmpPath = $file->getRealPath();
        if (!$tmpPath) {
            return null;
        }

        $cvService = app(CvParsingService::class);
        $text = $cvService->extractTextWithExtension($tmpPath, $extension);

        if (strlen(trim($text)) < 80) {
            return null;
        }

        $summaryResult = $cvService->summarizeRoleProfile($text);
        if (!($summaryResult['success'] ?? false)) {
            return null;
        }

        return trim((string) ($summaryResult['summary'] ?? ''));
    }

    private function appendRoleProfileSummary(?string $description, string $summary): string
    {
        $summaryBlock = "Rolprofiel samenvatting:\n" . trim($summary);
        $base = trim((string) $description);

        if ($base === '') {
            return $summaryBlock;
        }

        return $base . "\n\n" . $summaryBlock;
    }

    /**
     * Remove the specified assignment.
     */
    public function destroy(Request $request, string $uid): JsonResponse
    {
        $assignment = Assignment::where('uid', $uid)->firstOrFail();

        if (! $request->user()->can('delete', $assignment)) {
            abort(403, 'This action is unauthorized.');
        }

        $assignment->delete();

        return response()->json(['message' => 'Opdracht succesvol verwijderd']);
    }

    /**
     * Get assignments for a specific account.
     */
    public function byAccount(string $accountUid): JsonResponse
    {
        $account = Account::where('uid', $accountUid)->firstOrFail();

        $assignments = Assignment::with(['account:id,uid,name', 'recruiter:id,uid,name', 'secondaryRecruiters:users.id,uid,name'])
            ->where('account_id', $account->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($assignment) => $this->formatAssignment($assignment));

        return response()->json($assignments);
    }
}
