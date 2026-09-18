<?php

namespace Database\Seeders;

use App\Models\ResourceCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ResourceCategorySeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (ResourceCategory::query()->exists()) {
                return;
            }

            $categories = [
                ['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list', 'kind' => 'format'],
                ['slug' => 'webinars', 'title' => 'Webinars', 'layout' => 'cards', 'kind' => 'format'],
                ['slug' => 'books', 'title' => 'Books', 'layout' => 'cards', 'kind' => 'format'],
            ];

            foreach ($categories as $category) {
                ResourceCategory::create($category);
            }
        });
    }
}
