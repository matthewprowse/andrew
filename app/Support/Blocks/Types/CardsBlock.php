<?php

namespace App\Support\Blocks\Types;

use App\Support\Blocks\BlockType;
use Illuminate\Validation\Rule;

/** A heading, optional intro, and a row of title/text cards — two or three columns. */
class CardsBlock implements BlockType
{
    public function key(): string
    {
        return 'cards';
    }

    public function label(): string
    {
        return 'Cards';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => '', 'intro' => '', 'columns' => 3, 'style' => 'icons', 'items' => [
            ['title' => '', 'text' => ''],
            ['title' => '', 'text' => ''],
            ['title' => '', 'text' => ''],
        ]];
    }

    public function rules(): array
    {
        return [
            'heading' => ['nullable', 'string', 'max:255'],
            'intro' => ['nullable', 'string', 'max:2000'],
            'columns' => ['required', 'integer', Rule::in([2, 3])],
            // 'icons' cycles a fixed icon per card (Home's "values" style);
            // 'list' is a plain bordered title/text list (About's original
            // FeatureGrid style) — same data shape either way.
            'style' => ['required', Rule::in(['icons', 'list'])],
            'items' => ['required', 'array', 'min:1', 'max:12'],
            'items.*.title' => ['required', 'string', 'max:255'],
            'items.*.text' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function resolve(array $data): array
    {
        return $data;
    }
}
