<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstimatorDestinationRate extends Model
{
    protected $fillable = ['estimator_city_id', 'estimator_service_id', 'rate_usd'];

    protected function casts(): array
    {
        return ['rate_usd' => 'float'];
    }

    /** @return BelongsTo<EstimatorCity, $this> */
    public function city(): BelongsTo
    {
        return $this->belongsTo(EstimatorCity::class, 'estimator_city_id');
    }

    /** @return BelongsTo<EstimatorService, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(EstimatorService::class, 'estimator_service_id');
    }
}
