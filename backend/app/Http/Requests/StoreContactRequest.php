<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Contact;
use App\Models\User;

class StoreContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user->can('create', Contact::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:16'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'current_company' => ['nullable', 'string', 'max:255'],
            'company_role' => ['nullable', 'string', 'max:255'],
            'network_role' => ['nullable', 'string', 'max:255', 'in:candidate,candidate_placed,candidate_rejected,ambassador,client_decision,client_no_decision'],
            'current_salary_cents' => ['nullable', 'integer', 'min:0'],
            'education' => ['nullable', 'in:MBO,HBO,UNI'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'cv_url' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
