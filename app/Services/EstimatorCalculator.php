<?php

namespace App\Services;

use App\Models\EstimatorDestinationRate;
use App\Models\EstimatorRelocationServiceRate;
use App\Models\EstimatorRouteRate;
use App\Models\EstimatorService;
use App\Models\EstimatorSettings;

/**
 * Faithful PHP port of resources/js/lib/estimator-pricing.ts's buildEstimate, reading rates from
 * the database instead of the placeholder generator, and reading VAT/contingency/insurance-share
 * from EstimatorSettings instead of hardcoded constants. Keep this in lockstep with the TS file if
 * either ever changes — they must produce identical figures for identical rates.
 */
class EstimatorCalculator
{
    /** Cost services priced by the route (origin matters) rather than by destination alone. */
    private const ROUTE_PRICED = ['Flights', 'Household Goods Shipping', 'Transit Insurance', 'Pet Relocation'];

    /** Cost services that actually read a route rate table — Transit Insurance is derived, not looked up. */
    public const ROUTE_RATED_SERVICES = ['Flights', 'Household Goods Shipping', 'Pet Relocation'];

    /** Cost services priced by a flat per-destination-city rate. */
    public const DESTINATION_RATED_SERVICES = ['Airport Transfer', 'Temporary Accommodation', 'Storage'];

    private const CONTAINER_FACTOR = ['20ft container' => 1.0, '40ft container' => 1.75];

    private const BEDROOM_FACTOR = [1 => 1.0, 2 => 1.35, 3 => 1.7, 4 => 2.0];

    private const WEEKS_PER_MONTH = 4.33;

    private const LARGE_PARTY_SIZE = 4;

    private const LARGE_PARTY_TRANSFER_UPLIFT = 1.25;

    private EstimatorSettings $settings;

    public function __construct()
    {
        $this->settings = EstimatorSettings::current();
    }

    /** @param  array<string, mixed>  $input
     * @return array<string, mixed> */
    public function calculate(array $input): array
    {
        $chosen = $input['selected'];

        $moveServices = $this->selectedServices('costs', $chosen);
        $destinationServices = $this->selectedServices('services', $chosen);

        $moveLines = $moveServices->map(fn (EstimatorService $service) => $this->moveCostLine($service, $input))->values();
        $serviceLines = $destinationServices->map(fn (EstimatorService $service) => $this->destinationServiceLine($service, $input))->values();

        $sum = fn ($lines) => $lines->reduce(fn ($total, $line) => $total + ($line['amount'] ?? 0), 0.0);

        $moveSubtotal = $sum($moveLines);
        $servicesSubtotal = $sum($serviceLines);
        $contingency = $moveSubtotal * $this->settings->contingency_rate;
        $vat = ($moveSubtotal + $servicesSubtotal + $contingency) * $this->settings->vat_rate;

        $allLines = $moveLines->concat($serviceLines);

        return [
            'groups' => [
                ['title' => 'Relocation Costs', 'lines' => $moveLines->values()->all()],
                ['title' => 'Destination Services', 'lines' => $serviceLines->values()->all()],
            ],
            'moveSubtotal' => $moveSubtotal,
            'servicesSubtotal' => $servicesSubtotal,
            'contingency' => $contingency,
            'vat' => $vat,
            'total' => $moveSubtotal + $servicesSubtotal + $contingency + $vat,
            'unpriced' => $allLines->filter(fn ($line) => $line['amount'] === null)->count(),
            'currency' => $this->settings->currency,
        ];
    }

