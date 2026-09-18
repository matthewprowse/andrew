<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\User;
use Database\Seeders\ResourceCategorySeeder;
use Database\Seeders\ResourceItemSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ResourcesTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    private function media(): Media
    {
        return Media::create([
            'file_name' => 'handbook.pdf', 'alt_text' => null, 'file_path' => 'media/2026/09/handbook.pdf',
            'mime_type' => 'application/pdf', 'size' => 1024, 'kind' => 'document',
        ]);
    }

    private function fields(array $overrides = []): array
    {
        return [...[
            'title' => 'Relocation Handbook',
            'description' => 'Everything you need to plan a move.',
            'action_label' => 'Download PDF',
            'external_url' => '',
            'status' => 'draft',
            'sort_order' => 1,
        ], ...$overrides];
    }

    public function test_staff_can_add_items_and_published_items_appear_publicly(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->staff();
        $media = $this->media();

        $this->post('/admin/resources/brochures', [
            ...$this->fields(),
            'file_media_id' => $media->id,
        ])->assertRedirect('/admin/resources/brochures');

        $item = ResourceItem::firstOrFail();
        $this->assertSame($media->id, $item->file_media_id);

        $this->get('/resources/brochures')->assertInertia(fn (Assert $page) => $page->has('items', 0));

        $item->update(['status' => 'published']);
        $this->get('/resources/brochures')->assertInertia(fn (Assert $page) => $page
            ->has('items', 1)
            ->where('items.0.title', 'Relocation Handbook')
            ->where('items.0.fileName', 'handbook.pdf'));

        // PUB-04 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B).
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'subject_type' => 'resource_item', 'subject_id' => $item->id]);
    }

    public function test_resource_landing_uses_managed_categories_and_published_item_counts(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $category = ResourceCategory::where('slug', 'brochures')->sole();
        ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Private', 'status' => 'draft']);
        ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Public', 'status' => 'published']);

        $this->get('/resources')->assertInertia(fn (Assert $page) => $page
            ->where('slug', 'resources')
            ->has('categories', 3)
            ->where('categories.0.href', '/resources/brochures')
            ->where('categories.0.itemCount', 1));
    }

    public function test_layout_can_be_switched_and_reflects_publicly(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->staff();

        $this->get('/resources/webinars')->assertInertia(fn (Assert $page) => $page->where('layout', 'cards'));

        $this->patch('/admin/resources/webinars/layout', ['layout' => 'list'])->assertRedirect('/admin/resources/webinars');

        $this->get('/resources/webinars')->assertInertia(fn (Assert $page) => $page->where('layout', 'list'));
    }

    public function test_publishing_requires_a_file_or_external_link(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->staff();

        $this->postJson('/admin/resources/brochures', $this->fields(['status' => 'published']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file_media_id');

        $this->post('/admin/resources/brochures', $this->fields(['status' => 'published', 'external_url' => 'https://example.com/webinar']))
            ->assertRedirect('/admin/resources/brochures');
        $this->assertDatabaseCount('resource_items', 1);
    }

    public function test_file_media_id_must_reference_a_real_media_item(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->staff();

        $this->postJson('/admin/resources/brochures', [
            ...$this->fields(),
            'file_media_id' => 99999,
        ])->assertUnprocessable()->assertJsonValidationErrors('file_media_id');
    }

    public function test_editing_an_item_can_change_or_clear_its_file(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $this->staff();
        $media = $this->media();
        $this->post('/admin/resources/brochures', [...$this->fields(), 'file_media_id' => $media->id]);
        $item = ResourceItem::firstOrFail();

        $this->patch("/admin/resources/brochures/{$item->id}", $this->fields())->assertRedirect('/admin/resources/brochures');

        $this->assertNull($item->fresh()->file_media_id);

        // PUB-04 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B).
        $this->assertDatabaseHas('audit_logs', ['action' => 'updated', 'subject_type' => 'resource_item', 'subject_id' => $item->id]);
    }

    public function test_resources_require_staff_and_unknown_categories_404(): void
    {
        $this->seed(ResourceCategorySeeder::class);

        $this->get('/admin/resources/brochures')->assertRedirect('/login');
        $this->post('/admin/resources/brochures', $this->fields())->assertRedirect('/login');

        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->get('/admin/resources/brochures')->assertForbidden();

        $this->get('/resources/not-a-real-category')->assertNotFound();
        $this->get('/admin/resources/not-a-real-category')->assertNotFound();
    }

    public function test_seed_is_idempotent_and_preserves_staff_edits(): void
    {
        $this->seed([ResourceCategorySeeder::class, ResourceItemSeeder::class]);
        ResourceCategory::where('slug', 'webinars')->firstOrFail()->update(['layout' => 'list']);
        ResourceItem::firstOrFail()->update(['title' => 'Renamed by staff']);

        $this->seed([ResourceCategorySeeder::class, ResourceItemSeeder::class]);

        $this->assertDatabaseCount('resource_categories', 3);
        $this->assertDatabaseHas('resource_categories', ['slug' => 'webinars', 'layout' => 'list']);
        $this->assertDatabaseHas('resource_items', ['title' => 'Renamed by staff']);
    }
}
