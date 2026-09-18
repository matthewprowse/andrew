<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Career;
use App\Models\Page;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\Service;
use App\Models\SiteSetting;
use Database\Seeders\ResourceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ContentSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_populates_approved_copy_on_a_fresh_database(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        $this->artisan('content:sync')->assertSuccessful();

        $this->assertDatabaseCount('services', 5);
        $this->assertDatabaseCount('blog_posts', 6);
        // Home and About already exist from migrations (block-page system,
        // permanently skipped by syncPages()); this sync creates the other
        // 3 entries in pages.json (careers, contact, locations) on top.
        $this->assertDatabaseCount('pages', 5);
        $this->assertDatabaseCount('site_settings', 1);
        $this->assertDatabaseCount('careers', 2);
        $this->assertDatabaseCount('resource_items', 9);

        $service = Service::where('slug', 'mobility')->firstOrFail();
        $this->assertSame('Corporate Relocation and Destination Services Across Africa', $service->headline);

        $post = BlogPost::where('slug', 'what-mobility-research-tells-us-about-africa')->firstOrFail();
        $this->assertSame('What Mobility Research Tells Us About Africa', $post->title);

        // Home and About aren't touched by content:sync any more (see
        // above) — Locations is still on the fixed-field mechanism, so it's
        // the representative check that sync actually wrote real copy in.
        $locations = Page::where('slug', 'locations')->firstOrFail();
        $this->assertSame('Where We Work', $locations->intro_heading);

        $settings = SiteSetting::find(1);
        $this->assertSame('Make your African move work.', $settings->site['defaultCtaText']);
        // euraHeading/euraText stay empty: unverified claim pending client confirmation.
        $this->assertSame('', $settings->site['euraHeading']);
        $this->assertSame('', $settings->site['euraText']);

        $career = Career::where('job_title', 'Relocation Consultant')->firstOrFail();
        $this->assertStringContainsString('Johannesburg, South Africa', $career->description);
        // Status is unconfirmed content, not publication readiness, and stays closed regardless.
        $this->assertSame('closed', $career->status);

        $resourceItem = ResourceItem::where('title', 'Corporate Relocation Overview')->firstOrFail();
        $this->assertSame('Download PDF', $resourceItem->action_label);
        $this->assertSame('draft', $resourceItem->status);
    }

    public function test_running_it_twice_makes_no_further_changes(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        $this->artisan('content:sync')->assertSuccessful();

        $before = [
            Service::orderBy('id')->get()->toArray(),
            BlogPost::orderBy('id')->get()->toArray(),
            Page::orderBy('id')->get()->toArray(),
            SiteSetting::findOrFail(1)->toArray(),
            Career::orderBy('id')->get()->toArray(),
            ResourceItem::orderBy('id')->get()->toArray(),
        ];

        Artisan::call('content:sync');
        $output = Artisan::output();

        $after = [
            Service::orderBy('id')->get()->toArray(),
            BlogPost::orderBy('id')->get()->toArray(),
            Page::orderBy('id')->get()->toArray(),
            SiteSetting::findOrFail(1)->toArray(),
            Career::orderBy('id')->get()->toArray(),
            ResourceItem::orderBy('id')->get()->toArray(),
        ];

        $this->assertSame($before, $after);
        $this->assertStringContainsString('Sync complete: 0 created, 0 updated, 26 unchanged.', $output);
    }

    public function test_dry_run_reports_changes_without_writing_anything(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->assertDatabaseCount('services', 0);

        Artisan::call('content:sync', ['--dry-run' => true]);
        $output = Artisan::output();

        $this->assertDatabaseCount('services', 0);
        $this->assertDatabaseCount('blog_posts', 0);
        // Home and About always exist from migrations (block-page system)
        // and are never touched by content:sync — see SyncContent::syncPages().
        $this->assertDatabaseCount('pages', 2);
        $this->assertDatabaseCount('site_settings', 0);
        $this->assertDatabaseCount('careers', 0);
        $this->assertDatabaseCount('resource_items', 0);
        $this->assertStringContainsString('Dry run: 26 created, 0 updated, 0 unchanged.', $output);
    }

    public function test_it_migrates_the_renamed_blog_post_slug_in_place_instead_of_duplicating_it(): void
    {
        $legacy = BlogPost::create([
            'title' => 'Old Title',
            'slug' => 'what-our-2026-mobility-research-tells-us-about-africa',
            'excerpt' => 'Old excerpt',
            'body' => 'Old body',
            'status' => 'draft',
            'publish_date' => now(),
        ]);

        $this->artisan('content:sync')->assertSuccessful();

        $this->assertDatabaseCount('blog_posts', 6);
        $this->assertSame('what-mobility-research-tells-us-about-africa', $legacy->fresh()->slug);
        $this->assertSame('What Mobility Research Tells Us About Africa', $legacy->fresh()->title);
        $this->assertSame('draft', $legacy->fresh()->status);
    }

    public function test_it_never_changes_a_records_publication_status(): void
    {
        $post = BlogPost::create([
            'title' => 'Placeholder title',
            'slug' => '5-things-to-know-before-relocating-to-south-africa',
            'excerpt' => 'Old excerpt',
            'body' => 'Old body',
            'status' => 'draft',
            'publish_date' => now(),
        ]);

        $this->artisan('content:sync')->assertSuccessful();

        $fresh = $post->fresh();
        $this->assertSame('draft', $fresh->status);
        // Content itself should have converged to the approved copy.
        $this->assertSame('Five Things to Know Before Relocating to South Africa', $fresh->title);
        // This slug's approved seed category ("Relocation") has no matching
        // Service by name, so the sync correctly leaves it unlinked rather
        // than guessing — same "no match, no link" behaviour the old
        // service_id lookup had.
        $this->assertSame([], $fresh->services->pluck('name')->all());
    }

    public function test_it_never_changes_a_careers_or_resource_items_publication_status(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        // Statuses deliberately diverge from what the seed content would set on creation
        // ('closed' for careers, 'draft' for resource items), so a sync that wrongly touched
        // status would be caught here.
        $career = Career::create([
            'job_title' => 'Relocation Consultant',
            'description' => 'Old description',
            'location' => 'Old location',
            'status' => 'open',
            'posted_date' => '2020-01-01',
        ]);

        $category = ResourceCategory::where('slug', 'brochures')->firstOrFail();
        $resourceItem = ResourceItem::create([
            'resource_category_id' => $category->id,
            'title' => 'Corporate Relocation Overview',
            'description' => 'Old description',
            'action_label' => 'Old label',
            'sort_order' => 1,
            'status' => 'published',
        ]);

        $this->artisan('content:sync')->assertSuccessful();

        $freshCareer = $career->fresh();
        $this->assertSame('open', $freshCareer->status);
        $this->assertStringContainsString('Johannesburg, South Africa', $freshCareer->description);
        $this->assertNotSame('Old description', $freshCareer->description);

        $freshItem = $resourceItem->fresh();
        $this->assertSame('published', $freshItem->status);
        $this->assertStringContainsString('corporate relocation services', strtolower($freshItem->description));
        $this->assertNotSame('Old description', $freshItem->description);
    }

    public function test_it_skips_resource_items_whose_category_does_not_exist(): void
    {
        // No ResourceCategorySeeder call: none of the four categories exist yet.
        $this->artisan('content:sync')->assertSuccessful();

        $this->assertDatabaseCount('resource_items', 0);
    }

    public function test_no_synced_content_contains_lorem_or_placeholder_copy(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        $this->artisan('content:sync')->assertSuccessful();

        $haystacks = collect();

        Service::all()->each(function (Service $service) use ($haystacks) {
            $haystacks->push($service->headline, $service->intro, json_encode($service->faqs), json_encode($service->scope));
        });
        BlogPost::all()->each(function (BlogPost $post) use ($haystacks) {
            $haystacks->push($post->title, $post->excerpt, $post->body);
        });
        Page::all()->each(function (Page $page) use ($haystacks) {
            $haystacks->push($page->hero_heading, $page->hero_subheading, $page->intro_heading, $page->intro_body, json_encode($page->sections));
        });
        Career::all()->each(function (Career $career) use ($haystacks) {
            $haystacks->push($career->description);
        });
        ResourceItem::all()->each(function (ResourceItem $item) use ($haystacks) {
            $haystacks->push($item->description);
        });

        $settings = SiteSetting::findOrFail(1);
        $haystacks->push($settings->site['footerText'], $settings->site['copyrightLine'], $settings->site['defaultCtaText'], $settings->site['defaultCtaDescription']);

        $this->assertGreaterThan(0, $haystacks->count());

        foreach ($haystacks as $text) {
            $this->assertStringNotContainsStringIgnoringCase('lorem', (string) $text);
            $this->assertStringNotContainsStringIgnoringCase('placeholder description', (string) $text);
        }
    }
}
