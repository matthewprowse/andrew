<?php

namespace App\Support\Blocks\Types;

use App\Support\Blocks\BlockType;

/**
 * A call-to-action banner. Any field left blank falls back to the site's
 * default CTA copy/link from Settings — the same fallback SiteCta already
 * used for the old hardcoded final-CTA section.
 */
class CtaBlock implements BlockType
{
    public function key(): string
    {
        return 'cta';
    }

    public function label(): string
    {
        return 'Call to action';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => '', 'description' => '', 'buttonLabel' => '', 'buttonLink' => ''];
    }

    public function rules(): array
    {
        return [
            'heading' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'buttonLabel' => ['nullable', 'string', 'max:100'],
            'buttonLink' => ['nullable', 'string', 'max:2048'],
        ];
    }

    public function resolve(array $data): array
    {
        return $data;
    }
}
