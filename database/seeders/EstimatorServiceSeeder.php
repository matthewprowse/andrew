<?php

namespace Database\Seeders;

use App\Models\EstimatorService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EstimatorServiceSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (EstimatorService::query()->exists()) {
                return;
            }

            $costs = [
                ['Flights', 'Flexible economy, per person', true],
                ['Airport Transfer', '', false],
                ['Temporary Accommodation', '', false],
                ['Household Goods Shipping', '', false],
                ['Transit Insurance', '', false],
                ['Storage', '', false],
                ['Pet Relocation', '', false],
                ['Visas & Immigration', '', false],
            ];

            foreach ($costs as $index => [$name, $description, $selectedByDefault]) {
                EstimatorService::create([
                    'category' => 'costs', 'name' => $name, 'description' => $description ?: null,
                    'selected_by_default' => $selectedByDefault, 'active' => true, 'sort_order' => $index + 1,
                ]);
            }

            $services = [
                ['Pre-Departure Briefing', 'Full consultation briefing', true, true, 2, 0, 5, 30],
                ['Home Search Program', '', false, false, 0, 0, 0, 0],
                ['Area Orientation', '', false, false, 0, 0, 0, 0],
                ['Education & Childcare', '', false, false, 0, 0, 0, 0],
                ['Settling-In Service', '', false, false, 0, 0, 0, 0],
                ['Partner Support Program', '', false, false, 0, 0, 0, 0],
                ['Two Day Home Search', '', false, false, 0, 0, 0, 0],
                ['Three Day Bundle Package', '', false, false, 0, 0, 0, 0],
            ];

            foreach ($services as $index => [$name, $description, $selectedByDefault, $tiered, $firstThreshold, $adjAboveThreshold, $nextThreshold, $adjAboveNext]) {
                EstimatorService::create([
                    'category' => 'services', 'name' => $name, 'description' => $description ?: null,
                    'selected_by_default' => $selectedByDefault, 'active' => true, 'sort_order' => $index + 9,
                    'tiered_pricing' => $tiered, 'first_threshold' => $firstThreshold, 'adjustment_above_threshold' => $adjAboveThreshold,
                    'next_threshold' => $nextThreshold, 'adjustment_above_next_threshold' => $adjAboveNext,
                ]);
            }
        });
    }
}
