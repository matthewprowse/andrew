<?php

namespace Tests\Feature;

use App\Models\EstimatorCity;
use App\Models\EstimatorRouteRate;
use App\Models\EstimatorService;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EstimatorPublicTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_the_estimator_is_hidden_from_the_public_and_requires_staff_login(): void
    {
        $this->get('/estimator')->assertRedirect('/login');
        $this->postJson('/estimator/calculate', [])->assertUnauthorized();
        $this->postJson('/estimator/access', ['email' => 'traveller@example.com'])->assertUnauthorized();

        $this->actingAs(User::factory()->create());
        $this->get('/estimator')->assertForbidden();

        $this->assertDatabaseCount('leads', 0);
    }

    public function test_estimator_page_only_lists_active_cities_and_services(): void
    {
        $this->staff();
        EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        EstimatorCity::create(['city' => 'Lagos', 'country' => 'Nigeria', 'continent' => 'Africa', 'status' => 'inactive']);
        EstimatorService::create(['category' => 'costs', 'name' => 'Flights', 'active' => true]);
        EstimatorService::create(['category' => 'costs', 'name' => 'Storage', 'active' => false]);

        $this->get('/estimator')->assertInertia(fn (Assert $page) => $page
            ->has('cities', 1)
            ->where('cities.0.city', 'Cape Town')
            ->has('services', 1)
            ->where('services.0.name', 'Flights'));
    }

    public function test_calculate_endpoint_returns_a_real_estimate(): void
    {
        $this->staff();
        $origin = EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $destination = EstimatorCity::create(['city' => 'Johannesburg', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $flights = EstimatorService::create(['category' => 'costs', 'name' => 'Flights', 'active' => true]);
        EstimatorRouteRate::create([
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'estimator_service_id' => $flights->id, 'economy_rate_usd' => 500, 'business_rate_usd' => 1000,
        ]);

        $response = $this->postJson('/estimator/calculate', [
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'people' => 2, 'tier' => 'Standard', 'selected' => ['Flights'],
            'bedrooms' => 1, 'weeks' => 1, 'container' => '20ft container', 'pets' => 0,
        ])->assertOk();

        $response->assertJsonPath('moveSubtotal', 1000);
        $response->assertJsonPath('groups.0.lines.0.amount', 1000);
    }

    public function test_calculate_endpoint_validates_input(): void
    {
        $this->staff();
        $this->postJson('/estimator/calculate', [])->assertUnprocessable();

        $origin = EstimatorCity::create(['city' => 'Cape Town', 'country' => 'South Africa', 'continent' => 'Africa', 'status' => 'active']);
        $this->postJson('/estimator/calculate', [
            'origin_city_id' => $origin->id, 'destination_city_id' => $origin->id,
            'people' => 1, 'tier' => 'Standard', 'selected' => ['Flights'],
            'bedrooms' => 1, 'weeks' => 1, 'container' => '20ft container', 'pets' => 0,
        ])->assertUnprocessable();
    }

    public function test_estimator_access_gate_still_only_captures_email(): void
    {
        $this->staff();
        $this->postJson('/estimator/access', ['email' => 'traveller@example.com'])->assertOk();

        $this->assertDatabaseHas('leads', ['type' => 'quote', 'email' => 'traveller@example.com']);
        $this->assertSame(1, Lead::count());
    }
}
