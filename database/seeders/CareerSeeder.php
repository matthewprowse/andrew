<?php

namespace Database\Seeders;

use App\Models\Career;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CareerSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (Career::query()->exists()) {
                return;
            }

            $source = file_get_contents(__DIR__.'/careers.json');
            if ($source === false) {
                throw new \RuntimeException('Could not read career seed content.');
            }
            $roles = json_decode($source, true, 512, JSON_THROW_ON_ERROR);

            foreach ($roles as $role) {
                // Status stays 'closed' (non-public): these two roles are unconfirmed and must not
                // go live until the client confirms the role, location and application method
                // (see docs/content-remediation/05-client-confirmation.md).
                Career::create([
                    'job_title' => $role['jobTitle'],
                    'location' => $role['location'],
                    'posted_date' => $role['postedDate'],
                    'description' => $role['description'],
                    'status' => 'closed',
                ]);
            }
        });
    }
}
