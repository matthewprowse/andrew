<?php

namespace App\Support\Blocks\Types;

use App\Support\Blocks\BlockType;

/**
 * A two-column pairing: heading/body/link on one side, a short list of
 * title/text items on the other — the "African Reach" section's original
 * layout (reach copy beside the audience cards), generalised as a block.
 */
class TextWithListBlock implements BlockType
{
    public function key(): string
    {
        return 'text_with_list';
    }

    public function label(): string
    {
        return 'Text with list';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => '', 'body' => '', 'linkLabel' => '', 'linkUrl' => '', 'items' => [
            ['title' => '', 'text' => ''],
            ['title' => '', 'text' => ''],
            ['title' => '', 'text' => ''],
        ]];
    }

    public function rules(): array
    {
        return [
            'heading' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:2000'],
            'linkLabel' => ['nullable', 'string', 'max:100'],
            'linkUrl' => ['nullable', 'string', 'max:2048'],
            'items' => ['required', 'array', 'min:1', 'max:8'],
            'items.*.title' => ['required', 'string', 'max:255'],
            'items.*.text' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function resolve(array $data): array
    {
        return $data;
    }
}
