<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Role::query()->each(function (Role $role): void {
            $permissions = $role->permissions ?? [];
            foreach ($permissions as $section => &$actions) {
                $actions['create'] ??= (bool) ($actions['edit'] ?? false);
                $actions['publish'] ??= false;
            }
            unset($actions);
            $role->forceFill(['permissions' => $permissions])->saveQuietly();
        });
    }

    public function down(): void
    {
        Role::query()->each(function (Role $role): void {
            $permissions = $role->permissions ?? [];
            foreach ($permissions as &$actions) {
                unset($actions['create'], $actions['publish']);
            }
            unset($actions);
            $role->forceFill(['permissions' => $permissions])->saveQuietly();
        });
    }
};
