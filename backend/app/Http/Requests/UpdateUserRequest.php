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
        
        // CRITICAL SECURITY: Ensure both users have tenant_id and they match
        if (empty($auth->tenant_id) || empty($user->tenant_id)) {
            return false;
        }
        
        if ($auth->tenant_id !== $user->tenant_id) {
            return false;
        }
        
        return $auth->can('update', $user);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $auth = $this->user();
        $user = $this->route('user');
        
        // CRITICAL SECURITY: Ensure user has tenant_id
        if (empty($auth->tenant_id)) {
            abort(403, 'User is not associated with a tenant');
        }
        
        // CRITICAL SECURITY: Verify tenant_id matches
        if ($user->tenant_id !== $auth->tenant_id) {
            abort(403, 'Cannot access user from different tenant');
        }
        
        $tenantId = $auth->tenant_id;

        return [
            'name' => ['sometimes','string','max:255'],
            'email' => [
                'sometimes','email','max:255',
                Rule::unique('users','email')->where('tenant_id',$tenantId)->ignore($user->id),
            ],
            'role' => ['sometimes','in:admin,recruiter,viewer'],
            'password' => ['nullable','string','min:8','regex:/\d/','regex:/[^A-Za-z0-9]/'],
        ];
    }
}
