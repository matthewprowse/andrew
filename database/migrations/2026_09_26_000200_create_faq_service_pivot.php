<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faq_service', function (Blueprint $table): void {
            $table->foreignId('faq_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->primary(['faq_id', 'service_id']);
        });

        DB::table('faqs')->whereNotNull('service_id')->select('id', 'service_id')
            ->orderBy('id')->chunk(200, function ($faqs): void {
                $rows = $faqs->map(fn ($faq) => [
                    'faq_id' => $faq->id,
                    'service_id' => $faq->service_id,
                ])->all();

                if ($rows !== []) {
                    DB::table('faq_service')->insert($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('faq_service');
    }
};
