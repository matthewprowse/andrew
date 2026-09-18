<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class EstimatorService extends Model
{
    protected $fillable = [
        'category', 'name', 'description', 'selected_by_default', 'active',
        'tiered_pricing', 'first_threshold', 'adjustment_above_threshold',
        'next_threshold', 'adjustment_above_next_threshold', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'selected_by_default' => 'boolean',
            'active' => 'boolean',
            'tiered_pricing' => 'boolean',
            'first_threshold' => 'integer',
            'adjustment_above_threshold' => 'float',
            'next_threshold' => 'integer',
            'adjustment_above_next_threshold' => 'float',
            'sort_order' => 'integer',
        ];
    }

    /** @return Builder<static> */
    public static function active(): Builder
    {
        return static::query()->where('active', true);
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'category' => $this->category === 'costs' ? 'Costs' : 'Services',
            'name' => $this->name,
            'description' => $this->description ?? '',
            'selectedByDefault' => $this->selected_by_default,
            'active' => $this->active,
            'tieredPricing' => $this->tiered_pricing,
            'firstThreshold' => $this->first_threshold,
            'adjustmentAboveThreshold' => $this->adjustment_above_threshold,
            'nextThreshold' => $this->next_threshold,
            'adjustmentAboveNextThreshold' => $this->adjustment_above_next_threshold,
            'sortOrder' => $this->sort_order,
        ];
    }

    /** @return array<string, mixed> */
    public function publicData(): array
    {
        return [
            'id' => (string) $this->id,
            'category' => $this->category,
            'name' => $this->name,
            'description' => $this->description ?? '',
            'selectedByDefault' => $this->selected_by_default,
        ];
    }
}
