<?php

namespace Database\Seeders;

use App\Models\EstimatorSettings;
use Illuminate\Database\Seeder;

class EstimatorSettingsSeeder extends Seeder
{
    public function run(): void
    {
        if (EstimatorSettings::query()->exists()) {
            return;
        }

        EstimatorSettings::create([
            'currency' => 'USD',
            'vat_rate' => 0.15,
            'contingency_rate' => 0.10,
            'transit_insurance_share' => 0.10,
            'validity_days' => 90,
        ]);
    }
}
