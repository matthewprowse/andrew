<?php

namespace Tests\Feature;

use App\Models\AnalyticsEvent;
use App\Models\Media;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Models\Service;
use App\Services\GeoIpResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AnalyticsEventTest extends TestCase
{
    use RefreshDatabase;

    public function test_visiting_a_public_page_records_a_page_view(): void
    {
        $this->get('/');

        $this->assertDatabaseHas('analytics_events', ['event_type' => 'page_view', 'path' => '/']);
    }

    public function test_visiting_a_published_service_page_tags_the_event_with_its_service(): void
    {
        $service = Service::create(['name' => 'Mobility', 'headline' => 'x', 'slug' => 'mobility', 'intro' => 'x', 'status' => 'published', 'sort_order' => 1]);

        $this->get('/services/mobility');

        $this->assertDatabaseHas('analytics_events', ['event_type' => 'page_view', 'path' => '/services/mobility', 'service_id' => $service->id]);
    }

    public function test_admin_and_estimator_routes_are_never_tracked(): void
    {
        $this->get('/admin');
        $this->get('/estimator');

        $this->assertDatabaseCount('analytics_events', 0);
    }

    public function test_do_not_track_header_suppresses_recording(): void
    {
        $this->withHeaders(['DNT' => '1'])->get('/');

        $this->assertDatabaseCount('analytics_events', 0);
    }

    public function test_known_bot_user_agents_are_not_recorded(): void
    {
        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'])->get('/');
        $this->withHeaders(['User-Agent' => 'python-requests/2.31'])->get('/');

        $this->assertDatabaseCount('analytics_events', 0);
    }

    public function test_redirects_and_non_document_endpoints_are_not_recorded(): void
    {
        $this->get('/careers');
        $this->get('/robots.txt');

        $this->assertDatabaseCount('analytics_events', 0);
    }

    public function test_ip_address_is_stored_and_geography_is_resolved_from_it(): void
    {
        $this->mock(GeoIpResolver::class)
            ->shouldReceive('resolve')->once()->with('127.0.0.1')
            ->andReturn(['country' => 'South Africa', 'city' => 'Cape Town', 'postalCode' => '8001']);

        $this->get('/');

        $event = AnalyticsEvent::sole();
        $this->assertSame('127.0.0.1', $event->ip_address);
        $this->assertSame('South Africa', $event->country);
        $this->assertSame('Cape Town', $event->city);
    }

    public function test_no_precise_location_or_device_fingerprint_is_ever_stored(): void
    {
        $this->get('/');

        $event = AnalyticsEvent::sole();
        $this->assertArrayNotHasKey('latitude', $event->getAttributes());
        $this->assertArrayNotHasKey('longitude', $event->getAttributes());
    }

    public function test_cta_click_beacon_records_a_validated_event(): void
    {
        $service = Service::create(['name' => 'Mobility', 'headline' => 'x', 'slug' => 'mobility', 'intro' => 'x', 'status' => 'published', 'sort_order' => 1]);

        $this->postJson('/analytics/event', [
            'event_type' => 'cta_click', 'path' => '/mobility', 'label' => 'Talk to our team', 'service_id' => $service->id,
        ])->assertOk();

        $this->assertDatabaseHas('analytics_events', ['event_type' => 'cta_click', 'label' => 'Talk to our team', 'service_id' => $service->id]);
    }

    public function test_beacon_rejects_an_unknown_event_type(): void
    {
        $this->postJson('/analytics/event', ['event_type' => 'something_else'])->assertUnprocessable();
        $this->assertDatabaseCount('analytics_events', 0);
    }

    public function test_beacon_rejects_a_nonexistent_resource_or_service_id(): void
    {
        $this->postJson('/analytics/event', ['event_type' => 'cta_click', 'label' => 'Test CTA', 'service_id' => 999])
            ->assertUnprocessable()->assertJsonValidationErrors('service_id');
    }

    public function test_beacon_is_rate_limited(): void
    {
        foreach (range(1, 30) as $_) {
            $this->postJson('/analytics/event', ['event_type' => 'cta_click', 'label' => 'Test CTA']);
        }

        $this->postJson('/analytics/event', ['event_type' => 'cta_click', 'label' => 'Test CTA'])->assertStatus(429);
    }

    public function test_verifying_gated_resource_access_records_a_download(): void
    {
        $category = ResourceCategory::create(['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list']);
        $media = Media::create(['file_name' => 'guide.pdf', 'file_path' => 'media/guide.pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);
        $item = ResourceItem::create([
            'resource_category_id' => $category->id, 'title' => 'Relocation Guide', 'file_media_id' => $media->id,
            'access_type' => 'email', 'status' => 'published', 'sort_order' => 1,
        ]);
        $resourceRequest = ResourceRequest::create([
            'resource_item_id' => $item->id, 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'submitted_at' => now(),
        ]);
        $signedUrl = URL::temporarySignedRoute('resources.access.verify', now()->addHours(24), ['resourceRequest' => $resourceRequest->id]);

        $this->get($signedUrl);

        $this->assertDatabaseHas('analytics_events', ['event_type' => 'resource_download', 'resource_item_id' => $item->id, 'label' => 'Relocation Guide']);
    }
}
