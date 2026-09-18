<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Media;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use App\Support\Blocks\Types\ResourcesPromoBlock;
use App\Support\ContentLibrary;
use Database\Seeders\ResourceCategorySeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * LIB-01/02/03/04/07 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4, batch 4A).
 * LIB-05/06 (Testimonials/FAQ) and LIB-08 (global search) are out of scope —
 * a later batch.
 */
class ContentLibraryTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);

        return $user;
    }

    private function service(array $overrides = []): Service
    {
        return Service::create([...[
            'name' => 'Immigration', 'headline' => 'H', 'slug' => 'immigration', 'intro' => 'i',
            'body' => 'b', 'scope' => [], 'countries' => [], 'sort_order' => 1, 'status' => 'published',
        ], ...$overrides]);
    }

    // --- LIB-01: normalization and typed-id collision-proofing ---------

    public function test_typed_ids_never_collide_even_when_the_underlying_numeric_ids_match(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $category = ResourceCategory::where('slug', 'brochures')->sole();

        $post = BlogPost::create(['title' => 'Post', 'slug' => 'post', 'category' => 'News', 'excerpt' => 'e', 'body' => 'b', 'status' => 'draft']);
        $item = ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Item', 'status' => 'draft']);

        // Both tables auto-increment independently from a fresh database, so
        // this is the real collision opportunity the typed-id scheme (LIB-01:
        // "article:12" / "resource:7") guards against — not a contrived one.
        $this->assertSame(1, $post->id);
        $this->assertSame(1, $item->id);

        $rows = ContentLibrary::list()->keyBy('id');

        $this->assertCount(2, $rows);
        $this->assertTrue($rows->has('article:1'));
        $this->assertTrue($rows->has('resource:1'));
        $this->assertSame('article', $rows->get('article:1')['type']);
        $this->assertSame('resource', $rows->get('resource:1')['type']);
        $this->assertSame('Post', $rows->get('article:1')['title']);
        $this->assertSame('Item', $rows->get('resource:1')['title']);
    }

    public function test_parse_id_round_trips_and_rejects_malformed_input(): void
    {
        $this->assertSame(['type' => 'article', 'id' => 12], ContentLibrary::parseId('article:12'));
        $this->assertSame(['type' => 'resource', 'id' => 7], ContentLibrary::parseId('resource:7'));
        $this->assertNull(ContentLibrary::parseId('bogus:1'));
        $this->assertNull(ContentLibrary::parseId('article:abc'));
        $this->assertNull(ContentLibrary::parseId('article'));
    }

    public function test_normalizes_both_sources_into_one_shape_with_correct_fields(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $service = $this->service();
        $category = ResourceCategory::where('slug', 'brochures')->sole();

        $post = BlogPost::create([
            'title' => 'Moving to Kenya', 'slug' => 'moving-to-kenya',
            'excerpt' => 'e', 'body' => 'b', 'status' => 'published',
            'publish_date' => today(),
        ]);
        $post->services()->sync([$service->id]);
        $item = ResourceItem::create([
            'resource_category_id' => $category->id, 'service_id' => $service->id,
            'title' => 'Relocation Guide', 'status' => 'published', 'access_type' => 'email',
        ]);

        $rows = ContentLibrary::list()->keyBy('id');
        $article = $rows->get('article:'.$post->id);
        $resource = $rows->get('resource:'.$item->id);

        $this->assertSame('article', $article['type']);
        $this->assertNull($article['category']);
        $this->assertSame((string) $service->id, $article['serviceId']);
        $this->assertSame($service->name, $article['serviceName']);
        $this->assertSame([(string) $service->id], $article['serviceIds']);
        $this->assertSame([$service->name], $article['serviceNames']);
        $this->assertSame('Live', $article['status']);
        // Articles are never gated — only ResourceItem has a
        // access_type flow.
        $this->assertSame('public', $article['accessMode']);
        $this->assertSame('/blog/moving-to-kenya', $article['publicUrl']);

        $this->assertSame('resource', $resource['type']);
        $this->assertSame('Brochures', $resource['category']);
        $this->assertSame('format', $resource['resourceCategoryKind']);
        $this->assertSame((string) $service->id, $resource['serviceId']);
        $this->assertSame('gated', $resource['accessMode']);
        // No item-specific public page — the category listing is the
        // correct canonical URL (existing route, not a new URL scheme).
        $this->assertSame('/resources/brochures', $resource['publicUrl']);
    }

    // --- /admin/content compatibility redirect -------------------------

    public function test_admin_content_redirects_a_fully_permitted_viewer_to_articles(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->staff();
        $this->get('/admin/content')->assertRedirect('/admin/blog');
    }

    public function test_admin_content_redirects_to_the_first_page_the_viewer_can_access(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $resources = Role::create(['name' => 'Resources Only', 'permissions' => [
            'resources' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->actingAs(User::factory()->create(['role_id' => $resources->id]));
        $this->get('/admin/content')->assertRedirect('/admin/resources/brochures');

        $testimonials = Role::create(['name' => 'Testimonials Only', 'permissions' => [
            'testimonials' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->actingAs(User::factory()->create(['role_id' => $testimonials->id]));
        $this->get('/admin/content')->assertRedirect('/admin/testimonials');
    }

    // --- LIB-03: service association save/read for both types ----------

    public function test_saving_a_blog_posts_service_association_persists_and_touches_nothing_else(): void
    {
        $this->staff();
        $service = $this->service();
        $serviceUpdatedAt = $service->updated_at;

        $this->post('/admin/blog', [
            'title' => 'A', 'urlSlug' => 'a', 'excerpt' => 'e', 'body' => 'b',
            'status' => 'Draft', 'publishDate' => '', 'serviceIds' => [$service->id],
        ])->assertRedirect('/admin/blog');

        $post = BlogPost::firstOrFail();
        $this->assertSame([$service->id], $post->services->pluck('id')->all());
        $this->assertSame(0, ResourceItem::count());
        $this->assertEquals($serviceUpdatedAt, $service->fresh()->updated_at);

        // Clearing it back to no association also works and doesn't leave a
        // stale pivot row.
        $this->patch('/admin/blog/'.$post->id, [
            'title' => 'A', 'urlSlug' => 'a', 'excerpt' => 'e', 'body' => 'b',
            'status' => 'Draft', 'publishDate' => '', 'serviceIds' => [],
        ])->assertRedirect();
        $this->assertSame([], $post->fresh()->services->pluck('id')->all());
    }

    public function test_saving_a_resource_items_service_association_persists_and_touches_nothing_else(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->staff();
        $service = $this->service();
        $serviceUpdatedAt = $service->updated_at;

        $this->post('/admin/resources/brochures', [
            'title' => 'Guide', 'description' => 'd', 'action_label' => '', 'external_url' => 'https://example.com/g',
            'status' => 'draft', 'sort_order' => 1, 'service_id' => $service->id,
        ])->assertRedirect('/admin/resources/brochures');

        $item = ResourceItem::firstOrFail();
        $this->assertSame($service->id, $item->service_id);
        $this->assertSame(0, BlogPost::count());
        $this->assertEquals($serviceUpdatedAt, $service->fresh()->updated_at);

        $this->patch("/admin/resources/brochures/{$item->id}", [
            'title' => 'Guide', 'description' => 'd', 'action_label' => '', 'external_url' => 'https://example.com/g',
            'status' => 'draft', 'sort_order' => 1, 'service_id' => '',
        ])->assertRedirect('/admin/resources/brochures');
        $this->assertNull($item->fresh()->service_id);
    }

    public function test_resource_service_id_must_reference_a_real_service(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->staff();

        $this->postJson('/admin/resources/brochures', [
            'title' => 'Guide', 'external_url' => 'https://example.com/g', 'status' => 'draft', 'sort_order' => 1,
            'service_id' => 99999,
        ])->assertUnprocessable()->assertJsonValidationErrors('service_id');
    }

    // --- LIB-04: resource kind defaults ----------------------------------

    public function test_seed_backfills_kind_predictably(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        foreach (['brochures', 'webinars', 'books'] as $slug) {
            $this->assertSame('format', ResourceCategory::where('slug', $slug)->sole()->kind);
        }
    }

    /**
     * Existing categories receive the safe format default when the kind
     * column is added.
     */
    public function test_migration_backfills_kind_for_rows_that_already_existed_before_it_ran(): void
    {
        Schema::table('resource_categories', function (Blueprint $table) {
            $table->dropColumn('kind');
        });

        DB::table('resource_categories')->insert([
            ['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list', 'created_at' => now(), 'updated_at' => now()],
        ]);

        /** @var Migration $migration */
        $migration = require base_path('database/migrations/2026_09_16_000300_add_kind_to_resource_categories_table.php');
        $migration->up();

        $this->assertSame('format', DB::table('resource_categories')->where('slug', 'brochures')->value('kind'));
    }

    public function test_existing_category_urls_and_signed_access_links_are_unaffected_by_the_new_kind_column(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        // No redirect, no 404 — every existing category URL still resolves
        // by slug alone, exactly as before LIB-04.
        foreach (['brochures', 'webinars', 'books'] as $slug) {
            $this->get('/resources/'.$slug)->assertOk();
        }

        $category = ResourceCategory::where('slug', 'brochures')->sole();
        $media = Media::create(['file_name' => 'guide.pdf', 'file_path' => 'media/guide.pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);
        $item = ResourceItem::create([
            'resource_category_id' => $category->id, 'title' => 'Guide', 'file_media_id' => $media->id,
            'access_type' => 'email', 'status' => 'published', 'sort_order' => 1,
        ]);
        $resourceRequest = ResourceRequest::create([
            'resource_item_id' => $item->id, 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'submitted_at' => now(),
        ]);

        $signedUrl = URL::temporarySignedRoute('resources.access.verify', now()->addHours(24), ['resourceRequest' => $resourceRequest->id]);
        $this->get($signedUrl)->assertRedirect($item->file->url());
        $this->assertNotNull($resourceRequest->fresh()->verified_at);
    }

    // --- LIB-07: empty-category visibility -------------------------------
    // The homepage's "Knowledge for Your Next Chapter" promotion cards are
    // the resources_promo block's own resolved data now (see
    // App\Support\Blocks\Types\ResourcesPromoBlock) — tested directly here
    // rather than through '/', so these stay correct regardless of where
    // that block sits on the page.

    public function test_promo_cards_omit_empty_resource_categories(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        $cards = (new ResourcesPromoBlock)->resolve([])['cards'];

        $this->assertFalse(collect($cards)->contains('href', '/resources/webinars'));
        $this->assertFalse(collect($cards)->contains('href', '/resources/brochures'));
    }

    public function test_a_category_that_gains_a_published_item_stops_being_reported_as_empty(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $category = ResourceCategory::where('slug', 'webinars')->sole();
        ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Webinar', 'status' => 'published', 'external_url' => 'https://example.com/w']);

        $cards = (new ResourcesPromoBlock)->resolve([])['cards'];

        $this->assertTrue(collect($cards)->contains('href', '/resources/webinars'));
        $this->assertFalse(collect($cards)->contains('href', '/resources/brochures'));
    }

    public function test_an_empty_category_is_directly_reachable_with_no_redirect_and_no_dead_end(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        // The plan is explicit: no automatic redirect of empty categories to
        // Home. A direct visit must resolve, not bounce anywhere.
        $response = $this->get('/resources/brochures');
        $response->assertOk();
        $this->assertFalse($response->isRedirect());
    }
}
