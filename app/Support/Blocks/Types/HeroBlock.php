<?php

namespace App\Support\Blocks\Types;

use App\Models\Service;
use App\Support\Blocks\BlockType;
use Illuminate\Validation\Rule;

/** A page's opening banner: heading, supporting text, and up to two buttons. */
class HeroBlock implements BlockType
{
    public function key(): string
    {
        return 'hero';
    }

    public function label(): string
    {
        return 'Hero';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return [
            'heading' => '', 'subheading' => '', 'eyebrow' => '',
            'primaryLabel' => '', 'primaryLink' => '',
            'secondaryLabel' => '', 'secondaryLink' => '',
            // 'split' is the asymmetric two-column layout (Home's style);
            // 'centered' stacks everything centered with no services strip
            // (About's original style).
            'layout' => 'split',
            'showServicesNav' => false,
        ];
    }

    public function rules(): array
    {
        return [
            'heading' => ['required', 'string', 'max:255'],
            'subheading' => ['nullable', 'string', 'max:2000'],
            'eyebrow' => ['nullable', 'string', 'max:100'],
            'primaryLabel' => ['nullable', 'string', 'max:100'],
            'primaryLink' => ['nullable', 'string', 'max:2048'],
            'secondaryLabel' => ['nullable', 'string', 'max:100'],
            'secondaryLink' => ['nullable', 'string', 'max:2048'],
            'layout' => ['required', Rule::in(['split', 'centered'])],
            'showServicesNav' => ['sometimes', 'boolean'],
        ];
    }

    public function resolve(array $data): array
    {
        $showServicesNav = (bool) ($data['showServicesNav'] ?? false);

        return [
            ...$data,
            'showServicesNav' => $showServicesNav,
            'services' => $showServicesNav ? Service::query()
                ->where('status', 'published')
                ->orderBy('sort_order')->orderBy('id')
                ->get(['id', 'name', 'slug', 'icon'])
                ->map(fn (Service $service) => [
                    'id' => $service->id, 'name' => $service->name, 'slug' => $service->slug, 'icon' => $service->icon,
                ])->values()->all() : [],
        ];
    }
}
