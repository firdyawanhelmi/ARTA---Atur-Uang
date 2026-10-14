<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * PRD password rules: minimum 8 characters, must differ from email, no
     * composition requirements. Name has no PRD constraints; standard
     * required/string/max applies. Approved Option B: duplicate emails get
     * the byte-identical generic success response (handled in the
     * controller, never a 422), so no existence signal leaks.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'different:email'],
            'device_id' => ['nullable', 'string', 'uuid'],
        ];
    }
}