    /** @param  array<string, mixed>  $input
     * @return array{name: string, detail: string, amount: float|null} */
    private function moveCostLine(EstimatorService $service, array $input): array
    {
        $name = $service->name;
        $weekly = fn (float $monthly) => $monthly / self::WEEKS_PER_MONTH;

        switch ($name) {
            case 'Flights':
                $base = $this->routeAmount($name, $input);

                return [
                    'name' => $name,
                    'detail' => $input['people'].' × '.($input['tier'] === 'Premium' ? 'business' : 'economy'),
                    'amount' => $base === null ? null : $base * $input['people'],
                ];

            case 'Airport Transfer':
                $base = $this->destinationAmount($name, $input);
                $uplift = $input['people'] > self::LARGE_PARTY_SIZE ? self::LARGE_PARTY_TRANSFER_UPLIFT : 1.0;

                return [
                    'name' => $name,
                    'detail' => $input['people'] > self::LARGE_PARTY_SIZE ? 'Larger vehicle for the party' : 'On arrival',
                    'amount' => $base === null ? null : $base * $uplift,
                ];

            case 'Temporary Accommodation':
                $base = $this->destinationAmount($name, $input);
                $bedrooms = self::BEDROOM_FACTOR[$input['bedrooms']] ?? 1.0;

                return [
                    'name' => $name,
                    'detail' => $input['bedrooms'].' bedroom'.($input['bedrooms'] > 1 ? 's' : '').', '.$input['weeks'].' weeks',
                    'amount' => $base === null ? null : $weekly($base) * $input['weeks'] * $bedrooms,
                ];

            case 'Household Goods Shipping':
                return [
                    'name' => $name,
                    'detail' => $input['container'],
                    'amount' => $this->shippingAmount($input),
                ];

            case 'Transit Insurance':
                $shipping = $this->shippingAmount($input);

                return [
                    'name' => $name,
                    'detail' => round($this->settings->transit_insurance_share * 100).'% of household goods shipping',
                    'amount' => $shipping === null ? null : $shipping * $this->settings->transit_insurance_share,
                ];

            case 'Storage':
                $base = $this->destinationAmount($name, $input);

                return [
                    'name' => $name,
                    'detail' => $input['weeks'].' weeks, following temporary accommodation',
                    'amount' => $base === null ? null : $weekly($base) * $input['weeks'],
                ];

            case 'Pet Relocation':
                $base = $this->routeAmount($name, $input);

                return [
                    'name' => $name,
                    'detail' => $input['pets'].' pet'.($input['pets'] === 1 ? '' : 's'),
                    'amount' => ($base === null || $input['pets'] < 1) ? null : $base * $input['pets'],
                ];

            case 'Visas & Immigration':
                return [
                    'name' => $name,
                    'detail' => 'Approved Amount',
                    'amount' => $this->toAmount($input['visa_amount'] ?? null),
                ];

            default:
                $base = in_array($name, self::ROUTE_PRICED, true)
                    ? $this->routeAmount($name, $input)
                    : $this->destinationAmount($name, $input);

                return ['name' => $name, 'detail' => $service->description ?? '', 'amount' => $base];
        }
    }

    /** @param  array<string, mixed>  $input
     * @return array{name: string, detail: string, amount: float|null} */
    private function destinationServiceLine(EstimatorService $service, array $input): array
    {
        $base = $this->relocationServiceAmount($service, $input);
        $adjustment = $this->partySizeAdjustment($service, $input['people']);

        return [
            'name' => $service->name,
            'detail' => $adjustment === 1.0
                ? ($service->description ?: 'Per assignment')
                : ($service->description ?: 'Per assignment').' · +'.round(($adjustment - 1) * 100).'% for party size',
            'amount' => $base === null ? null : $base * $adjustment,
        ];
    }

    public function partySizeAdjustment(EstimatorService $service, int $people): float
    {
        if (! $service->tiered_pricing) {
            return 1.0;
        }
        if ($service->next_threshold > 0 && $people > $service->next_threshold) {
            return 1 + $service->adjustment_above_next_threshold / 100;
        }
        if ($service->first_threshold > 0 && $people > $service->first_threshold) {
            return 1 + $service->adjustment_above_threshold / 100;
        }

        return 1.0;
    }

    /** @param  array<string, mixed>  $input */
    private function routeAmount(string $serviceName, array $input): ?float
    {
        $service = $this->serviceByName($serviceName);
        if (! $service) {
            return null;
        }

        $rate = EstimatorRouteRate::where('origin_city_id', $input['origin_city_id'])
            ->where('destination_city_id', $input['destination_city_id'])
            ->where('estimator_service_id', $service->id)
            ->first();

        if (! $rate) {
            return null;
        }

        return $input['tier'] === 'Premium' ? $rate->business_rate_usd : $rate->economy_rate_usd;
    }

    /** @param  array<string, mixed>  $input */
    private function destinationAmount(string $serviceName, array $input): ?float
    {
        $service = $this->serviceByName($serviceName);
        if (! $service) {
            return null;
        }

        $rate = EstimatorDestinationRate::where('estimator_city_id', $input['destination_city_id'])
            ->where('estimator_service_id', $service->id)
            ->first();

        return $rate?->rate_usd;
    }

    /** @param  array<string, mixed>  $input */
    private function relocationServiceAmount(EstimatorService $service, array $input): ?float
    {
        $rate = EstimatorRelocationServiceRate::where('estimator_city_id', $input['destination_city_id'])
            ->where('estimator_service_id', $service->id)
            ->first();

        return $rate?->rate_usd;
    }

    /** @param  array<string, mixed>  $input */
    private function shippingAmount(array $input): ?float
    {
        $base = $this->routeAmount('Household Goods Shipping', $input);
        if ($base === null) {
            return null;
        }

        return $base * (self::CONTAINER_FACTOR[$input['container']] ?? 1.0);
    }

    private function toAmount(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }

    /** @param array<int, string> $chosen */
    private function selectedServices(string $category, array $chosen)
    {
        return EstimatorService::active()->where('category', $category)
            ->orderBy('sort_order')->get()
            ->filter(fn (EstimatorService $service) => in_array($service->name, $chosen, true));
    }

    private function serviceByName(string $name): ?EstimatorService
    {
        return EstimatorService::where('name', $name)->first();
    }
}
