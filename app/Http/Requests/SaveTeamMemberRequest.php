<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveTeamMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('team', $this->isMethod('post') ? 'create' : 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:5000'],
            'photo_media_id' => ['nullable', 'integer', 'exists:media,id'],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
