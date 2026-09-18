<?php

namespace App\Support\Blocks\Types;

use App\Models\Testimonial;
use App\Support\Blocks\BlockType;

/** The current general (not service-specific) published testimonials — content managed in Testimonials, not here. */
class TestimonialsBlock implements BlockType
{
    public function key(): string
    {
        return 'testimonials';
    }

    public function label(): string
    {
        return 'Testimonials';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => 'What Our Clients Say'];
    }

    public function rules(): array
    {
        return ['heading' => ['nullable', 'string', 'max:255']];
    }

    public function resolve(array $data): array
    {
        return [
            ...$data,
            'testimonials' => Testimonial::query()->published()->whereNull('service_id')
                ->orderBy('sort_order')->orderBy('id')->get()
                ->map(fn (Testimonial $testimonial) => $testimonial->publicData())->values()->all(),
        ];
    }
}
