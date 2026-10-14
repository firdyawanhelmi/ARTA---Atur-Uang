<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Mirrors the project password policy (min 8, differs from the
     * authenticated user's email, confirmation required). The email
     * comparison is case-insensitive, matching credential lookup.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (is_string($value)
                        && strcasecmp($value, (string) $this->user()?->email) === 0
                    ) {
                        $fail('The password must be different from your email address.');
                    }
                },
            ],
        ];
    }
}
