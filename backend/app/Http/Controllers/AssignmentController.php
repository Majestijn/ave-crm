<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Account;
use App\Services\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
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

        return [
            'id' => $assignment->id,
            'uid' => $assignment->uid,
            'account_id' => $assignment->account_id,
            'account' => $assignment->account ? [
                'uid' => $assignment->account->uid,
                'name' => $assignment->account->name,
            ] : null,
            'title' => $assignment->title,
            'description' => $assignment->description,
            'status' => $assignment->status,
            'salary_min' => $assignment->salary_min,
            'salary_max' => $assignment->salary_max,
            'vacation_days' => $assignment->vacation_days,
            'location' => $assignment->location,
            'employment_type' => $assignment->employment_type,
            'benefits' => $assignment->benefits,
            'notes_image_url' => $notesImageUrl,
            'created_at' => $assignment->created_at,
            'updated_at' => $assignment->updated_at,
        ];
    }

    /**
     * Display a listing of assignments.
     */
    public function index(Request $request): JsonResponse
    {
        $assignments = Assignment::with('account:id,uid,name')
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
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,proposed,hired,completed,cancelled',
            'salary_min' => 'nullable|integer|min:0',
            'salary_max' => 'nullable|integer|min:0',
            'vacation_days' => 'nullable|integer|min:0|max:100',
            'location' => 'nullable|string|max:255',
            'employment_type' => 'nullable|string|max:255',
            'benefits' => 'nullable|array',
            'benefits.*' => 'string|max:100',
            'notes_image' => 'nullable|file|image|max:5120', // max 5MB
        ]);

        // Find account by uid (manual check instead of exists rule for multi-tenant)
        $account = Account::where('uid', $validated['account_uid'])->first();
        
        if (!$account) {
            return response()->json([
                'message' => 'De geselecteerde klant bestaat niet.',
                'errors' => ['account_uid' => ['De geselecteerde klant bestaat niet.']]
            ], 422);
        }

        $assignment = Assignment::create([
            'account_id' => $account->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'salary_min' => $validated['salary_min'] ?? null,
            'salary_max' => $validated['salary_max'] ?? null,
            'vacation_days' => $validated['vacation_days'] ?? null,
            'location' => $validated['location'] ?? null,
            'employment_type' => $validated['employment_type'] ?? null,
            'benefits' => $validated['benefits'] ?? null,
        ]);

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

        // Load relationship for response
        $assignment->load('account:id,uid,name');

        return response()->json($this->formatAssignment($assignment), 201);
    }

    /**
     * Display the specified assignment.
     */
    public function show(string $uid): JsonResponse
    {
        $assignment = Assignment::with('account:id,uid,name')
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
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|in:active,proposed,hired,completed,cancelled',
            'salary_min' => 'nullable|integer|min:0',
            'salary_max' => 'nullable|integer|min:0',
            'has_bonus' => 'nullable|boolean',
            'has_car' => 'nullable|boolean',
            'vacation_days' => 'nullable|integer|min:0|max:100',
            'location' => 'nullable|string|max:255',
            'employment_type' => 'nullable|string|max:255',
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

        unset($validated['notes_image']);
        $assignment->fill($validated);
        $assignment->save();

        // Load relationship for response
        $assignment->load('account:id,uid,name');

        return response()->json($this->formatAssignment($assignment));
    }

    /**
     * Delete the notes image for a specific assignment.
     */
    public function deleteNotesImage(string $uid): JsonResponse
    {
        $assignment = Assignment::where('uid', $uid)->firstOrFail();

        if (!$assignment->notes_image_path) {
            return response()->json(['message' => 'Geen notitie afbeelding gevonden'], 404);
        }

        $this->fileService->delete($assignment->notes_image_path);
        $assignment->notes_image_path = null;
        $assignment->save();

        return response()->json(['message' => 'Notitie afbeelding succesvol verwijderd']);
    }

    /**
     * Remove the specified assignment.
     */
    public function destroy(string $uid): JsonResponse
    {
        $assignment = Assignment::where('uid', $uid)->firstOrFail();
        $assignment->delete();

        return response()->json(['message' => 'Opdracht succesvol verwijderd']);
    }

    /**
     * Get assignments for a specific account.
     */
    public function byAccount(string $accountUid): JsonResponse
    {
        $account = Account::where('uid', $accountUid)->firstOrFail();

        $assignments = Assignment::with('account:id,uid,name')
            ->where('account_id', $account->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($assignment) => $this->formatAssignment($assignment));

        return response()->json($assignments);
    }
}
