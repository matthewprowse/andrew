<?php

namespace App\Http\Requests;

use App\Models\Page;
use App\Support\ReservedSlugs;
use Illuminate\Foundation\Http\FormRequest;

class RenamePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('pages', 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $currentId = Page::where('slug', (string) $this->route('slug'))->value('id');

        return ['slug' => ReservedSlugs::pageRules($currentId)];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['slug.regex' => 'Use lowercase letters, numbers and hyphens only, e.g. relocation-guide.'];
    }
}
