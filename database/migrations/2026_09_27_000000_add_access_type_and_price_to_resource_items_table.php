<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Replaces the `requires_email_verification` boolean with an access type
     * (open | email | paid) so a resource can also be sold. Existing gated
     * items become `email`; everything else becomes `open`.
     */
    public function up(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->string('access_type')->default('open')->after('external_url');
            $table->unsignedInteger('price_cents')->nullable()->after('access_type');
            $table->char('currency', 3)->default('USD')->after('price_cents');
        });

        DB::table('resource_items')->where('requires_email_verification', true)->update(['access_type' => 'email']);

        Schema::table('resource_items', function (Blueprint $table) {
            $table->dropColumn('requires_email_verification');
        });
    }

    public function down(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->boolean('requires_email_verification')->default(false)->after('external_url');
        });

        DB::table('resource_items')->whereIn('access_type', ['email', 'paid'])->update(['requires_email_verification' => true]);

        Schema::table('resource_items', function (Blueprint $table) {
            $table->dropColumn(['access_type', 'price_cents', 'currency']);
        });
    }
};
