<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\User;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user->can('create', \App\Models\User::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                function ($attribute, $value, $fail) {
                    try {
                        $exists = User::where('email', $value)->exists();
                        if ($exists) {
                            $fail('The email has already been taken.');
                        }
                    } catch (\Exception $e) {
                    }
                },
            ],
            'role' => ['required', 'in:admin,recruiter,viewer,owner,management'],
            'password' => ['nullable', 'string', 'min:8', 'regex:/\d/', 'regex:/[^A-Za-z0-9]/'],
        ];
    }
}
