<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class EstimatorCity extends Model
{
    protected $fillable = ['city', 'country', 'continent', 'status', 'sort_order'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer'];
    }

    /** @return Builder<static> */
    public static function active(): Builder
    {
        return static::query()->where('status', 'active');
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'city' => $this->city,
            'country' => $this->country,
            'continent' => $this->continent,
            'status' => $this->status === 'active' ? 'Active' : 'Inactive',
            'sortOrder' => $this->sort_order,
        ];
    }

    /** @return array<string, mixed> */
    public function publicData(): array
    {
        return [
            'id' => (string) $this->id,
            'city' => $this->city,
            'country' => $this->country,
            'continent' => $this->continent,
        ];
    }
}
