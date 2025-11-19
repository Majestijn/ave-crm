<?php

namespace App\Http\Controllers;

use App\Models\Candidate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class CandidateController extends Controller
{
    // Note: We don't use authorizeResource because we need manual route parameter handling for uid
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }

        $candidates = Candidate::where('tenant_id', $auth->tenant_id)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->toArray();

        return response()->json($candidates);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        // Authorization check
        if (!$auth->can('create', Candidate::class)) {
            abort(403, 'This action is unauthorized.');
        }

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:16'],
            'location' => ['nullable', 'string', 'max:255'],
            'current_role' => ['nullable', 'string', 'max:255'],
            'current_company' => ['nullable', 'string', 'max:255'],
            'current_salary_cents' => ['nullable', 'integer', 'min:0'],
            'education' => ['nullable', 'in:MBO,HBO,UNI'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'cv_url' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $candidate = Candidate::create([
            'tenant_id' => $auth->tenant_id,
            ...$data,
        ]);

        return response()->json($candidate, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $candidate)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        $candidateModel = Candidate::where('uid', $candidate)
            ->where('tenant_id', $auth->tenant_id)
            ->firstOrFail();
        
        // Authorization check
        if (!$auth->can('view', $candidateModel)) {
            abort(403, 'This action is unauthorized.');
        }

        return response()->json($candidateModel);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $candidate)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        $candidateModel = Candidate::where('uid', $candidate)
            ->where('tenant_id', $auth->tenant_id)
            ->firstOrFail();
        
        // Authorization check
        if (!$auth->can('update', $candidateModel)) {
            abort(403, 'This action is unauthorized.');
        }

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:16'],
            'location' => ['nullable', 'string', 'max:255'],
            'current_role' => ['nullable', 'string', 'max:255'],
            'current_company' => ['nullable', 'string', 'max:255'],
            'current_salary_cents' => ['nullable', 'integer', 'min:0'],
            'education' => ['nullable', 'in:MBO,HBO,UNI'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'cv_url' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        unset($data['tenant_id'], $data['uid']);

        $candidateModel->fill($data)->save();

        return response()->json($candidateModel);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $candidate)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        // Find candidate by uid (route parameter name is 'candidate' but contains the uid value)
        $candidateModel = Candidate::where('uid', $candidate)
            ->where('tenant_id', $auth->tenant_id)
            ->firstOrFail();
        
        // Authorization check
        if (!$auth->can('delete', $candidateModel)) {
            abort(403, 'This action is unauthorized.');
        }
        
        // Soft delete - sets deleted_at timestamp but keeps the record in database
        // This allows for data recovery and audit trails
        $candidateModel->delete();
        
        return response()->json(['message' => 'Kandidaat succesvol verwijderd'], 200);
    }

    /**
     * Bulk import candidates with random data
     */
    public function bulkImport(Request $request)
    {
        $auth = $request->user();
        
        // Security check: ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        // Authorization: owners, admins, and recruiters can bulk import
        if (!in_array($auth->role, ['owner', 'admin', 'recruiter'])) {
            abort(403, 'Je hebt geen toestemming om bulk import uit te voeren');
        }

        $request->validate([
            'cv_file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'], // 10MB max
        ]);

        // Store the CV file
        $cvFile = $request->file('cv_file');
        $cvPath = $cvFile->store('cvs', 'public');
        $cvUrl = Storage::url($cvPath);

        // Generate 50 random candidates
        $firstNames = ['Jan', 'Piet', 'Klaas', 'Emma', 'Sophie', 'Lucas', 'Noah', 'Anna', 'Milan', 'Eva', 'Daan', 'Julia', 'Sem', 'Lieke', 'Finn', 'Saar', 'Bram', 'Noor', 'Jesse', 'Roos'];
        $lastNames = ['de Vries', 'Jansen', 'de Boer', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Dijkstra', 'Janssen', 'Visser', 'de Wit', 'Smeets', 'de Jong', 'van den Berg', 'van Dijk', 'van der Berg', 'van Leeuwen'];
        $cities = ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen'];
        $roles = ['Software Developer', 'Project Manager', 'Marketing Manager', 'Sales Representative', 'HR Manager', 'Financial Analyst', 'Designer', 'Consultant', 'Engineer', 'Analyst'];
        $companies = ['TechCorp', 'Innovate BV', 'Digital Solutions', 'Future Systems', 'SmartTech', 'Global Inc', 'Local Business', 'StartupXYZ', 'Enterprise Ltd', 'Company ABC'];
        $educations = ['MBO', 'HBO', 'UNI'];

        $candidates = [];
        for ($i = 0; $i < 50; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            
            $candidates[] = Candidate::create([
                'tenant_id' => $auth->tenant_id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'gender' => rand(0, 1) ? 'male' : 'female',
                'location' => $cities[array_rand($cities)],
                'current_role' => $roles[array_rand($roles)],
                'current_company' => $companies[array_rand($companies)],
                'current_salary_cents' => rand(30000, 100000) * 100, // Random salary between 30k and 100k
                'education' => $educations[array_rand($educations)],
                'email' => strtolower($firstName . '.' . $lastName . rand(1, 999) . '@example.com'),
                'phone' => '+31 6 ' . rand(10000000, 99999999),
                'linkedin_url' => 'https://linkedin.com/in/' . strtolower($firstName . '-' . $lastName),
                'cv_url' => $cvUrl, // All candidates share the same CV
                'notes' => 'Bulk imported candidate #' . ($i + 1),
            ]);
        }

        return response()->json([
            'message' => '50 kandidaten succesvol toegevoegd',
            'candidates' => $candidates,
        ], 201);
    }
}

