<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A custom, admin-defined permission set. Deliberately not a fixed enum of
 * named tiers (Super Admin/Admin/Content Creator/...) — Matthew asked for
 * roles to be created and configured through the admin UI itself, per
 * section, rather than hardcoded ahead of Andrew's exact permission list.
 *
 * @property array<string, array<string, bool>> $permissions
 */
class Role extends Model
{
    protected $fillable = ['name', 'description', 'permissions'];

    protected function casts(): array
    {
        return ['permissions' => 'array'];
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function can(string $section, string $action): bool
    {
        if (array_key_exists($action, $this->permissions[$section] ?? [])) {
            return (bool) $this->permissions[$section][$action];
        }

        // Roles created before capability expansion treated edit as both
        // create and update. Preserve that behavior until the role is next
        // saved through the role editor, without granting new capabilities.
        return $action === 'create' && (bool) ($this->permissions[$section]['edit'] ?? false);
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description ?? '',
            'permissions' => collect(config('admin.sections', []))->keys()->mapWithKeys(function (string $section): array {
                $stored = $this->permissions[$section] ?? [];
                $actions = [];
                foreach (array_keys(config('admin.actions', [])) as $action) {
                    $actions[$action] = array_key_exists($action, $stored)
                        ? (bool) $stored[$action]
                        : ($action === 'create' && (bool) ($stored['edit'] ?? false));
                }

                return [$section => $actions];
            })->all(),
            'userCount' => $this->users()->count(),
        ];
    }
}
