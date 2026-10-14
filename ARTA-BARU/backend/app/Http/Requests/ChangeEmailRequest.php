<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChangeEmailRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The new address must differ from the authenticated user's current
     * email (case-insensitive, matching credential lookup). Collision with
     * other accounts is checked in the controller against both active and
     * pending addresses.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (is_string($value)
                        && strcasecmp($value, (string) $this->user()?->email) === 0
                    ) {
                        $fail('The new email must be different from the current email address.');
                    }
                },
            ],
        ];
    }
}
