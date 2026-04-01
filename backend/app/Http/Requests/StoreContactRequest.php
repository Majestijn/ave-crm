<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Contact;
use App\Models\DropdownOption;
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
            'gender' => ['nullable', 'string', DropdownOption::validationRule('gender')],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'current_company' => ['nullable', 'string', 'max:255'],
            'company_role' => ['nullable', 'string', 'max:255'],
            'network_roles' => ['nullable', 'array'],
            'network_roles.*' => ['string', 'max:64', DropdownOption::validationRule('network_role')],
            'current_salary_cents' => ['nullable', 'integer', 'min:0'],
            'education' => ['nullable', 'string', DropdownOption::validationRule('education')],
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
