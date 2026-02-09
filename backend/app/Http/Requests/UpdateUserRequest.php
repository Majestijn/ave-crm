<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $auth = $this->user();
        $user = $this->route('user');
        
        // In database-per-tenant architecture, if both users exist in the same database,
        // they're already in the same tenant. No need to check tenant_id.
        return $auth->can('update', $user);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->route('user');

        return [
            'name' => ['sometimes','string','max:255'],
            'email' => [
                'sometimes','email','max:255',
                // In database-per-tenant, email uniqueness is already scoped to the tenant database
                Rule::unique('users','email')->ignore($user->id),
            ],
            'role' => ['sometimes','in:admin,recruiter,viewer,owner,management'],
            'password' => ['nullable','string','min:8','regex:/\d/','regex:/[^A-Za-z0-9]/'],
        ];
    }
}
