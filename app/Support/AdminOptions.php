<?php

namespace App\Support;

use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Collection;

final class AdminOptions
{
    /** @return Collection<int, array{id: string, name: string}> */
    public static function services(): Collection
    {
        return Service::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name'])
            ->map(fn (Service $service): array => [
                'id' => (string) $service->id,
                'name' => $service->name,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    public static function roles(): Collection
    {
        return Role::query()->orderBy('name')->get()->map(
            fn (Role $role): array => $role->adminData(),
        );
    }

    /** @return Collection<int, array<string, mixed>> */
    public static function users(): Collection
    {
        return User::query()->with('role')->orderBy('name')->get()->map(
            fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roleId' => $user->role_id,
                'roleName' => $user->role?->name,
                'isRootAdmin' => $user->isRootAdmin(),
            ],
        );
    }
}
