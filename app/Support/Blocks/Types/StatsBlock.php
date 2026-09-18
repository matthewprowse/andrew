<?php

namespace App\Support\Blocks\Types;

use App\Support\Blocks\BlockType;

/** A row of big numbers with short labels underneath — years in business, countries covered, and so on. */
class StatsBlock implements BlockType
{
    public function key(): string
    {
        return 'stats';
    }

    public function label(): string
    {
        return 'Stats';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => '', 'items' => [
            ['value' => '', 'label' => ''],
            ['value' => '', 'label' => ''],
            ['value' => '', 'label' => ''],
        ]];
    }

    public function rules(): array
    {
        return [
            'heading' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1', 'max:6'],
            'items.*.value' => ['required', 'string', 'max:50'],
            'items.*.label' => ['required', 'string', 'max:100'],
        ];
    }

    public function resolve(array $data): array
    {
        return $data;
    }
}
