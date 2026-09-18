<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use App\Support\PublicSettings;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SiteSettingsSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (! SiteSetting::exists()) {
                $record = new SiteSetting(['site' => PublicSettings::defaults(), 'menu' => PublicSettings::menu(), 'social_links' => []]);
                $record->id = 1;
                $record->save();
            }
        });
    }
}
