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
            'prefix' => ['nullable', 'string', 'max:50'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:16'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'current_company' => ['nullable', 'string', 'max:255'],
            'company_role' => ['nullable', 'string', 'max:255'],
            'network_roles' => ['nullable', 'array'],
            'network_roles.*' => ['string', 'in:invoice_contact,candidate,candidate_placed,interim,ambassador,potential_management,co_decision_maker,potential_directie,candidate_reference,hr_employment,hr_recruiters,directie,owner,expert,coach,former_owner,former_director,commissioner,investor,network_group,budget_holder,client_principal,signing_authority,final_decision_maker'],
            'current_salary_cents' => ['nullable', 'integer', 'min:0'],
            'education' => ['nullable', 'in:MBO,HBO,UNI'],
            'availability_date' => ['nullable', 'date'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'notes' => ['nullable', 'string'],
            'work_experiences' => ['nullable', 'array'],
            'work_experiences.*.job_title' => ['required_with:work_experiences.*', 'string', 'max:255'],
            'work_experiences.*.company_name' => ['required_with:work_experiences.*', 'string', 'max:255'],
            'work_experiences.*.start_date' => ['required_with:work_experiences.*', 'date'],
            'work_experiences.*.end_date' => ['nullable', 'date'],
            'work_experiences.*.location' => ['nullable', 'string', 'max:255'],
            'work_experiences.*.description' => ['nullable', 'string'],
        ];
    }
}
