<?php

namespace Tests\Feature;

use App\Models\EstimatorCity;
use App\Models\EstimatorDestinationRate;
use App\Models\EstimatorRelocationServiceRate;
use App\Models\EstimatorRouteRate;
use App\Models\EstimatorService;
use App\Models\EstimatorSettings;
use App\Services\EstimatorCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EstimatorCalculatorTest extends TestCase
{
    use RefreshDatabase;

    private EstimatorCity $origin;

    private EstimatorCity $destination;

    protected function setUp(): void
    {
        parent::setUp();
        $this->origin = EstimatorCity::create(['city' => 'Johannesburg', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $this->destination = EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
    }

    private function baseInput(array $overrides = []): array
    {
        return [...[
            'origin_city_id' => $this->origin->id,
            'destination_city_id' => $this->destination->id,
            'people' => 2,
            'tier' => 'Standard',
            'selected' => [],
            'bedrooms' => 1,
            'weeks' => 1,
            'container' => '20ft container',
            'pets' => 0,
            'visa_amount' => null,
        ], ...$overrides];
    }

    private function service(string $name, string $category = 'costs', array $overrides = []): EstimatorService
    {
        return EstimatorService::create([...[
            'category' => $category, 'name' => $name, 'active' => true, 'selected_by_default' => false,
        ], ...$overrides]);
    }

    public function test_flights_uses_economy_or_business_rate_by_tier_times_people(): void
    {
        $flights = $this->service('Flights');
        EstimatorRouteRate::create([
            'origin_city_id' => $this->origin->id, 'destination_city_id' => $this->destination->id,
            'estimator_service_id' => $flights->id, 'economy_rate_usd' => 800, 'business_rate_usd' => 1600,
        ]);

        $standard = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Flights'], 'tier' => 'Standard']));
        $this->assertSame(1600.0, $standard['groups'][0]['lines'][0]['amount']);

        $premium = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Flights'], 'tier' => 'Premium']));
        $this->assertSame(3200.0, $premium['groups'][0]['lines'][0]['amount']);
    }

    public function test_airport_transfer_gets_large_party_uplift(): void
    {
        $service = $this->service('Airport Transfer');
        EstimatorDestinationRate::create(['estimator_city_id' => $this->destination->id, 'estimator_service_id' => $service->id, 'rate_usd' => 200]);

        $small = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Airport Transfer'], 'people' => 3]));
        $this->assertSame(200.0, $small['groups'][0]['lines'][0]['amount']);

        $large = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Airport Transfer'], 'people' => 5]));
        $this->assertSame(250.0, $large['groups'][0]['lines'][0]['amount']);
    }

    public function test_temporary_accommodation_converts_monthly_rate_by_weeks_and_bedrooms(): void
    {
        $service = $this->service('Temporary Accommodation');
        EstimatorDestinationRate::create(['estimator_city_id' => $this->destination->id, 'estimator_service_id' => $service->id, 'rate_usd' => 433]);

        $result = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Temporary Accommodation'], 'weeks' => 2, 'bedrooms' => 1]));
        // 433 / 4.33 = 100/week * 2 weeks * bedroom factor 1 = 200
        $this->assertEqualsWithDelta(200.0, $result['groups'][0]['lines'][0]['amount'], 0.01);

        $twoBed = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Temporary Accommodation'], 'weeks' => 2, 'bedrooms' => 2]));
        // 100/week * 2 weeks * bedroom factor 1.35 = 270
        $this->assertEqualsWithDelta(270.0, $twoBed['groups'][0]['lines'][0]['amount'], 0.01);
    }

    public function test_household_goods_shipping_applies_container_factor(): void
    {
        $service = $this->service('Household Goods Shipping');
        EstimatorRouteRate::create([
            'origin_city_id' => $this->origin->id, 'destination_city_id' => $this->destination->id,
            'estimator_service_id' => $service->id, 'economy_rate_usd' => 1000, 'business_rate_usd' => 1000,
        ]);

        $small = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Household Goods Shipping'], 'container' => '20ft container']));
        $this->assertSame(1000.0, $small['groups'][0]['lines'][0]['amount']);

        $large = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Household Goods Shipping'], 'container' => '40ft container']));
        $this->assertSame(1750.0, $large['groups'][0]['lines'][0]['amount']);
    }

    public function test_transit_insurance_is_a_configurable_share_of_shipping(): void
    {
        $shipping = $this->service('Household Goods Shipping');
        EstimatorRouteRate::create([
            'origin_city_id' => $this->origin->id, 'destination_city_id' => $this->destination->id,
            'estimator_service_id' => $shipping->id, 'economy_rate_usd' => 1000, 'business_rate_usd' => 1000,
        ]);
        $this->service('Transit Insurance');
        EstimatorSettings::current()->update(['transit_insurance_share' => 0.2]);

        $result = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Household Goods Shipping', 'Transit Insurance'], 'container' => '20ft container']));

        $insuranceLine = collect($result['groups'][0]['lines'])->firstWhere('name', 'Transit Insurance');
        $this->assertSame(200.0, $insuranceLine['amount']);
    }

    public function test_storage_converts_monthly_rate_by_weeks(): void
    {
        $service = $this->service('Storage');
        EstimatorDestinationRate::create(['estimator_city_id' => $this->destination->id, 'estimator_service_id' => $service->id, 'rate_usd' => 433]);

        $result = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Storage'], 'weeks' => 3]));
        $this->assertEqualsWithDelta(300.0, $result['groups'][0]['lines'][0]['amount'], 0.01);
    }

    public function test_pet_relocation_is_null_when_no_pets_selected(): void
    {
        $service = $this->service('Pet Relocation');
        EstimatorRouteRate::create([
            'origin_city_id' => $this->origin->id, 'destination_city_id' => $this->destination->id,
            'estimator_service_id' => $service->id, 'economy_rate_usd' => 150, 'business_rate_usd' => 150,
        ]);

        $none = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Pet Relocation'], 'pets' => 0]));
        $this->assertNull($none['groups'][0]['lines'][0]['amount']);
        $this->assertSame(1, $none['unpriced']);

        $some = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Pet Relocation'], 'pets' => 3]));
        $this->assertSame(450.0, $some['groups'][0]['lines'][0]['amount']);
    }

    public function test_visas_is_a_manually_entered_amount_with_no_rate_lookup(): void
    {
        $this->service('Visas & Immigration');

        $withAmount = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Visas & Immigration'], 'visa_amount' => '950']));
        $this->assertSame(950.0, $withAmount['groups'][0]['lines'][0]['amount']);

        $withoutAmount = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Visas & Immigration'], 'visa_amount' => null]));
        $this->assertNull($withoutAmount['groups'][0]['lines'][0]['amount']);
    }

    public function test_destination_service_party_size_adjustment_uses_tiered_thresholds(): void
    {
        $service = $this->service('Test Consulting', 'services', [
            'tiered_pricing' => true, 'first_threshold' => 2, 'adjustment_above_threshold' => 10,
            'next_threshold' => 5, 'adjustment_above_next_threshold' => 30,
        ]);
        EstimatorRelocationServiceRate::create(['estimator_city_id' => $this->destination->id, 'estimator_service_id' => $service->id, 'rate_usd' => 200]);

        $noBump = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Test Consulting'], 'people' => 1]));
        $this->assertSame(200.0, $noBump['groups'][1]['lines'][0]['amount']);

        $firstBump = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Test Consulting'], 'people' => 3]));
        $this->assertEqualsWithDelta(220.0, $firstBump['groups'][1]['lines'][0]['amount'], 0.01);

        $secondBump = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Test Consulting'], 'people' => 6]));
        $this->assertEqualsWithDelta(260.0, $secondBump['groups'][1]['lines'][0]['amount'], 0.01);
    }

    public function test_contingency_vat_and_total_math(): void
    {
        EstimatorSettings::current()->update(['contingency_rate' => 0.10, 'vat_rate' => 0.15]);
        $flights = $this->service('Flights');
        EstimatorRouteRate::create([
            'origin_city_id' => $this->origin->id, 'destination_city_id' => $this->destination->id,
            'estimator_service_id' => $flights->id, 'economy_rate_usd' => 500, 'business_rate_usd' => 500,
        ]);
        $consulting = $this->service('Consulting', 'services');
        EstimatorRelocationServiceRate::create(['estimator_city_id' => $this->destination->id, 'estimator_service_id' => $consulting->id, 'rate_usd' => 200]);

        $result = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Flights', 'Consulting'], 'people' => 2]));

        // moveSubtotal = 500 * 2 = 1000; servicesSubtotal = 200
        $this->assertSame(1000.0, $result['moveSubtotal']);
        $this->assertSame(200.0, $result['servicesSubtotal']);
        $this->assertSame(100.0, $result['contingency']); // 10% of move subtotal only
        $this->assertEqualsWithDelta(195.0, $result['vat'], 0.01); // 15% of (1000+200+100)
        $this->assertEqualsWithDelta(1495.0, $result['total'], 0.01);
        $this->assertSame(0, $result['unpriced']);
    }

    public function test_missing_rate_renders_as_unpriced_and_excluded_from_totals(): void
    {
        $this->service('Flights');

        $result = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Flights']]));

        $this->assertNull($result['groups'][0]['lines'][0]['amount']);
        $this->assertSame(0.0, $result['moveSubtotal']);
        $this->assertSame(1, $result['unpriced']);
    }

    public function test_inactive_or_unselected_services_are_excluded(): void
    {
        $active = $this->service('Flights', 'costs', ['active' => true]);
        EstimatorRouteRate::create([
            'origin_city_id' => $this->origin->id, 'destination_city_id' => $this->destination->id,
            'estimator_service_id' => $active->id, 'economy_rate_usd' => 500, 'business_rate_usd' => 500,
        ]);
        $inactive = $this->service('Storage', 'costs', ['active' => false]);
        EstimatorDestinationRate::create(['estimator_city_id' => $this->destination->id, 'estimator_service_id' => $inactive->id, 'rate_usd' => 100]);

        $result = (new EstimatorCalculator)->calculate($this->baseInput(['selected' => ['Flights', 'Storage'], 'people' => 1]));

        $this->assertCount(1, $result['groups'][0]['lines']);
        $this->assertSame('Flights', $result['groups'][0]['lines'][0]['name']);
    }
}
