<?php

namespace App\Support;

/**
 * Derives the new rich-content/featured-services shape from the legacy
 * scope-sections/featured_primary arrays. Used by seeders producing demo
 * content in the new shape; the one-time backfill migration keeps its own
 * self-contained copy of this logic so it isn't tied to evolving app code.
 */
class ScopeToRichContent
{
    /** @param  list<array{heading?: string, intro?: string, items?: list<string>}>  $scope */
    public static function toHtml(array $scope): string
    {
        $html = '';

        foreach ($scope as $section) {
            if (! empty($section['heading'])) {
                $html .= '<h2>'.htmlspecialchars($section['heading'], ENT_QUOTES | ENT_HTML5).'</h2>';
            }
            if (! empty($section['intro'])) {
                $html .= '<p>'.nl2br(htmlspecialchars($section['intro'], ENT_QUOTES | ENT_HTML5)).'</p>';
            }
            $items = $section['items'] ?? [];
            if ($items !== []) {
                $html .= '<ul>'.implode('', array_map(
                    static fn (string $item): string => '<li>'.htmlspecialchars($item, ENT_QUOTES | ENT_HTML5).'</li>',
                    $items,
                )).'</ul>';
            }
        }

        return $html;
    }

    /**
     * @param  list<string>  $featuredPrimary
     * @return list<array{name: string, description: string}>
     */
    public static function toFeaturedServices(array $featuredPrimary): array
    {
        return array_map(
            static fn (string $name): array => ['name' => $name, 'description' => ''],
            $featuredPrimary,
        );
    }
}
