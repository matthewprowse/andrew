<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $fillable = ['office_name', 'address', 'phone', 'email', 'sort_order', 'status', 'is_primary'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'is_primary' => 'boolean'];
    }

    /**
     * Only offices that are actually meant to be public today. Every row
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

    /** @return array<string, string|int> */
    public function publicData(): array
    {
        return ['id' => (string) $this->id, 'officeName' => $this->office_name, 'address' => $this->address,
            'phone' => $this->phone ?? '', 'email' => $this->email ?? '', 'sortOrder' => $this->sort_order];
    }

    /**
     * Admin-only view of a record: includes status and the primary-office
     * flag, neither of which the public payload needs (public consumers only
     * ever see already-published offices, and "primary" is an admin
     * management concept, not something the public templates render
     * differently today).
     *
     * @return array<string, mixed>
     */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'officeName' => $this->office_name,
            'address' => $this->address,
            'phone' => $this->phone ?? '',
            'email' => $this->email ?? '',
            'sortOrder' => $this->sort_order,
            'status' => ucfirst($this->status),
            'isPrimary' => $this->is_primary,
        ];
    }
}
