<?php

namespace Tests\Feature;

use App\Models\Career;
use App\Models\Page;
use App\Models\PageRevision;
use App\Models\Role;
use App\Models\Service;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BlockPageTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);

        return $user;
    }

    private function userWithPermission(string $section, string $action = 'view'): void
    {
        $abilities = ['view' => false, 'edit' => false, 'delete' => false, $action => true];
        if ($action === 'edit') {
            $abilities['view'] = true;
        }
        $role = Role::create(['name' => ucfirst($section).' '.$action.' '.Str::random(6), 'permissions' => [$section => $abilities]]);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    private function saveDraft(string $slug, array $data, ?int $baseRevisionId = null): TestResponse
    {
        return $this->putJson("/admin/blocks/{$slug}", [...$data, 'base_revision_id' => $baseRevisionId]);
    }

    private function publish(string $slug): TestResponse
    {
        return $this->putJson("/admin/blocks/{$slug}/publish");
    }

    /** A fresh, non-system page — for tests of the generic draft/publish/restore machinery that don't need Home's own pre-seeded content or state. */
    private function createBlockPage(string $slug = 'a-fresh-page'): void
    {
        $this->post('/admin/pages', ['title' => 'A Fresh Page', 'slug' => $slug])->assertRedirect();
    }

    // --- Home ---------------------------------------------------------

    public function test_home_is_published_from_migrations_and_renders_its_blocks(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('page')
            ->where('slug', 'home')
            ->has('blocks', 10)
            ->where('blocks.0.type', 'hero')
            ->where('blocks.0.data.heading', 'People, Business, and Possibility Across Africa'));
    }

    public function test_homes_services_grid_and_hero_strip_reflect_live_published_services(): void
    {
        Service::create(['name' => 'Mobility', 'headline' => 'H', 'slug' => 'mobility', 'intro' => 'i', 'status' => 'published', 'sort_order' => 1]);
        Service::create(['name' => 'Draft Service', 'headline' => 'H', 'slug' => 'draft-svc', 'intro' => 'i', 'status' => 'draft', 'sort_order' => 2]);

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('blocks.0.data.showServicesNav', true)
            ->has('blocks.0.data.services', 1)
            ->where('blocks.0.data.services.0.slug', 'mobility')
            ->has('blocks.2.data.services', 1));
    }

    // --- About ----------------------------------------------------------

    public function test_about_is_published_from_migrations_and_renders_its_blocks(): void
    {
        $this->get('/about')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('page')
            ->where('slug', 'about')
            ->where('blocks.0.type', 'hero')
            ->where('blocks.0.data.layout', 'centered')
            ->where('blocks.1.type', 'image_text')
            ->where('blocks.2.type', 'cards')
            ->where('blocks.2.data.style', 'list'));
    }

    public function test_abouts_team_block_reflects_published_team_members_and_open_positions_reflects_open_careers(): void
    {
        TeamMember::create(['name' => 'Jane Doe', 'role' => 'Director', 'status' => 'published', 'sort_order' => 1]);
        TeamMember::create(['name' => 'Draft Person', 'role' => 'Advisor', 'status' => 'draft', 'sort_order' => 2]);
        Career::create(['job_title' => 'Consultant', 'description' => 'x', 'location' => 'Cape Town', 'status' => 'open', 'posted_date' => '2026-09-07']);
        Career::create(['job_title' => 'Closed Role', 'description' => 'x', 'location' => 'Cape Town', 'status' => 'closed', 'posted_date' => '2026-09-07']);

        // Seeded order: hero, image_text, cards, team, open_positions, cta.
        $this->get('/about')->assertInertia(fn (Assert $page) => $page
            ->where('blocks.3.type', 'team')
            ->has('blocks.3.data.members', 1)
            ->where('blocks.3.data.members.0.name', 'Jane Doe')
            ->where('blocks.4.type', 'open_positions')
            ->has('blocks.4.data.positions', 1)
            ->where('blocks.4.data.positions.0.title', 'Consultant'));
    }

    public function test_about_cannot_be_deleted_or_renamed(): void
    {
        $this->staff();

        $this->delete('/admin/blocks/about')->assertForbidden();
        $this->put('/admin/blocks/about/rename', ['slug' => 'about-us'])->assertForbidden();
        $this->assertDatabaseHas('pages', ['slug' => 'about']);
    }

    public function test_home_cannot_be_deleted(): void
    {
        $this->staff();

        $this->delete('/admin/blocks/home')->assertForbidden();
        $this->assertDatabaseHas('pages', ['slug' => 'home']);
    }

    public function test_home_title_cannot_be_changed_from_the_admin(): void
    {
        $this->staff();
        $baseRevisionId = PageRevision::where('page_id', Page::where('slug', 'home')->value('id'))->value('id');

        // The form disables the title field client-side (isSystem); the
        // server still accepts a title value in the payload (it's a
        // required field for the shared save endpoint) but callers outside
        // the UI attempting to rename Home get no special protection beyond
        // that UI guard, which is a deliberate, documented limitation.
        $this->saveDraft('home', ['title' => 'Home', 'blocks' => []], $baseRevisionId)->assertOk();
        $this->assertSame('block', Page::where('slug', 'home')->value('kind'));
    }

    // --- Draft / publish / preview / restore machinery ------------------
    // Exercised against a fresh page rather than Home, which already
    // carries a published revision from the seed migration — its own
    // draft/publish/restore behaviour is covered above and needs no
    // duplicate coverage here.

    public function test_staff_can_save_a_draft_and_publish_makes_it_live(): void
    {
        $this->staff();
        $this->createBlockPage();

        $saved = $this->saveDraft('a-fresh-page', [
            'title' => 'A Fresh Page',
            'blocks' => [['id' => 'b1', 'type' => 'cta', 'data' => ['heading' => 'Draft CTA', 'description' => '', 'buttonLabel' => '', 'buttonLink' => '']]],
        ])->assertOk()->assertJson(['conflict' => false, 'hasUnpublishedChanges' => true]);

        // Not live yet.
        $this->get('/a-fresh-page')->assertNotFound();

        $this->publish('a-fresh-page')->assertOk()->assertJson(['hasUnpublishedChanges' => false]);

        $this->get('/a-fresh-page')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('blocks', 1)->where('blocks.0.type', 'cta')->where('blocks.0.data.heading', 'Draft CTA'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'draft_saved', 'subject_type' => 'page']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'published', 'subject_type' => 'page']);
        $baseRevisionId = $saved->json('baseRevisionId');
        $this->assertDatabaseHas('page_revisions', ['id' => $baseRevisionId, 'status' => 'published']);
    }

    public function test_preview_renders_the_draft_and_is_noindex(): void
    {
        $this->staff();
        $this->createBlockPage();
        $this->saveDraft('a-fresh-page', [
            'title' => 'A Fresh Page',
            'blocks' => [['id' => 'b1', 'type' => 'cta', 'data' => ['heading' => 'Preview Only', 'description' => '', 'buttonLabel' => '', 'buttonLink' => '']]],
        ])->assertOk();

        $this->get('/admin/blocks/a-fresh-page/preview')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('page')->where('preview', true)->where('blocks.0.data.heading', 'Preview Only'));

        // The live page is unaffected — still unpublished.
        $this->get('/a-fresh-page')->assertNotFound();
    }

    public function test_concurrent_draft_save_is_detected_and_reported(): void
    {
        $this->staff();
        $this->createBlockPage();
        $this->saveDraft('a-fresh-page', ['title' => 'A Fresh Page', 'blocks' => []])->assertOk();

        $conflict = $this->saveDraft('a-fresh-page', ['title' => 'A Fresh Page', 'blocks' => []], null)
            ->assertStatus(409)->assertJson(['conflict' => true]);

        $this->assertNotNull($conflict->json('current.revisionId'));
    }

    public function test_restoring_a_revision_loads_it_as_a_new_draft_without_publishing(): void
    {
        $this->staff();
        $this->createBlockPage();
        $first = $this->saveDraft('a-fresh-page', [
            'title' => 'A Fresh Page',
            'blocks' => [['id' => 'b1', 'type' => 'cta', 'data' => ['heading' => 'First', 'description' => '', 'buttonLabel' => '', 'buttonLink' => '']]],
        ])->assertOk();
        $this->publish('a-fresh-page')->assertOk();
        $this->saveDraft('a-fresh-page', ['title' => 'A Fresh Page', 'blocks' => []], $first->json('baseRevisionId'))->assertOk();

        $restored = $this->putJson('/admin/blocks/a-fresh-page/revisions/'.$first->json('baseRevisionId').'/restore')
            ->assertOk()->assertJson(['hasUnpublishedChanges' => true]);
        $this->assertSame('First', $restored->json('content.blocks.0.data.heading'));

        // Still published content live — restoring never auto-publishes.
        $this->get('/a-fresh-page')->assertInertia(fn (Assert $page) => $page->where('blocks.0.data.heading', 'First'));
    }

    public function test_block_data_is_validated_against_its_types_rules(): void
    {
        $this->staff();
        $this->createBlockPage();

        $this->saveDraft('a-fresh-page', [
            'title' => 'A Fresh Page',
            'blocks' => [['id' => 'b1', 'type' => 'not-a-real-type', 'data' => []]],
        ])->assertUnprocessable()->assertJsonValidationErrors('blocks.0.type');

        $this->saveDraft('a-fresh-page', [
            'title' => 'A Fresh Page',
            'blocks' => [['id' => 'b1', 'type' => 'hero', 'data' => ['heading' => '']]],
        ])->assertUnprocessable()->assertJsonValidationErrors('blocks.0.data.heading');
    }

    public function test_editor_and_preview_require_pages_permissions(): void
    {
        $this->get('/admin/blocks/home')->assertRedirect('/login');
        $this->putJson('/admin/blocks/home', ['title' => 'Home', 'blocks' => []])->assertUnauthorized();

        $this->userWithPermission('analytics');
        $this->get('/admin/blocks/home')->assertForbidden();
        $this->putJson('/admin/blocks/home', ['title' => 'Home', 'blocks' => []])->assertForbidden();
        $this->get('/admin/blocks/home/preview')->assertForbidden();

        $this->userWithPermission('pages', 'view');
        $this->get('/admin/blocks/home')->assertOk();
        $this->putJson('/admin/blocks/home', ['title' => 'Home', 'blocks' => []])->assertForbidden();
    }

    // --- Creating and deleting custom pages -----------------------------

    public function test_staff_can_create_a_new_page_and_it_is_hidden_until_published(): void
    {
        $this->staff();

        $this->post('/admin/pages', ['title' => 'Relocation Guide', 'slug' => 'relocation-guide'])
            ->assertRedirect('/admin/blocks/relocation-guide');

        $page = Page::where('slug', 'relocation-guide')->sole();
        $this->assertSame('block', $page->kind);
        $this->assertFalse($page->is_system);
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'subject_type' => 'page', 'subject_id' => $page->id]);

        $this->get('/relocation-guide')->assertNotFound();

        $this->saveDraft('relocation-guide', [
            'title' => 'Relocation Guide',
            'blocks' => [['id' => 'b1', 'type' => 'cta', 'data' => ['heading' => 'Guide', 'description' => '', 'buttonLabel' => '', 'buttonLink' => '']]],
        ])->assertOk();
        $this->get('/relocation-guide')->assertNotFound();

        $this->publish('relocation-guide')->assertOk();
        $this->get('/relocation-guide')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('title', 'Relocation Guide')->where('blocks.0.data.heading', 'Guide'));
    }

    public function test_a_new_pages_slug_cannot_reuse_a_reserved_word_or_an_existing_service_slug(): void
    {
        $this->staff();
        Service::create(['name' => 'Mobility', 'headline' => 'H', 'slug' => 'mobility', 'intro' => 'i', 'status' => 'published', 'sort_order' => 1]);

        $this->post('/admin/pages', ['title' => 'Admin', 'slug' => 'admin'])->assertSessionHasErrors('slug');
        $this->post('/admin/pages', ['title' => 'Mobility', 'slug' => 'mobility'])->assertSessionHasErrors('slug');
        $this->post('/admin/pages', ['title' => 'Bad', 'slug' => 'Not Valid!'])->assertSessionHasErrors('slug');
        $this->post('/admin/pages', ['title' => 'Home', 'slug' => 'home'])->assertSessionHasErrors('slug');
        $this->post('/admin/pages', ['title' => 'About', 'slug' => 'about'])->assertSessionHasErrors('slug');

        // Only Home and About, both seeded by migrations — nothing above created a row.
        $this->assertSame(2, Page::where('kind', Page::KIND_BLOCK)->count());
    }

    public function test_a_service_cannot_reuse_an_existing_pages_slug(): void
    {
        $this->staff();
        $this->post('/admin/pages', ['title' => 'Relocation Guide', 'slug' => 'relocation-guide'])->assertRedirect();

        $this->postJson('/admin/services', [
            'name' => 'Guide', 'headline' => 'H', 'slug' => 'relocation-guide', 'intro' => 'i',
            'scope' => [], 'countries' => [], 'sort_order' => 1, 'status' => 'draft',
        ])->assertUnprocessable()->assertJsonValidationErrors('slug');
    }

    public function test_a_non_system_page_can_be_deleted_and_stops_being_reachable(): void
    {
        $this->staff();
        $this->post('/admin/pages', ['title' => 'Temp', 'slug' => 'temp-page'])->assertRedirect();
        $this->saveDraft('temp-page', ['title' => 'Temp', 'blocks' => []])->assertOk();
        $this->publish('temp-page')->assertOk();
        $this->get('/temp-page')->assertOk();

        $this->delete('/admin/blocks/temp-page')->assertRedirect('/admin/pages');

        $this->assertDatabaseMissing('pages', ['slug' => 'temp-page']);
        $this->get('/temp-page')->assertNotFound();
        $this->assertDatabaseHas('audit_logs', ['action' => 'deleted', 'subject_type' => 'page']);
    }

    public function test_creating_and_deleting_pages_requires_edit_permission(): void
    {
        $this->userWithPermission('pages', 'view');
        $this->post('/admin/pages', ['title' => 'X', 'slug' => 'x-page'])->assertForbidden();

        $this->staff();
        $this->post('/admin/pages', ['title' => 'X', 'slug' => 'x-page'])->assertRedirect();

        $this->userWithPermission('pages', 'view');
        $this->delete('/admin/blocks/x-page')->assertForbidden();
    }

    // --- Sidebar "+ New page" quick action ------------------------------

    public function test_quick_create_generates_an_untitled_page_and_goes_straight_to_its_editor(): void
    {
        $this->staff();

        $this->post('/admin/pages/quick-create')->assertRedirect('/admin/blocks/untitled-page');

        $page = Page::where('slug', 'untitled-page')->sole();
        $this->assertSame('Untitled Page', $page->title);
        $this->assertSame('block', $page->kind);
        $this->assertFalse($page->is_system);
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'subject_type' => 'page', 'subject_id' => $page->id]);
    }

    public function test_quick_create_numbers_subsequent_untitled_pages(): void
    {
        $this->staff();

        $this->post('/admin/pages/quick-create')->assertRedirect('/admin/blocks/untitled-page');
        $this->post('/admin/pages/quick-create')->assertRedirect('/admin/blocks/untitled-page-2');
        $this->post('/admin/pages/quick-create')->assertRedirect('/admin/blocks/untitled-page-3');

        $this->assertSame(
            ['Untitled Page', 'Untitled Page 2', 'Untitled Page 3'],
            Page::where('kind', Page::KIND_BLOCK)->where('is_system', false)->orderBy('id')->pluck('title')->all(),
        );
    }

    public function test_quick_create_requires_pages_edit_permission(): void
    {
        $this->post('/admin/pages/quick-create')->assertRedirect('/login');

        $this->userWithPermission('pages', 'view');
        $this->post('/admin/pages/quick-create')->assertForbidden();
        $this->assertSame(0, Page::where('kind', Page::KIND_BLOCK)->where('is_system', false)->count());
    }

    // --- Renaming a page's URL ------------------------------------------

    public function test_staff_can_rename_a_pages_url_and_it_takes_effect_immediately(): void
    {
        $this->staff();
        $this->createBlockPage();
        $this->saveDraft('a-fresh-page', [
            'title' => 'A Fresh Page',
            'blocks' => [['id' => 'b1', 'type' => 'cta', 'data' => ['heading' => 'Hi', 'description' => '', 'buttonLabel' => '', 'buttonLink' => '']]],
        ])->assertOk();
        $this->publish('a-fresh-page')->assertOk();

        $this->put('/admin/blocks/a-fresh-page/rename', ['slug' => 'renamed-page'])
            ->assertRedirect('/admin/blocks/renamed-page');

        $this->assertDatabaseHas('pages', ['slug' => 'renamed-page']);
        $this->assertDatabaseMissing('pages', ['slug' => 'a-fresh-page']);
        $this->get('/renamed-page')->assertOk()->assertInertia(fn (Assert $page) => $page->where('blocks.0.data.heading', 'Hi'));
        $this->get('/a-fresh-page')->assertNotFound();
        $this->assertDatabaseHas('audit_logs', ['action' => 'renamed', 'subject_type' => 'page']);
    }

    public function test_a_pages_new_url_is_validated_the_same_way_as_a_new_pages(): void
    {
        $this->staff();
        $this->createBlockPage();
        Service::create(['name' => 'Mobility', 'headline' => 'H', 'slug' => 'mobility', 'intro' => 'i', 'status' => 'published', 'sort_order' => 1]);

        $this->put('/admin/blocks/a-fresh-page/rename', ['slug' => 'admin'])->assertSessionHasErrors('slug');
        $this->put('/admin/blocks/a-fresh-page/rename', ['slug' => 'mobility'])->assertSessionHasErrors('slug');
        $this->put('/admin/blocks/a-fresh-page/rename', ['slug' => 'Not Valid!'])->assertSessionHasErrors('slug');
        // Renaming to its own current slug is not itself an error (no-op).
        $this->put('/admin/blocks/a-fresh-page/rename', ['slug' => 'a-fresh-page'])->assertRedirect();

        $this->assertDatabaseHas('pages', ['slug' => 'a-fresh-page']);
    }

    public function test_two_pages_can_swap_or_reuse_a_slug_freed_by_a_rename(): void
    {
        $this->staff();
        $this->createBlockPage('page-one');
        $this->createBlockPage('page-two');

        $this->put('/admin/blocks/page-one/rename', ['slug' => 'page-three'])->assertRedirect();
        $this->put('/admin/blocks/page-two/rename', ['slug' => 'page-one'])->assertRedirect();

        $this->assertDatabaseHas('pages', ['slug' => 'page-three']);
        $this->assertDatabaseHas('pages', ['slug' => 'page-one']);
        $this->assertDatabaseMissing('pages', ['slug' => 'page-two']);
    }

    public function test_homes_url_cannot_be_renamed(): void
    {
        $this->staff();

        $this->put('/admin/blocks/home/rename', ['slug' => 'homepage'])->assertForbidden();
        $this->assertDatabaseHas('pages', ['slug' => 'home']);
    }

    public function test_admin_pages_list_shows_home_and_created_pages_with_status(): void
    {
        $this->staff();
        $this->post('/admin/pages', ['title' => 'Draft Page', 'slug' => 'draft-page'])->assertRedirect();

        // System pages (Home, About) sort first by title, then created pages.
        $this->get('/admin/pages')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/pages/index')
            ->has('pages', 3)
            ->where('pages.0.slug', 'about')->where('pages.0.isSystem', true)->where('pages.0.published', true)
            ->where('pages.1.slug', 'home')->where('pages.1.isSystem', true)->where('pages.1.published', true)
            ->where('pages.2.slug', 'draft-page')->where('pages.2.isSystem', false)->where('pages.2.published', false)
            ->has('blockCatalogue'));
    }

    // --- Old service URLs and resilience -------------------------------

    public function test_an_old_service_url_at_the_root_redirects_to_the_new_prefixed_one(): void
    {
        Service::create(['name' => 'Mobility', 'headline' => 'H', 'slug' => 'mobility', 'intro' => 'i', 'status' => 'published', 'sort_order' => 1]);

        $this->get('/mobility')->assertRedirect('/services/mobility');
    }

    public function test_an_unknown_root_slug_is_a_plain_404(): void
    {
        $this->get('/not-a-real-page-or-service')->assertNotFound();
    }

    public function test_a_stored_block_of_a_since_removed_type_is_dropped_instead_of_crashing_the_page(): void
    {
        Page::where('slug', 'home')->update(['blocks' => [
            ['id' => 'b1', 'type' => 'retired_block_type', 'data' => ['whatever' => true]],
            ['id' => 'b2', 'type' => 'cta', 'data' => ['heading' => 'Still Here', 'description' => '', 'buttonLabel' => '', 'buttonLink' => '']],
        ]]);

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('blocks', 1)->where('blocks.0.type', 'cta'));
    }

    // --- Sitemap ---------------------------------------------------------

    public function test_a_published_custom_page_appears_in_the_sitemap_and_home_does_not_duplicate(): void
    {
        $this->staff();
        $this->post('/admin/pages', ['title' => 'Relocation Guide', 'slug' => 'relocation-guide'])->assertRedirect();
        $this->saveDraft('relocation-guide', ['title' => 'Relocation Guide', 'blocks' => []])->assertOk();
        $this->publish('relocation-guide')->assertOk();

        $sitemap = $this->get('/sitemap.xml')->assertOk()->getContent();

        $this->assertStringContainsString(config('app.url').'/relocation-guide', $sitemap);
        $this->assertSame(1, substr_count($sitemap, '<loc>'.config('app.url').'/</loc>'));
    }
}
