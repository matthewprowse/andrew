<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_post_service', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blog_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->unique(['blog_post_id', 'service_id']);
        });

        // Carry forward each post's single existing service link into the new
        // many-to-many table before the old column is dropped, so this isn't
        // a lossy migration for content that's already tagged.
        DB::table('blog_posts')->whereNotNull('service_id')->select('id', 'service_id')
            ->orderBy('id')->chunk(200, function ($posts) {
                $rows = $posts->map(fn ($post) => ['blog_post_id' => $post->id, 'service_id' => $post->service_id])->all();
                if ($rows !== []) {
                    DB::table('blog_post_service')->insert($rows);
                }
            });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropIndex(['status', 'service_id', 'publish_date', 'id']);
            $table->dropConstrainedForeignId('service_id');
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->string('category')->default('');
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->index(['status', 'service_id', 'publish_date', 'id']);
        });

        DB::table('blog_post_service')->orderBy('id')->chunk(200, function ($links) {
            foreach ($links as $link) {
                DB::table('blog_posts')->where('id', $link->blog_post_id)->update(['service_id' => $link->service_id]);
            }
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->string('category')->default('')->change();
        });

        Schema::dropIfExists('blog_post_service');
    }
};
