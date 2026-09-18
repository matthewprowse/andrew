<?php

namespace Database\Seeders;

use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ResourceItemSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (ResourceItem::query()->exists()) {
                return;
            }

            // Descriptions follow the copy pack's resourceDescriptionFormula and resourceExample
            // (docs/content-remediation/copy/site.json), written out per item since no per-item
            // copy exists yet for these unbuilt resources.
            $source = file_get_contents(__DIR__.'/resource-items.json');
            if ($source === false) {
                throw new \RuntimeException('Could not read resource item seed content.');
            }
            $itemsByCategory = json_decode($source, true, 512, JSON_THROW_ON_ERROR);

            foreach ($itemsByCategory as $slug => $items) {
                $category = ResourceCategory::where('slug', $slug)->first();

                if (! $category) {
                    continue;
                }

                foreach ($items as $index => $item) {
                    // Status stays 'draft' (non-public): these items have no file or link attached
                    // yet, so they must not appear publicly until an editor wires up the asset.
                    ResourceItem::create([
                        'resource_category_id' => $category->id,
                        'title' => $item['title'],
                        'description' => $item['description'],
                        'action_label' => $item['actionLabel'],
                        'sort_order' => $index + 1,
                        'status' => 'draft',
                    ]);
                }
            }
        });
    }
}
