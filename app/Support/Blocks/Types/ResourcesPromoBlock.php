<?php

namespace App\Support\Blocks\Types;

use App\Models\ResourceCategory;
use App\Support\Blocks\BlockType;

/**
 * Promotional cards linking to the three resource categories. The cards
 * themselves (title/link/text) are fixed site structure, same as before the
 * block system — only heading/intro are editable — and a category with no
 * published items is dropped so the card never links to an empty page.
 */
class ResourcesPromoBlock implements BlockType
{
    private const CARDS = [
        ['title' => 'Insights and News', 'href' => '/blog', 'text' => 'Perspectives on mobility, immigration, remuneration and life across Africa.', 'categorySlug' => null],
        ['title' => 'Webinars and Learning', 'href' => '/resources/webinars', 'text' => 'Practical sessions for HR, mobility professionals and relocating employees.', 'categorySlug' => 'webinars'],
        ['title' => 'Company Brochures', 'href' => '/resources/brochures', 'text' => "A clear introduction to Relocation Africa's services and approach.", 'categorySlug' => 'brochures'],
    ];

    public function key(): string
    {
        return 'resources_promo';
    }

    public function label(): string
    {
        return 'Resources promo';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => 'Knowledge for Your Next Chapter', 'intro' => ''];
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
        $emptySlugs = ResourceCategory::emptySlugs();

        return [
            ...$data,
            'cards' => collect(self::CARDS)
                ->reject(fn (array $card) => $card['categorySlug'] && $emptySlugs->contains($card['categorySlug']))
                ->map(fn (array $card) => ['title' => $card['title'], 'href' => $card['href'], 'text' => $card['text']])
                ->values()->all(),
        ];
    }
}
