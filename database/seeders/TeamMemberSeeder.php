<?php

namespace Database\Seeders;

use App\Models\TeamMember;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TeamMemberSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (TeamMember::query()->exists()) {
                return;
            }

            $members = [
                ['name' => 'Team Member', 'role' => 'Managing Director'],
                ['name' => 'Team Member', 'role' => 'Head of Immigration'],
                ['name' => 'Team Member', 'role' => 'Head of Mobility'],
            ];

            foreach ($members as $index => $member) {
                TeamMember::create([
                    ...$member,
                    'bio' => 'Placeholder bio — replace this copy and attach a photo from the admin before publishing.',
                    'sort_order' => $index + 1,
                    'status' => 'draft',
                ]);
            }
        });
    }
}
