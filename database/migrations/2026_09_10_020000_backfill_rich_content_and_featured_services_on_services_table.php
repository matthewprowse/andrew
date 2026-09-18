<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Converts legacy `scope` sections and `featured_primary` strings into the
     * new `rich_content` HTML and `featured_services` objects, for any row
     * that doesn't have them yet. Safe to run more than once: a row that
     * already has rich_content/featured_services is left untouched, so this
     * never overwrites content entered through the new editor.
     */
    public function up(): void
    {
        foreach (DB::table('services')->select('id', 'scope', 'featured_primary', 'rich_content', 'featured_services')->cursor() as $service) {
            if ($service->rich_content !== null || $service->featured_services !== null) {
                continue;
            }

            $scope = json_decode((string) $service->scope, true) ?: [];
            $richContent = '';

            foreach ($scope as $section) {
                if (! empty($section['heading'])) {
                    $richContent .= '<h2>'.htmlspecialchars($section['heading'], ENT_QUOTES | ENT_HTML5).'</h2>';
                }
                if (! empty($section['intro'])) {
                    $richContent .= '<p>'.nl2br(htmlspecialchars($section['intro'], ENT_QUOTES | ENT_HTML5)).'</p>';
                }
                $items = $section['items'] ?? [];
                if ($items !== []) {
                    $richContent .= '<ul>'.implode('', array_map(
                        static fn (string $item): string => '<li>'.htmlspecialchars($item, ENT_QUOTES | ENT_HTML5).'</li>',
                        $items,
                    )).'</ul>';
                }
            }

            $featuredPrimary = json_decode((string) $service->featured_primary, true) ?: [];
            $featuredServices = array_map(
                static fn (string $name): array => ['name' => $name, 'description' => ''],
                $featuredPrimary,
            );

            DB::table('services')->where('id', $service->id)->update([
                'rich_content' => $richContent,
                'featured_services' => json_encode($featuredServices),
            ]);
        }
    }

    public function down(): void
    {
        // Intentionally left blank: rolling back would discard rich content
        // entered through the new editor, which may no longer resemble the
        // original scope/featured_primary shape it was derived from.
    }
};
