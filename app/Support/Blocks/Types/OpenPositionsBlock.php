<?php

namespace App\Support\Blocks\Types;

use App\Models\Career;
use App\Support\Blocks\BlockType;

/** The current open vacancies — content managed in Team Members > Open positions, not here. */
class OpenPositionsBlock implements BlockType
{
    public function key(): string
    {
        return 'open_positions';
    }

    public function label(): string
    {
        return 'Open positions';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => 'Open Positions'];
    }

    public function rules(): array
    {
        return ['heading' => ['nullable', 'string', 'max:255']];
    }

    public function resolve(array $data): array
    {
        return [
            ...$data,
            'positions' => Career::query()->where('status', 'open')
                ->orderByDesc('posted_date')->orderByDesc('id')->get()
                ->map(fn (Career $career) => [
                    'id' => (string) $career->id, 'title' => $career->job_title, 'description' => $career->description,
                    'location' => $career->location, 'postedDate' => $career->posted_date->format('Y-m-d'),
                ])->values()->all(),
        ];
    }
}
