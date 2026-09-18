<?php

namespace App\Support\Blocks\Types;

use App\Models\Service;
use App\Support\Blocks\BlockType;

/** A heading, optional intro, and the current published services as cards — content managed in Services, not here. */
class ServicesGridBlock implements BlockType
{
    public function key(): string
    {
        return 'services_grid';
    }

    public function label(): string
    {
        return 'Services grid';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => 'Our Services', 'intro' => ''];
    }

    public function rules(): array
    {
        return [
            'heading' => ['nullable', 'string', 'max:255'],
            'intro' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function resolve(array $data): array
    {
        return [
            ...$data,
            'services' => Service::query()
                ->where('status', 'published')
                ->orderBy('sort_order')->orderBy('id')
                ->get(['id', 'name', 'headline', 'slug', 'intro', 'icon'])
                ->map(fn (Service $service) => [
                    'id' => $service->id, 'name' => $service->name, 'headline' => $service->headline,
                    'slug' => $service->slug, 'intro' => $service->intro ?? '', 'icon' => $service->icon,
                ])->values()->all(),
        ];
    }
}
