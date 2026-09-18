<?php

namespace Tests\Feature;

use App\Models\EstimatorCity;
use App\Models\EstimatorRouteRate;
use App\Models\EstimatorService;
use App\Models\EstimatorSettings;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EstimatorAdminTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_staff_can_manage_services(): void
    {
        $this->staff();

        $this->post('/admin/estimator/services-pricing', [
            'category' => 'Costs', 'name' => 'New Item', 'selectedByDefault' => false,
            'active' => true, 'sortOrder' => 1,
        ])->assertRedirect('/admin/estimator/services-pricing');

        $service = EstimatorService::where('name', 'New Item')->firstOrFail();
        $this->assertSame('costs', $service->category);

        $this->patch("/admin/estimator/services-pricing/{$service->id}", [
            'category' => 'Costs', 'name' => 'Renamed Item', 'active' => false, 'sortOrder' => 1,
        ])->assertRedirect('/admin/estimator/services-pricing');
        $this->assertFalse($service->fresh()->active);

        $this->get('/admin/estimator/services-pricing')->assertInertia(fn (Assert $page) => $page
            ->has('services', 1)
            ->where('services.0.name', 'Renamed Item'));
    }

    public function test_staff_can_manage_cities(): void
    {
        $this->staff();

        $this->post('/admin/estimator/cities', [
            'city' => 'Nairobi', 'country' => 'Kenya', 'continent' => 'Africa', 'status' => 'Active', 'sortOrder' => 1,
        ])->assertRedirect('/admin/estimator/cities');

        $city = EstimatorCity::where('city', 'Nairobi')->firstOrFail();
        $this->assertSame('active', $city->status);

        $this->get('/admin/estimator/cities')->assertInertia(fn (Assert $page) => $page->has('cities', 1));
    }

    public function test_staff_can_save_destination_costs(): void
    {
        $this->staff();
        $city = EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $service = EstimatorService::create(['category' => 'costs', 'name' => 'Storage', 'active' => true]);

        $this->put('/admin/estimator/destination-costs', [
            'rates' => [['cityId' => $city->id, 'serviceId' => $service->id, 'rate' => 250]],
        ])->assertRedirect('/admin/estimator/destination-costs');

        $this->assertDatabaseHas('estimator_destination_rates', [
            'estimator_city_id' => $city->id, 'estimator_service_id' => $service->id, 'rate_usd' => 250,
        ]);

        $this->get('/admin/estimator/destination-costs')->assertInertia(fn (Assert $page) => $page
            ->has('rates', 1)
            ->where('rates.0.rate', 250));
    }

    public function test_staff_can_save_intra_location_costs(): void
    {
        $this->staff();
        $origin = EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $destination = EstimatorCity::create(['city' => 'Johannesburg', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $service = EstimatorService::create(['category' => 'costs', 'name' => 'Flights', 'active' => true]);

        $this->put('/admin/estimator/intra-location-costs', [
            'rates' => [[
                'originCityId' => $origin->id, 'destinationCityId' => $destination->id,
                'serviceId' => $service->id, 'economyRate' => 150, 'businessRate' => 600,
            ]],
        ])->assertRedirect('/admin/estimator/intra-location-costs');

        $this->assertDatabaseHas('estimator_route_rates', [
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'estimator_service_id' => $service->id, 'economy_rate_usd' => 150, 'business_rate_usd' => 600,
        ]);
    }

    public function test_staff_can_save_city_service_rates(): void
    {
        $this->staff();
        $city = EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $service = EstimatorService::create(['category' => 'services', 'name' => 'Area Orientation', 'active' => true]);

        $this->put('/admin/estimator/city-service-rates', [
            'rates' => [['cityId' => $city->id, 'serviceId' => $service->id, 'rate' => 780]],
        ])->assertRedirect('/admin/estimator/city-service-rates');

        $this->assertDatabaseHas('estimator_relocation_service_rates', [
            'estimator_city_id' => $city->id, 'estimator_service_id' => $service->id, 'rate_usd' => 780,
        ]);
    }

    public function test_staff_can_update_settings(): void
    {
        $this->staff();

        $this->put('/admin/estimator/overview', [
            'currency' => 'USD', 'vatRate' => 0.2, 'contingencyRate' => 0.15, 'transitInsuranceShare' => 0.12, 'validityDays' => 30,
        ])->assertRedirect('/admin/estimator/overview');

        $settings = EstimatorSettings::current();
        $this->assertSame(0.2, $settings->vat_rate);
        $this->assertSame(30, $settings->validity_days);
    }

    public function test_overview_reports_real_counts(): void
    {
        $this->staff();
        EstimatorService::create(['category' => 'costs', 'name' => 'Flights', 'active' => true]);
        EstimatorService::create(['category' => 'costs', 'name' => 'Storage', 'active' => false]);
        $origin = EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $destination = EstimatorCity::create(['city' => 'Johannesburg', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        EstimatorCity::create(['city' => 'Lagos', 'country' => 'Nigeria', 'continent' => 'Africa', 'status' => 'inactive']);
        EstimatorRouteRate::create([
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'estimator_service_id' => EstimatorService::first()->id, 'economy_rate_usd' => 100,
        ]);

        $this->get('/admin/estimator/overview')->assertInertia(fn (Assert $page) => $page
            ->where('stats.activeServices', 1)
            ->where('stats.activeCities', 2)
            ->where('stats.inactiveCities', 1)
            ->where('stats.pricedRoutes', 1));
    }

    public function test_estimator_admin_requires_staff(): void
    {
        $this->get('/admin/estimator/services-pricing')->assertRedirect('/login');
        $this->get('/admin/estimator/cities')->assertRedirect('/login');
        $this->get('/admin/estimator/destination-costs')->assertRedirect('/login');
        $this->get('/admin/estimator/overview')->assertRedirect('/login');

        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->get('/admin/estimator/services-pricing')->assertForbidden();
    }

    public function test_destination_rate_cannot_be_negative(): void
    {
        $this->staff();
        $city = EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $service = EstimatorService::create(['category' => 'costs', 'name' => 'Storage', 'active' => true]);

        $this->putJson('/admin/estimator/destination-costs', [
            'rates' => [['cityId' => $city->id, 'serviceId' => $service->id, 'rate' => -50]],
        ])->assertUnprocessable();
        $this->assertDatabaseMissing('estimator_destination_rates', ['estimator_city_id' => $city->id]);
    }
}
