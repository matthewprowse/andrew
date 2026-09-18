<?php

namespace App\Http\Requests;

use App\Support\ReservedSlugs;
use Illuminate\Foundation\Http\FormRequest;

class CreatePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('pages', 'create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ReservedSlugs::pageRules(),
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['slug.regex' => 'Use lowercase letters, numbers and hyphens only, e.g. relocation-guide.'];
    }
}
