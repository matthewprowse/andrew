<?php

namespace App\Support\Blocks\Types;

use App\Support\Blocks\BlockType;

/** A heading, a paragraph, and an optional single link — the general-purpose content block. */
class TextBlock implements BlockType
{
    public function key(): string
    {
        return 'text';
    }

    public function label(): string
    {
        return 'Text';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['eyebrow' => '', 'heading' => '', 'body' => '', 'linkLabel' => '', 'linkUrl' => ''];
    }

    public function rules(): array
    {
        return [
            'eyebrow' => ['nullable', 'string', 'max:100'],
            'heading' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:10000'],
            'linkLabel' => ['nullable', 'string', 'max:100'],
            'linkUrl' => ['nullable', 'string', 'max:2048'],
        ];
    }

    public function resolve(array $data): array
    {
        return $data;
    }
}
