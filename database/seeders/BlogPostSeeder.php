<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BlogPostSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (BlogPost::query()->exists()) {
                return;
            }
            $source = file_get_contents(__DIR__.'/blog-posts.json');
            if ($source === false) {
                throw new \RuntimeException('Could not read blog seed content.');
            }
            $servicesByName = Service::query()->pluck('id', 'name');
            $posts = json_decode($source, true, 512, JSON_THROW_ON_ERROR);
            foreach ($posts as $post) {
                // Status stays 'draft' (non-public) until real copy replaces this placeholder seed content.
                $created = BlogPost::create(['title' => $post['title'], 'slug' => $post['slug'],
                    'excerpt' => $post['excerpt'], 'body' => implode("\n\n", $post['body']), 'status' => 'draft', 'publish_date' => $post['publishDate']]);
                $serviceId = $servicesByName[$post['category']] ?? null;
                if ($serviceId) {
                    $created->services()->sync([$serviceId]);
                }
            }
        });
    }
}
