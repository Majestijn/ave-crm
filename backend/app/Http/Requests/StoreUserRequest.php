<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        
        // CRITICAL SECURITY: Ensure user has tenant_id
        if (empty($user->tenant_id)) {
            return false;
        }
        
        return $user->can('create', \App\Models\User::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();
        
        // CRITICAL SECURITY: Ensure user has tenant_id
        if (empty($user->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        $tenantID = $user->tenant_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->where('tenant_id', $tenantID)],
            'role' => ['required', 'in:admin,recruiter,viewer'], // Note: 'owner' role cannot be assigned via this endpoint
            'password' => ['nullable', 'string', 'min:8', 'regex:/\d/', 'regex:/[^A-Za-z0-9]/'],
        ];
    }
}
