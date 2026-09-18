<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Services move from being served at their raw stored slug (which
     * carried its own leading "/") to a fixed /services/{slug} prefix, so
     * the slug column becomes a bare path segment like every other slug in
     * the app. See docs/plan (Phase 3/4 URL split) and SaveServiceRequest.
     */
    public function up(): void
    {
        foreach (DB::table('services')->select('id', 'slug')->get() as $service) {
            DB::table('services')->where('id', $service->id)->update(['slug' => ltrim($service->slug, '/')]);
        }
    }

    public function down(): void
    {
        foreach (DB::table('services')->select('id', 'slug')->get() as $service) {
            DB::table('services')->where('id', $service->id)->update(['slug' => '/'.$service->slug]);
        }
    }
};
