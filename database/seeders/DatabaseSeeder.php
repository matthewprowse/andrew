<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $this->call([
            ServiceSeeder::class,
            CareerSeeder::class,
            LocationSeeder::class,
            BlogPostSeeder::class,
            SiteSettingsSeeder::class,
            ResourceCategorySeeder::class,
            ResourceItemSeeder::class,
            CountrySeeder::class,
            PageContentSeeder::class,
            TeamMemberSeeder::class,
            EstimatorServiceSeeder::class,
            EstimatorCitySeeder::class,
            EstimatorRateSeeder::class,
            EstimatorSettingsSeeder::class,
        ]);
    }
}
