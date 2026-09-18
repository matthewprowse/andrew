<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // CMS-04: explicit primary-office flag, additive and defaulted to
        // false for every existing row. Primary office was previously an
        // implicit consequence of row/sort order (see
        // docs/PHASE0_BASELINE.md §4 — Location has "no explicit 'primary
        // office' flag... probably row order"), never a stored fact, so no
        // existing row can be assumed primary by this migration; an admin
        // must explicitly designate one afterward through the Locations
        // editor. At-most-one-primary is enforced at the application layer
        // (see LocationsController::store()/update()), not by a DB
        // constraint — MySQL has no portable partial-unique-index primitive
        // for "unique where is_primary = true".
        Schema::table('locations', function (Blueprint $table) {
            $table->boolean('is_primary')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn('is_primary');
        });
    }
};
