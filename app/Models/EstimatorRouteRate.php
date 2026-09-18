<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstimatorRouteRate extends Model
{
    protected $fillable = ['origin_city_id', 'destination_city_id', 'estimator_service_id', 'economy_rate_usd', 'business_rate_usd'];

    protected function casts(): array
    {
        return ['economy_rate_usd' => 'float', 'business_rate_usd' => 'float'];
    }

    /** @return BelongsTo<EstimatorCity, $this> */
    public function origin(): BelongsTo
    {
        return $this->belongsTo(EstimatorCity::class, 'origin_city_id');
    }

    /** @return BelongsTo<EstimatorCity, $this> */
    public function destination(): BelongsTo
    {
        return $this->belongsTo(EstimatorCity::class, 'destination_city_id');
    }

    /** @return BelongsTo<EstimatorService, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(EstimatorService::class, 'estimator_service_id');
    }
}
