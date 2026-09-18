<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Support\ScopeToRichContent;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $json = file_get_contents(__DIR__.'/services.json');
        if ($json === false) {
            throw new \RuntimeException('Cannot read service seed content.');
        }
        DB::transaction(function () use ($json) {
            if (Service::query()->exists()) {
                return;
            }
            foreach (json_decode($json, true, 512, JSON_THROW_ON_ERROR) as $index => $record) {
                $featuredPrimary = $record['featuredPrimary'] ?? [];
                Service::create([
                    'slug' => $record['slug'],
                    'name' => $record['name'], 'headline' => $record['headline'], 'intro' => implode("\n\n", $record['intro']),
                    'scope' => $record['scope'], 'countries' => $record['countries'] ?? [], 'featured_primary' => $featuredPrimary, 'faqs' => $record['faqs'],
                    'rich_content' => ScopeToRichContent::toHtml($record['scope']), 'featured_services' => ScopeToRichContent::toFeaturedServices($featuredPrimary),
                    'cta_text' => $record['ctaText'], 'cta_button_label' => $record['ctaButtonLabel'], 'cta_link' => $record['ctaLink'], 'status' => 'published', 'sort_order' => $index + 1, 'published_at' => now(),
                ]);
            }
        });
    }
}
