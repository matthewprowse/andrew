<?php

namespace App\Http\Controllers;

use App\Models\EstimatorCity;
use App\Models\EstimatorDestinationRate;
use App\Models\EstimatorRelocationServiceRate;
use App\Models\EstimatorRouteRate;
use App\Models\EstimatorService;
use App\Services\EstimatorCalculator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection as SupportCollection;
use Inertia\Inertia;
use Inertia\Response;

class EstimatorRateController extends Controller
{
    public function destinationCosts(): Response
    {
        $services = EstimatorService::active()->whereIn('name', EstimatorCalculator::DESTINATION_RATED_SERVICES)
            ->orderBy('sort_order')->get(['id', 'name']);

        return $this->singleRatePage('admin/estimator/destination-costs', $services, EstimatorDestinationRate::class);
    }

    public function updateDestinationCosts(Request $request): RedirectResponse
    {
        $this->saveSingleRates($request, EstimatorDestinationRate::class);

        return to_route('admin.estimator.destination-costs');
    }

    public function intraLocationCosts(): Response
    {
        $services = EstimatorService::active()->whereIn('name', EstimatorCalculator::ROUTE_RATED_SERVICES)
            ->orderBy('sort_order')->get(['id', 'name']);
        $cities = $this->activeCities();

        $rates = EstimatorRouteRate::whereIn('estimator_service_id', $services->pluck('id'))
            ->whereIn('origin_city_id', $cities->pluck('id'))->whereIn('destination_city_id', $cities->pluck('id'))->get()
            ->map(fn (EstimatorRouteRate $rate) => [
                'originCityId' => (string) $rate->origin_city_id,
                'destinationCityId' => (string) $rate->destination_city_id,
                'serviceId' => (string) $rate->estimator_service_id,
                'economyRate' => $rate->economy_rate_usd,
                'businessRate' => $rate->business_rate_usd,
            ]);

        return Inertia::render('admin/estimator/intra-location-costs', [
            'services' => $this->serviceOptions($services),
            'cities' => $this->cityOptions($cities),
            'rates' => $rates,
        ]);
    }

    public function updateIntraLocationCosts(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'rates' => ['required', 'array'],
            'rates.*.originCityId' => ['required', 'integer', 'exists:estimator_cities,id'],
            'rates.*.destinationCityId' => ['required', 'integer', 'exists:estimator_cities,id', 'different:rates.*.originCityId'],
            'rates.*.serviceId' => ['required', 'integer', 'exists:estimator_services,id'],
            'rates.*.economyRate' => ['nullable', 'numeric', 'min:0'],
            'rates.*.businessRate' => ['nullable', 'numeric', 'min:0'],
        ]);

        foreach ($data['rates'] as $row) {
            EstimatorRouteRate::updateOrCreate(
                ['origin_city_id' => $row['originCityId'], 'destination_city_id' => $row['destinationCityId'], 'estimator_service_id' => $row['serviceId']],
                ['economy_rate_usd' => $row['economyRate'], 'business_rate_usd' => $row['businessRate']],
            );
        }

        return to_route('admin.estimator.intra-location-costs');
    }

    public function cityServiceRates(): Response
    {
        $services = EstimatorService::active()->where('category', 'services')->orderBy('sort_order')->get(['id', 'name']);

        return $this->singleRatePage('admin/estimator/city-service-rates', $services, EstimatorRelocationServiceRate::class);
    }

    public function updateCityServiceRates(Request $request): RedirectResponse
    {
        $this->saveSingleRates($request, EstimatorRelocationServiceRate::class);

        return to_route('admin.estimator.city-service-rates');
    }

    /**
     * Destination costs and city service rates share one shape: a single rate per city and service.
     *
     * @param  Collection<int, EstimatorService>  $services
     * @param  class-string<EstimatorDestinationRate|EstimatorRelocationServiceRate>  $model
     */
    private function singleRatePage(string $page, Collection $services, string $model): Response
    {
        $cities = $this->activeCities();

        $rates = $model::whereIn('estimator_service_id', $services->pluck('id'))
            ->whereIn('estimator_city_id', $cities->pluck('id'))->get()
            ->map(fn (EstimatorDestinationRate|EstimatorRelocationServiceRate $rate) => [
                'cityId' => (string) $rate->estimator_city_id,
                'serviceId' => (string) $rate->estimator_service_id,
                'rate' => $rate->rate_usd,
            ]);

        return Inertia::render($page, [
            'services' => $this->serviceOptions($services),
            'cities' => $this->cityOptions($cities),
            'rates' => $rates,
        ]);
    }

    /** @param  class-string<EstimatorDestinationRate|EstimatorRelocationServiceRate>  $model */
    private function saveSingleRates(Request $request, string $model): void
    {
        $data = $request->validate([
            'rates' => ['required', 'array'],
            'rates.*.cityId' => ['required', 'integer', 'exists:estimator_cities,id'],
            'rates.*.serviceId' => ['required', 'integer', 'exists:estimator_services,id'],
            'rates.*.rate' => ['nullable', 'numeric', 'min:0'],
        ]);

        foreach ($data['rates'] as $row) {
            $model::updateOrCreate(
                ['estimator_city_id' => $row['cityId'], 'estimator_service_id' => $row['serviceId']],
                ['rate_usd' => $row['rate']],
            );
        }
    }

    /**
     * @param  Collection<int, EstimatorService>  $services
     * @return SupportCollection<int, array{id: decimal-int-string, name: string}>
     */
    private function serviceOptions(Collection $services): SupportCollection
    {
        return $services->map(fn (EstimatorService $s) => ['id' => (string) $s->id, 'name' => $s->name]);
    }

    /**
     * @param  Collection<int, EstimatorCity>  $cities
     * @return SupportCollection<int, array{id: decimal-int-string, city: string, country: string}>
     */
    private function cityOptions(Collection $cities): SupportCollection
    {
        return $cities->map(fn (EstimatorCity $c) => ['id' => (string) $c->id, 'city' => $c->city, 'country' => $c->country]);
    }

    /** @return Collection<int, EstimatorCity> */
    private function activeCities(): Collection
    {
        return EstimatorCity::active()->ordered()->get(['id', 'city', 'country']);
    }
}
