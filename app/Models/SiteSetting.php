<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property array<string, mixed> $site
 * @property list<array{id: string, label: string, link: string, section: string, parentId: string|null, sortOrder: int, childrenSource: string}> $menu
 * @property list<array{id: string, platform: string, url: string, sortOrder: int}> $social_links
 */
class SiteSetting extends Model
{
    protected $fillable = ['site', 'menu', 'social_links'];

    protected function casts(): array
    {
        return ['site' => 'array', 'menu' => 'array', 'social_links' => 'array'];
    }
}
