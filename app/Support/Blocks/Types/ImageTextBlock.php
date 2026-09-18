<?php

namespace App\Support\Blocks\Types;

use App\Models\Media;
use App\Support\Blocks\BlockType;
use Illuminate\Validation\Rule;

/** A heading and body paragraph beside an image, either side — a photo-led counterpart to Text. */
class ImageTextBlock implements BlockType
{
    public function key(): string
    {
        return 'image_text';
    }

    public function label(): string
    {
        return 'Image + text';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => '', 'body' => '', 'imagePosition' => 'right', 'image' => null];
    }

    public function rules(): array
    {
        return [
            'heading' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:4000'],
            'imagePosition' => ['required', Rule::in(['left', 'right'])],
            // Stored as the picker's own {id, url, fileName} shape (same as
            // a page's og_image) so the admin editor can show the picked
            // image back without a lookup — resolve() below is the only
            // place that id is trusted for the public render.
            'image' => ['nullable', 'array'],
            'image.id' => ['required_with:image', 'integer', Rule::exists('media', 'id')->where('kind', 'image')],
        ];
    }

    public function resolve(array $data): array
    {
        $imageId = $data['image']['id'] ?? null;
        $image = $imageId ? Media::query()->find((int) $imageId) : null;

        return [
            ...$data,
            'imageUrl' => $image?->url() ?? '',
            'imageAlt' => $image?->alt_text ?: ($data['heading'] ?? ''),
        ];
    }
}
