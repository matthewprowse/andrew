<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('services')->select('id', 'featured_primary', 'featured_secondary')->cursor() as $service) {
            $primary = json_decode((string) $service->featured_primary, true) ?: [];
            $secondary = json_decode((string) $service->featured_secondary, true) ?: [];

            if ($secondary !== []) {
                DB::table('services')->where('id', $service->id)->update([
                    'featured_primary' => json_encode([...$primary, ...$secondary]),
                ]);
            }
        }

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('featured_secondary');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->json('featured_secondary')->nullable()->after('featured_primary');
        });
    }
};
