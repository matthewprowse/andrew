<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\SiteSetting;
use App\Support\PublicSettings;
use Database\Seeders\SiteSettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_header_navigation_is_limited_to_services_locations_and_contact(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('publicSettings.menu', fn ($menu) => collect($menu)
                ->where('section', 'header')
                ->pluck('id')
                ->all() === ['services', 'locations', 'contact']));
    }

    public function test_seeded_header_navigation_is_limited_to_services_locations_and_contact(): void
    {
        $this->seed(SiteSettingsSeeder::class);

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('publicSettings.menu', fn ($menu) => collect($menu)
                ->where('section', 'header')
                ->pluck('id')
                ->all() === ['services', 'locations', 'contact']));
    }

    public function test_estimator_is_hidden_from_public_navigation(): void
    {
        $this->seed(SiteSettingsSeeder::class);

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('publicSettings.menu', fn ($menu) => collect($menu)
                ->doesntContain(fn ($item) => $item['link'] === '/estimator')));
    }

    public function test_generated_service_menu_children_use_rooted_inertia_urls(): void
    {
        Service::query()->create([
            'name' => 'Mobility',
            'headline' => 'Move with confidence',
            'slug' => 'mobility',
            'intro' => 'Support for your relocation.',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        $this->get('/services')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('publicSettings.menu', fn ($menu) => collect($menu)
                ->firstWhere('id', 'services')['children'][0]['link'] === '/services/mobility'));
    }

    public function test_footer_still_links_to_secondary_pages_folded_out_of_the_header(): void
    {
        $this->seed(SiteSettingsSeeder::class);

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('publicSettings.menu', function ($menu) {
                $footerLinks = collect($menu)->where('section', 'footer')->pluck('link')->all();

                return in_array('/about', $footerLinks, true)
                    && in_array('/resources', $footerLinks, true)
                    && in_array('/blog', $footerLinks, true);
            }));
    }

    public function test_migration_trims_a_legacy_header_menu_without_dropping_other_customisations(): void
    {
        // Simulates a row persisted before the IA change: the legacy shape
        // carried About/Careers/Insights/Resources/Estimator in the header.
        // RefreshDatabase already ran this migration on an empty table, so we
        // invoke it directly against a manually inserted legacy-shaped row.
        $legacyMenu = [
            ['id' => 'company', 'label' => 'Relocation Africa', 'link' => '/about', 'section' => 'header', 'parentId' => null, 'sortOrder' => 0, 'childrenSource' => 'manual'],
            ['id' => 'about', 'label' => 'About Us', 'link' => '/about', 'section' => 'header', 'parentId' => 'company', 'sortOrder' => 1, 'childrenSource' => 'manual'],
            ['id' => 'services', 'label' => 'Services', 'link' => '/services', 'section' => 'header', 'parentId' => null, 'sortOrder' => 2, 'childrenSource' => 'services'],
            ['id' => 'estimator', 'label' => 'Estimator', 'link' => '/estimator', 'section' => 'header', 'parentId' => null, 'sortOrder' => 3, 'childrenSource' => 'manual'],
            ['id' => 'locations', 'label' => 'Locations', 'link' => '/locations', 'section' => 'header', 'parentId' => null, 'sortOrder' => 4, 'childrenSource' => 'manual'],
            ['id' => 'contact', 'label' => 'Contact Us', 'link' => '/contact', 'section' => 'header', 'parentId' => null, 'sortOrder' => 5, 'childrenSource' => 'manual'],
            ['id' => 'footer-estimator', 'label' => 'Estimator', 'link' => '/estimator', 'section' => 'footer', 'parentId' => null, 'sortOrder' => 6, 'childrenSource' => 'manual'],
        ];

        SiteSetting::query()->create([
            'id' => 1,
            'site' => PublicSettings::defaults(),
            'menu' => $legacyMenu,
            'social_links' => [],
        ]);

        (require database_path('migrations/2026_09_10_000000_trim_public_header_menu_to_services_locations_contact.php'))->up();

        $menu = SiteSetting::find(1)->menu;
        $headerIds = collect($menu)->where('section', 'header')->pluck('id')->all();
        $hasEstimator = collect($menu)->contains(fn (array $item) => $item['link'] === '/estimator');
        $hasFooterCareers = collect($menu)->contains(fn (array $item) => $item['id'] === 'footer-careers');

        $this->assertSame(['services', 'locations', 'contact'], $headerIds);
        $this->assertFalse($hasEstimator);
        $this->assertTrue($hasFooterCareers);
    }
}
