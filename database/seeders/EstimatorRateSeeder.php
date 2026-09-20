<?php

namespace Database\Seeders;

use App\Models\EstimatorCity;
use App\Models\EstimatorDestinationRate;
use App\Models\EstimatorRelocationServiceRate;
use App\Models\EstimatorRouteRate;
use App\Models\EstimatorService;
use App\Services\EstimatorCalculator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds placeholder starting rates for the currently-active cities only, using the same
 * distance/tier/deterministic-noise approach as the original client-side rate generator (ported once,
 * here, since removed — the real calculator reads stored rates, not derived ones).
 * These are placeholders for staff to review and overwrite, exactly like the mock data they replace.
 */
class EstimatorRateSeeder extends Seeder
{
    /** @var array<string, array{lat: float, lng: float, tier: float}> */
    private const COUNTRY_PROFILES = [
        'South Africa' => ['lat' => -26.2, 'lng' => 28.0, 'tier' => 1.0],
        'United States of America' => ['lat' => 40.7, 'lng' => -74.0, 'tier' => 1.6],
    ];

    private const DEFAULT_PROFILE = ['lat' => 0.0, 'lng' => 20.0, 'tier' => 1.0];

    private const DOMESTIC_DISTANCE_KM = 800.0;

    private const BUSINESS_MULTIPLIER = 1.55;

    private const BUSINESS_FLIGHT_MULTIPLIER = 3.6;

    /** @var array<string, int> */
    private const DESTINATION_BASE = [
        'Airport Transfer' => 85, 'Temporary Accommodation' => 3200, 'Storage' => 320,
    ];

    /** @var array<string, int> */
    private const RELOCATION_BASE = [
        'Pre-Departure Briefing' => 450, 'Home Search Program' => 2200, 'Area Orientation' => 780,
        'Education & Childcare' => 950, 'Settling-In Service' => 1150, 'Partner Support Program' => 1350,
        'Two Day Home Search' => 1450, 'Three Day Bundle Package' => 2650,
    ];

    public function run(): void
    {
        DB::transaction(function () {
            if (EstimatorDestinationRate::query()->exists() || EstimatorRouteRate::query()->exists() || EstimatorRelocationServiceRate::query()->exists()) {
                return;
            }

            $cities = EstimatorCity::active()->get();
            if ($cities->isEmpty()) {
                return;
            }

            foreach (EstimatorService::whereIn('name', array_keys(self::DESTINATION_BASE))->get() as $service) {
                foreach ($cities as $city) {
                    EstimatorDestinationRate::create([
                        'estimator_city_id' => $city->id,
                        'estimator_service_id' => $service->id,
                        'rate_usd' => $this->quote(self::DESTINATION_BASE[$service->name] * $this->tierFor($city->country), "{$city->city}|{$service->name}"),
                    ]);
                }
            }

            foreach (EstimatorService::whereIn('name', array_keys(self::RELOCATION_BASE))->get() as $service) {
                foreach ($cities as $city) {
                    EstimatorRelocationServiceRate::create([
                        'estimator_city_id' => $city->id,
                        'estimator_service_id' => $service->id,
                        'rate_usd' => $this->quote(self::RELOCATION_BASE[$service->name] * $this->tierFor($city->country), "{$city->city}|{$service->name}|relocation"),
                    ]);
                }
            }

            foreach (EstimatorService::whereIn('name', EstimatorCalculator::ROUTE_RATED_SERVICES)->get() as $service) {
                foreach ($cities as $origin) {
                    foreach ($cities as $destination) {
                        if ($origin->id === $destination->id) {
                            continue;
                        }

                        [$economy, $business] = $this->routeRate($service->name, $origin, $destination);
                        EstimatorRouteRate::create([
                            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
                            'estimator_service_id' => $service->id, 'economy_rate_usd' => $economy, 'business_rate_usd' => $business,
                        ]);
                    }
                }
            }
        });
    }

    /** @return array{float, float} */
    private function routeRate(string $service, EstimatorCity $origin, EstimatorCity $destination): array
    {
        $km = $this->distanceKm($origin, $destination);
        $tier = $this->tierFor($destination->country);
        $key = "{$service}|{$origin->city}|{$destination->city}";
        $businessMultiplier = self::BUSINESS_MULTIPLIER;

        $standard = match ($service) {
            'Flights' => (90 + $km * 0.11) * (0.85 + $tier * 0.15),
            'Household Goods Shipping' => (2200 + $km * 0.35) * $tier,
            'Pet Relocation' => (700 + $km * 0.12) * $tier,
            default => 500 * $tier,
        };

        if ($service === 'Flights') {
            $businessMultiplier = self::BUSINESS_FLIGHT_MULTIPLIER;
        }

        return [
            $this->quote($standard, $key),
            $this->quote($standard * $businessMultiplier, "{$key}|business"),
        ];
    }

    private function tierFor(string $country): float
    {
        return (self::COUNTRY_PROFILES[$country] ?? self::DEFAULT_PROFILE)['tier'];
    }

    private function distanceKm(EstimatorCity $origin, EstimatorCity $destination): float
    {
        if ($origin->country === $destination->country) {
            return $origin->city === $destination->city ? 0.0 : self::DOMESTIC_DISTANCE_KM;
        }

        $from = self::COUNTRY_PROFILES[$origin->country] ?? self::DEFAULT_PROFILE;
        $to = self::COUNTRY_PROFILES[$destination->country] ?? self::DEFAULT_PROFILE;

        $toRadians = fn (float $degrees) => $degrees * M_PI / 180;
        $deltaLat = $toRadians($to['lat'] - $from['lat']);
        $deltaLng = $toRadians($to['lng'] - $from['lng']);
        $haversine = sin($deltaLat / 2) ** 2
            + cos($toRadians($from['lat'])) * cos($toRadians($to['lat'])) * sin($deltaLng / 2) ** 2;

        return 2 * 6371 * asin(sqrt($haversine));
    }

    /** Stable pseudo-random value in [0, 1) for a key, ported from the FNV-1a hash in the original client-side rate generator. */
    private function noise(string $key): float
    {
        $hash = 0x811C9DC5;
        for ($i = 0, $len = strlen($key); $i < $len; $i++) {
            $hash ^= ord($key[$i]);
            $hash = ($hash * 16777619) & 0xFFFFFFFF;
        }

        return $hash / 4294967296;
    }

    private function quote(float $amount, string $key, float $spread = 0.12): float
    {
        $varied = $amount * (1 + ($this->noise($key) * 2 - 1) * $spread);
        if ($varied >= 1000) {
            return round($varied / 50) * 50;
        }
        if ($varied >= 100) {
            return round($varied / 10) * 10;
        }

        return max(5, round($varied / 5) * 5);
    }
}
