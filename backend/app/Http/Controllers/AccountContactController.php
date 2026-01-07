<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountContact;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AccountContactController extends Controller
{
    /**
     * Display contacts for a specific account.
     */
    public function index(string $accountUid): JsonResponse
    {
        $account = Account::where('uid', $accountUid)->firstOrFail();

        $contacts = AccountContact::where('account_id', $account->id)
            ->with('contact:id,uid,first_name,last_name,email,phone,company_role,network_roles')
            ->get()
            ->map(function ($ac) {
                return [
                    'id' => $ac->id,
                    'contact_id' => $ac->contact_id,
                    'contact' => $ac->contact ? [
                        'uid' => $ac->contact->uid,
                        'first_name' => $ac->contact->first_name,
                        'last_name' => $ac->contact->last_name,
                        'name' => $ac->contact->first_name . ' ' . $ac->contact->last_name,
                        'email' => $ac->contact->email,
                        'phone' => $ac->contact->phone,
                        'company_role' => $ac->contact->company_role,
                        'network_roles' => $ac->contact->network_roles,
                    ] : null,
                ];
            });

        return response()->json($contacts);
    }

    /**
     * Link an existing contact to an account.
     */
    public function store(Request $request, string $accountUid): JsonResponse
    {
        $account = Account::where('uid', $accountUid)->firstOrFail();

        $validated = $request->validate([
            'contact_uid' => 'required|string',
        ]);

        // Find the contact
        $contact = Contact::where('uid', $validated['contact_uid'])->first();
        if (!$contact) {
            return response()->json([
                'message' => 'Contact niet gevonden',
                'errors' => ['contact_uid' => ['Contact niet gevonden']]
            ], 422);
        }

        // Check if already linked
        $existing = AccountContact::where('account_id', $account->id)
            ->where('contact_id', $contact->id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Dit contact is al gekoppeld aan deze klant',
                'errors' => ['contact_uid' => ['Dit contact is al gekoppeld aan deze klant']]
            ], 422);
        }

        $accountContact = AccountContact::create([
            'account_id' => $account->id,
            'contact_id' => $contact->id,
        ]);

        $accountContact->load('contact:id,uid,first_name,last_name,email,phone,company_role,network_roles');

        return response()->json([
            'id' => $accountContact->id,
            'contact_id' => $accountContact->contact_id,
            'contact' => $accountContact->contact ? [
                'uid' => $accountContact->contact->uid,
                'first_name' => $accountContact->contact->first_name,
                'last_name' => $accountContact->contact->last_name,
                'name' => $accountContact->contact->first_name . ' ' . $accountContact->contact->last_name,
                'email' => $accountContact->contact->email,
                'phone' => $accountContact->contact->phone,
                'company_role' => $accountContact->contact->company_role,
                'network_roles' => $accountContact->contact->network_roles,
            ] : null,
        ], 201);
    }

    /**
     * Unlink a contact from an account.
     */
    public function destroy(int $accountContactId): JsonResponse
    {
        $accountContact = AccountContact::findOrFail($accountContactId);
        $accountContact->delete();

        return response()->json(['message' => 'Contactpersoon ontkoppeld']);
    }
}
