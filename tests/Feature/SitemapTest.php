<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Country;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SitemapTest extends TestCase
{
    use RefreshDatabase;

    public function test_sitemap_includes_static_pages(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/xml');
        $response->assertSee(config('app.url').'/about', false);
        $response->assertSee(config('app.url').'/locations', false);
    }

    public function test_sitemap_includes_published_services_countries_and_blog_posts(): void
    {
        Service::create(['name' => 'Global Mobility', 'headline' => 'Global Mobility', 'slug' => 'global-mobility', 'status' => 'published']);
        Service::create(['name' => 'Draft Service', 'headline' => 'Draft', 'slug' => 'draft-service', 'status' => 'draft']);
        Country::create(['name' => 'Kenya', 'slug' => 'kenya', 'region' => 'East Africa', 'sort_order' => 1]);
        BlogPost::create(['title' => 'Relocation Tips', 'slug' => 'relocation-tips', 'category' => 'Guides', 'excerpt' => 'Practical relocation tips.', 'body' => 'Full article body.', 'status' => 'published', 'publish_date' => now()->subDay()]);

        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertSee(config('app.url').'/services/global-mobility', false);
        $response->assertDontSee(config('app.url').'/services//global-mobility', false);
        $response->assertDontSee(config('app.url').'/services/draft-service', false);
        $response->assertSee(config('app.url').'/locations/kenya', false);
        $response->assertSee(config('app.url').'/blog/relocation-tips', false);
    }

    // PUB-03 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): verifying,
    // not rebuilding — SitemapController already builds its blog-post URLs
    // from BlogPost::publiclyVisible(), which excludes any row whose
    // publish_date hasn't arrived yet, even if status is already
    // "published" (a Scheduled post).
    public function test_sitemap_excludes_a_published_but_future_dated_blog_post(): void
    {
        BlogPost::create(['title' => 'Scheduled Article', 'slug' => 'scheduled-article', 'category' => 'Guides', 'excerpt' => 'x', 'body' => 'x', 'status' => 'published', 'publish_date' => now()->addWeek()]);
        BlogPost::create(['title' => 'Live Article', 'slug' => 'live-article', 'category' => 'Guides', 'excerpt' => 'x', 'body' => 'x', 'status' => 'published', 'publish_date' => now()->subDay()]);

        $sitemap = $this->get('/sitemap.xml')->assertOk()->getContent();

        $this->assertStringNotContainsString('/blog/scheduled-article', $sitemap);
        $this->assertStringContainsString(config('app.url').'/blog/live-article', $sitemap);
    }

    public function test_sitemap_service_url_is_a_working_canonical_destination(): void
    {
        Service::create(['name' => 'Global Mobility', 'headline' => 'Global Mobility', 'slug' => 'global-mobility', 'status' => 'published', 'intro' => 'Support.', 'sort_order' => 1]);

        $sitemap = $this->get('/sitemap.xml')->assertOk()->getContent();
        preg_match('#<loc>(http://[^<]*global-mobility)</loc>#', $sitemap, $match);

        $this->assertNotEmpty($match, 'Sitemap did not contain a global-mobility <loc> entry.');
        $path = str_replace(rtrim(config('app.url'), '/'), '', $match[1]);
        $this->get($path)->assertOk();
    }

    public function test_robots_txt_points_to_the_sitemap_and_disallows_the_admin_area(): void
    {
        $response = $this->get('/robots.txt');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/plain; charset=UTF-8');
        $response->assertSee('Disallow: /admin');
        $response->assertSee('Sitemap: '.config('app.url').'/sitemap.xml');
    }
}
