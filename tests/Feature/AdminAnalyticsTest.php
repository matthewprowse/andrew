<?php

namespace Tests\Feature;

use App\Models\AnalyticsEvent;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_guests_and_non_admin_users_cannot_view_analytics(): void
    {
        $this->get('/admin/analytics')->assertRedirect('/login');

        $this->actingAs(User::factory()->create());
        $this->get('/admin/analytics')->assertForbidden();
    }

    public function test_staff_can_view_the_analytics_report(): void
    {
        $this->staff();

        $this->get('/admin/analytics')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/analytics/index'));
    }

    public function test_summary_and_daily_visits_aggregate_correctly(): void
    {
        $this->staff();
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'session_hash' => 'a', 'occurred_at' => today()]);
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'session_hash' => 'a', 'occurred_at' => today()]);
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'session_hash' => 'b', 'occurred_at' => today()->subDay()]);
        AnalyticsEvent::create(['event_type' => 'cta_click', 'path' => '/', 'occurred_at' => today()]);
        AnalyticsEvent::create(['event_type' => 'resource_download', 'path' => '/resources/brochures', 'occurred_at' => today()]);

        $this->get('/admin/analytics')->assertInertia(fn (Assert $page) => $page
            ->where('summary.pageViews', 3)
            ->where('summary.ctaClicks', 1)
            ->where('summary.resourceDownloads', 1)
            ->where('summary.uniqueSessions', 2)
            ->has('dailyVisits', 30));
    }

    public function test_events_outside_the_selected_window_are_excluded(): void
    {
        $this->staff();
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'occurred_at' => now()->subDays(40)]);

        $this->get('/admin/analytics?days=7')->assertInertia(fn (Assert $page) => $page
            ->where('summary.pageViews', 0));

        $this->get('/admin/analytics?days=90')->assertInertia(fn (Assert $page) => $page
            ->where('summary.pageViews', 1));
    }

    public function test_staff_can_export_analytics_csv(): void
    {
        $this->staff();
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/about', 'occurred_at' => today()]);

        $this->get('/admin/analytics/export?days=7')
            ->assertOk()
            ->assertDownload('analytics-7-days.csv')
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_top_resources_and_top_service_interest_rank_by_count(): void
    {
        $this->staff();
        $category = ResourceCategory::create(['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list']);
        $guide = ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Popular Guide', 'status' => 'published', 'sort_order' => 1]);
        $flyer = ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Quiet Flyer', 'status' => 'published', 'sort_order' => 2]);
        $mobility = Service::create(['name' => 'Mobility', 'headline' => 'x', 'slug' => 'mobility', 'intro' => 'x', 'status' => 'published', 'sort_order' => 1]);

        foreach (range(1, 3) as $_) {
            AnalyticsEvent::create(['event_type' => 'resource_download', 'resource_item_id' => $guide->id, 'occurred_at' => today()]);
            AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/mobility', 'service_id' => $mobility->id, 'occurred_at' => today()]);
        }
        AnalyticsEvent::create(['event_type' => 'resource_download', 'resource_item_id' => $flyer->id, 'occurred_at' => today()]);

        $this->get('/admin/analytics')->assertInertia(fn (Assert $page) => $page
            ->where('topResources.0.title', 'Popular Guide')
            ->where('topResources.0.downloads', 3)
            ->where('topServiceInterest.0.name', 'Mobility')
            ->where('topServiceInterest.0.views', 3));
    }

    public function test_geography_groups_missing_country_as_unknown(): void
    {
        $this->staff();
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'country' => null, 'occurred_at' => today()]);
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'country' => null, 'occurred_at' => today()]);

        $this->get('/admin/analytics')->assertInertia(fn (Assert $page) => $page
            ->where('geography.0.country', 'Unknown')
            ->where('geography.0.views', 2));
    }

    public function test_top_cities_rank_by_views_and_exclude_unresolved_events(): void
    {
        $this->staff();
        foreach (range(1, 2) as $_) {
            AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'city' => 'Cape Town', 'country' => 'South Africa', 'occurred_at' => today()]);
        }
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'city' => 'Johannesburg', 'country' => 'South Africa', 'occurred_at' => today()]);
        AnalyticsEvent::create(['event_type' => 'page_view', 'path' => '/', 'city' => null, 'country' => null, 'occurred_at' => today()]);

        $this->get('/admin/analytics')->assertInertia(fn (Assert $page) => $page
            ->where('topCities.0.city', 'Cape Town')
            ->where('topCities.0.country', 'South Africa')
            ->where('topCities.0.views', 2)
            ->has('topCities', 2));
    }
}
