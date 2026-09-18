<?php

namespace App\Http\Requests;

use App\Models\AdminFeedback;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAdminFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Feedback on the admin tool itself is open to anyone who can reach
        // the admin at all, not gated by a specific section permission —
        // it isn't content, it's meta-feedback about the tool.
        return $this->user()?->hasAdminAccess() ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(AdminFeedback::TYPES)],
            'message' => ['required', 'string', 'max:5000'],
            'page_url' => ['nullable', 'string', 'max:2048'],
            'photos' => ['sometimes', 'array', 'max:5'],
            'photos.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ];
    }
}
