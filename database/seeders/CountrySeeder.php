<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CountrySeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (Country::query()->exists()) {
                return;
            }

            $countries = [
                ['name' => 'South Africa', 'slug' => 'south-africa', 'region' => 'Southern Africa', 'description' => 'Relocation and immigration support for assignees and organisations moving into Johannesburg and across the region.'],
                ['name' => 'Kenya', 'slug' => 'kenya', 'region' => 'East Africa', 'description' => 'Coordination of moves and visa services for assignees relocating into Nairobi and across East Africa.'],
                ['name' => 'Nigeria', 'slug' => 'nigeria', 'region' => 'West Africa', 'description' => "Corporate relocation and immigration support for West Africa's largest economy."],
                ['name' => 'Ghana', 'slug' => 'ghana', 'region' => 'West Africa', 'description' => 'Destination services and visa support for assignees moving into Accra and beyond.'],
                ['name' => 'Egypt', 'slug' => 'egypt', 'region' => 'North Africa', 'description' => 'Immigration and relocation coordination for assignments across North Africa.'],
                ['name' => 'Morocco', 'slug' => 'morocco', 'region' => 'North Africa', 'description' => 'On-the-ground support for moves into Casablanca, Rabat, and Tangier.'],
                ['name' => 'Tanzania', 'slug' => 'tanzania', 'region' => 'East Africa', 'description' => 'Relocation and compliance support for assignments across Dar es Salaam and Zanzibar.'],
                ['name' => 'Uganda', 'slug' => 'uganda', 'region' => 'East Africa', 'description' => 'Visa, immigration, and settling-in support for Kampala-based assignments.'],
                ['name' => 'Rwanda', 'slug' => 'rwanda', 'region' => 'East Africa', 'description' => "Coordination for corporate moves into Kigali's fast-growing business hubs."],
                ['name' => 'Zambia', 'slug' => 'zambia', 'region' => 'Southern Africa', 'description' => 'Relocation support for assignees moving into Lusaka and the Copperbelt.'],
                ['name' => 'Botswana', 'slug' => 'botswana', 'region' => 'Southern Africa', 'description' => 'Immigration and destination services for moves into Gaborone.'],
                ['name' => 'Mozambique', 'slug' => 'mozambique', 'region' => 'Southern Africa', 'description' => 'Coordination for assignments into Maputo and the wider region.'],
            ];

            foreach ($countries as $index => $country) {
                Country::create([...$country, 'sort_order' => $index + 1]);
            }
        });
    }
}
