<?php

namespace App\Http\Requests;

use App\Support\Blocks\BlockRegistry;
use Illuminate\Foundation\Http\FormRequest;

class SavePageBlocksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('pages', 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var array<int, array<string, mixed>> $blocks */
        $blocks = is_array($this->input('blocks')) ? $this->input('blocks') : [];

        return [
            'title' => ['required', 'string', 'max:255'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:320'],
            'og_image_media_id' => ['nullable', 'integer', 'exists:media,id'],
            'base_revision_id' => ['nullable', 'integer'],
            ...app(BlockRegistry::class)->rulesFor($blocks),
        ];
    }
}
