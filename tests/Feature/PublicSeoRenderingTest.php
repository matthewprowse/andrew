<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Career;
use App\Models\Country;
use App\Models\Service;
use App\Models\SiteSetting;
use App\Support\PublicSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithSsr;
use Tests\TestCase;

/**
 * Phase 1 (SEO-02, SEO-03, SEO-05, SEO-06) verification against the actual
 * rendered HTML response — not just Inertia page props. These assertions
 * only mean something when the Inertia SSR server is genuinely producing
 * the document, so every test skips itself (rather than silently passing
 * against the unrendered fallback shell) when SSR can't be reached.
 *
 * Run `npm run build:ssr` once before `php artisan test` if these tests
 * report as skipped locally.
 */
class PublicSeoRenderingTest extends TestCase
{
    use InteractsWithSsr;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (! $this->ensureSsrAvailable()) {
            $this->markTestSkipped('Inertia SSR server is not available (bundle missing or failed to start). Run `npm run build:ssr` first.');
        }
    }

    /** @return list<array<string, mixed>> */
    private function jsonLdBlocks(string $html): array
    {
        preg_match_all('#<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>#s', $html, $matches);

        return array_map(fn (string $json): array => json_decode($json, true) ?? [], $matches[1]);
    }

    private function renderedTitle(string $html): string
    {
        preg_match('#<title[^>]*>(.*?)</title>#s', $html, $match);

        return $match[1] ?? '';
    }

    /**
     * Inertia's React client sets `data-server-rendered` on the mount div
     * only when it's hydrating real SSR markup (see `hasAttribute('data-server-rendered')`
     * in resources/js/app.tsx and @inertiajs/react's createInertiaApp); the
     * non-SSR fallback shell (Inertia\View\Components\App::render()) ships a
     * plain `<div id="app"></div>` with no such attribute. Checking for the
     * attribute is a direct, order-independent signal that SSR actually
     * rendered the page, unlike comparing the title against config('app.name')
     * — which gives a false negative whenever a page's own content
     * legitimately matches the app name (e.g. the home page falling back to
     * the organization name when no custom hero/metaTitle is set) — and
     * unlike matching the literal `<div id="app">` tag text, which breaks the
     * moment the SSR-rendered root element carries any other attribute
     * before `id` (it does: `data-server-rendered="true"` is emitted first).
     */
    private function assertSsrRendered(string $html, string $path): void
    {
        $this->assertMatchesRegularExpression(
            '#<div[^>]*\bdata-server-rendered="true"[^>]*\bid="app"#',
            $html,
            "Mount div for $path has no data-server-rendered marker, meaning SSR did not render this page"
        );
    }

    /**
     * GET a path and return its HTML, retrying once if the SSR round-trip
     * comes back as the unrendered fallback shell. Observed locally: the
     * first request to a component the long-lived SSR process hasn't served
     * yet in a given run can silently come back unrendered (no SsrRenderFailed
     * event, no thrown exception — Inertia's HttpGateway just returns null and
     * Laravel serves the client-only shell), while an identical retry
     * succeeds. Root cause not isolated to a specific Inertia/Node behaviour;
     * this keeps the test meaningful (it still fails hard on a genuine,
     * persistent SSR outage) without it being order-dependent on sibling
     * tests.
     */
    private function getSsrRenderedHtml(string $path): string
    {
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $this->resetSsrStateBetweenRequests();
            $response = $this->get($path);
            $response->assertOk();
            $html = $response->getContent();

            if (preg_match('#<div[^>]*\bdata-server-rendered="true"[^>]*\bid="app"#', $html) === 1) {
                return $html;
            }

            if ($attempt === 1) {
                usleep(300_000);
            }
        }

        return $html;
    }

    // SEO-02: the saved metaTitle must land in the real <title> element, not
    // just in the Inertia props blob embedded in data-page.
    public function test_service_page_renders_its_saved_meta_title_into_the_actual_html_title_tag(): void
    {
        Service::create([
            'name' => 'Mobility', 'headline' => 'Move with confidence', 'slug' => 'mobility',
            'intro' => 'Support for your relocation.', 'status' => 'published',
            'sort_order' => 1, 'meta_title' => 'Custom Mobility SEO Title',
        ]);

        $html = $this->get('/services/mobility')->assertOk()->getContent();

        $this->assertSame('Custom Mobility SEO Title', $this->renderedTitle($html));
    }

    // Retain the existing metaTitle-absent fallback to the service name.
    public function test_service_page_falls_back_to_the_service_name_when_no_meta_title_is_saved(): void
    {
        Service::create([
            'name' => 'Immigration', 'headline' => 'Immigration', 'slug' => 'immigration',
            'intro' => 'Support.', 'status' => 'published', 'sort_order' => 1,
        ]);

        $html = $this->get('/services/immigration')->assertOk()->getContent();

        $this->assertSame('Immigration', $this->renderedTitle($html));
    }

    // SEO-03: a relative banner path must become an absolute og:image, and it
    // must be usable even though the record only ever stored a relative path.
    public function test_service_banner_image_becomes_an_absolute_open_graph_image_fallback(): void
    {
        Service::create([
            'name' => 'Research', 'headline' => 'Research', 'slug' => 'research',
            'intro' => 'Support.', 'status' => 'published', 'sort_order' => 1,
            'banner_image' => '/storage/banners/research.jpg',
        ]);

        $html = $this->get('/services/research')->assertOk()->getContent();
        $expected = rtrim(config('app.url'), '/').'/storage/banners/research.jpg';

        $this->assertStringContainsString('property="og:image" content="'.$expected.'"', $html);
    }

    // SEO-03: the organization logo is a dedicated setting, independent of
    // whatever image a given page happens to be sharing.
    public function test_organization_logo_is_distinct_from_the_page_share_image_in_structured_data(): void
    {
        $record = new SiteSetting([
            'site' => [...PublicSettings::defaults(), 'organizationLogo' => '/branding/logo.png'],
            'menu' => PublicSettings::menu(),
            'social_links' => [],
        ]);
        $record->id = 1;
        $record->save();

        Service::create([
            'name' => 'Training', 'headline' => 'Training', 'slug' => 'training',
            'intro' => 'Support.', 'status' => 'published', 'sort_order' => 1,
            'banner_image' => '/storage/banners/training.jpg',
        ]);

        $html = $this->get('/services/training')->assertOk()->getContent();
        $origin = rtrim(config('app.url'), '/');

        $organization = collect($this->jsonLdBlocks($html))->firstWhere('@type', 'Organization');

        $this->assertNotNull($organization);
        $this->assertSame($origin.'/branding/logo.png', $organization['logo']);
        $this->assertNotSame($organization['logo'], $origin.'/storage/banners/training.jpg');
    }

    // SEO-05: the vacancy listing (now at the bottom of /about) must not
    // emit one JobPosting per open role.
    public function test_vacancy_listing_no_longer_emits_individual_job_posting_structured_data(): void
    {
        Career::create(['job_title' => 'Relocation Consultant', 'description' => 'Help people move.', 'location' => 'Cape Town', 'status' => 'open', 'posted_date' => '2026-09-01']);

        $html = $this->get('/about')->assertOk()->getContent();

        $types = collect($this->jsonLdBlocks($html))->pluck('@type');
        $this->assertFalse($types->contains('JobPosting'));
    }

    // SEO-05: Article markup uses only fields BlogPost actually has, and
    // does not invent an author.
    public function test_blog_post_emits_valid_article_structured_data_from_real_model_fields_only(): void
    {
        BlogPost::create([
            'title' => 'Settling Into Nairobi', 'slug' => 'settling-into-nairobi', 'category' => 'Mobility',
            'excerpt' => 'A practical guide.', 'body' => 'Full article body.', 'status' => 'published',
            'publish_date' => '2026-08-01', 'banner_image' => '/storage/blog/nairobi.jpg',
        ]);

        $html = $this->get('/blog/settling-into-nairobi')->assertOk()->getContent();
        $origin = rtrim(config('app.url'), '/');

        $article = collect($this->jsonLdBlocks($html))->firstWhere('@type', 'Article');

        $this->assertNotNull($article);
        $this->assertSame('Settling Into Nairobi', $article['headline']);
        $this->assertSame('2026-08-01', $article['datePublished']);
        $this->assertSame([$origin.'/storage/blog/nairobi.jpg'], $article['image']);
        $this->assertArrayNotHasKey('author', $article, 'BlogPost has no author field; Article markup must not invent one.');
    }

    // SEO-06: broad status/canonical/title/description/JSON-LD sweep across
    // representative public templates.
    public function test_representative_public_pages_return_correct_status_canonical_title_description_and_valid_structured_data(): void
    {
        Service::create(['name' => 'Remuneration', 'headline' => 'Remuneration', 'slug' => 'remuneration', 'intro' => 'Support.', 'status' => 'published', 'sort_order' => 1]);
        Country::create(['name' => 'Kenya', 'slug' => 'kenya', 'region' => 'East Africa', 'description' => 'Coverage in Kenya.', 'sort_order' => 1]);
        BlogPost::create(['title' => 'An Insight', 'slug' => 'an-insight', 'category' => 'Mobility', 'excerpt' => 'Excerpt.', 'body' => 'Body.', 'status' => 'published', 'publish_date' => '2026-08-01']);

        $this->restartSsrProcess();

        foreach (['/', '/services', '/services/remuneration', '/locations', '/locations/kenya', '/resources', '/blog', '/blog/an-insight', '/about', '/contact'] as $path) {
            $html = $this->getSsrRenderedHtml($path);

            $canonical = rtrim(config('app.url'), '/').$path;
            $this->assertStringContainsString('rel="canonical" href="'.$canonical.'"', $html, "Canonical mismatch for $path");

            $this->assertSsrRendered($html, $path);

            $title = $this->renderedTitle($html);
            $this->assertNotSame('', $title, "Empty <title> for $path");

            $this->assertMatchesRegularExpression('#<meta name="description" content="[^"]+"#', $html, "Missing meta description for $path");

            foreach ($this->jsonLdBlocks($html) as $index => $schema) {
                $this->assertNotEmpty($schema, "JSON-LD block $index on $path failed to decode");
                $this->assertArrayHasKey('@type', $schema, "JSON-LD block $index on $path is missing @type");
                foreach (['image', 'logo'] as $imageKey) {
                    if (! empty($schema[$imageKey])) {
                        foreach ((array) $schema[$imageKey] as $imageUrl) {
                            $this->assertMatchesRegularExpression('#^https?://#', $imageUrl, "Non-absolute $imageKey URL in JSON-LD on $path");
                        }
                    }
                }
            }
        }
    }
}
