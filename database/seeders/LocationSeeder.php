<?php

namespace Database\Seeders;

use App\Models\Location;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocationSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (Location::query()->exists()) {
                return;
            }
            // The address, phone and email below are unverified placeholder values, not
            // confirmed business facts. They render publicly on /contact and /locations
            // with no draft/published gate. Do not treat them as real until the client
            // confirms the details in docs/content-remediation/05-client-confirmation.md.
            Location::create([
                'office_name' => 'Head Office',
                'address' => '4th Floor, 90 Rivonia Road, Sandton, Johannesburg, South Africa',
                'phone' => '+27 11 000 0000', 'email' => 'hello@relocationafrica.com', 'sort_order' => 1,
            ]);
        });
    }
}
