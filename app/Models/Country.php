<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Country extends Model
{
    protected $fillable = ['name', 'slug', 'region', 'description', 'sort_order', 'status'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer'];
    }

    /**
     * Only countries that are actually meant to be public today. Every row
     * created before CMS-04's status column existed defaults to
     * 'published' (see the additive migration), so this is a
     * behavior-preserving filter, not a behavior change.
     *
     * @return Builder<static>
     */
    public static function publiclyVisible(): Builder
    {
        return static::query()->where('status', 'published');
    }

    /** @return Builder<static> */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    /** @return array<string, mixed> */
    public function publicData(): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'region' => $this->region ?? '',
            'description' => $this->description ?? '',
            'sortOrder' => $this->sort_order,
        ];
    }

    /**
     * Admin-only view: includes status, which the public payload omits
     * because public consumers only ever see already-published countries.
     *
     * @return array<string, mixed>
     */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'region' => $this->region ?? '',
            'description' => $this->description ?? '',
            'sortOrder' => $this->sort_order,
            'status' => ucfirst($this->status),
        ];
    }
}
