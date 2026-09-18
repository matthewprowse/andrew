<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('careers', function (Blueprint $table) {
            $table->id();
            $table->string('job_title');
            $table->longText('description');
            $table->string('location');
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->date('posted_date');
            $table->timestamps();
            $table->index(['status', 'posted_date', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('careers');
    }
};
