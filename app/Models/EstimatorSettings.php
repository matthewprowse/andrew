<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EstimatorSettings extends Model
{
    protected $table = 'estimator_settings';

    protected $fillable = ['currency', 'vat_rate', 'contingency_rate', 'transit_insurance_share', 'validity_days'];

    protected function casts(): array
    {
        return [
            'vat_rate' => 'float',
            'contingency_rate' => 'float',
            'transit_insurance_share' => 'float',
            'validity_days' => 'integer',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'currency' => $this->currency,
            'vatRate' => $this->vat_rate,
            'contingencyRate' => $this->contingency_rate,
            'transitInsuranceShare' => $this->transit_insurance_share,
            'validityDays' => $this->validity_days,
        ];
    }
}
