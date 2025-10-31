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
        return $this->user()->can('update', $this->route('user'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;
        $user = $this->route('user');

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
