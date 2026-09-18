<?php

namespace Tests\Feature;

use App\Models\Page;
use App\Models\PageRevision;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PageContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

// Covers PageContentController's two remaining fixed-field pages, Contact
// and Locations — Home and About both moved to the block-page system (see
// Tests\Feature\BlockPageTest), so every generic draft/publish/restore/
// conflict test below exercises Contact instead, which is otherwise
// identical machinery (App\Services\PagePublishingService).
class PageContentTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    /** A staff user whose role only grants a single, unrelated section — used for PUB-01 preview's permission test. */
    private function staffWithoutPagesAccess(): void
    {
        $role = Role::create(['name' => 'Analytics Only', 'permissions' => [
            'analytics' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    private function saveDraft(string $slug, array $data, ?int $baseRevisionId = null): TestResponse
    {
        return $this->putJson("/admin/pages/{$slug}", [...$data, 'base_revision_id' => $baseRevisionId]);
    }

    private function publish(string $slug): TestResponse
    {
        return $this->putJson("/admin/pages/{$slug}/publish");
    }

    // Home and About's own content is block-based now — see
    // Tests\Feature\BlockPageTest.

    public function test_contact_renders_seeded_content(): void
    {
        $this->seed(PageContentSeeder::class);

        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', 'Talk to Our Team'));
    }

    public function test_contact_renders_with_no_seeded_row(): void
    {
        $this->get('/contact')->assertOk()->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', ''));
        $this->assertDatabaseHas('pages', ['slug' => 'contact']);
    }

    // PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): an
    // ordinary Save creates a draft revision only — the live `pages` row,
    // and therefore the public page, is untouched until an explicit
    // Publish. Only then does the change reach /contact.
    public function test_staff_can_save_a_draft_and_publish_makes_it_live(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        $saveResponse = $this->saveDraft('contact', [
            'hero_heading' => 'Who We Are',
            'hero_subheading' => 'Updated subheading.',
        ])->assertOk()->assertJson(['conflict' => false, 'hasUnpublishedChanges' => true])
            ->assertJsonPath('content.heroHeading', 'Who We Are');

        // The live page still shows the original, seeded content.
        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', 'Talk to Our Team'));
        $this->assertDatabaseHas('pages', ['slug' => 'contact', 'hero_heading' => 'Talk to Our Team']);
        $this->assertDatabaseHas('page_revisions', ['status' => 'draft', 'page_id' => Page::where('slug', 'contact')->value('id')]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'draft_saved', 'subject_type' => 'page']);

        $baseRevisionId = $saveResponse->json('baseRevisionId');
        $this->publish('contact')->assertOk()->assertJson(['hasUnpublishedChanges' => false])
            ->assertJsonPath('content.heroHeading', 'Who We Are');

        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', 'Who We Are'));
        $this->assertDatabaseHas('pages', ['slug' => 'contact', 'hero_heading' => 'Who We Are']);
        $this->assertDatabaseHas('page_revisions', ['id' => $baseRevisionId, 'status' => 'published']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'published', 'subject_type' => 'page']);
    }

    public function test_publishing_without_a_pending_draft_is_rejected_and_leaves_the_live_page_untouched(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        $this->publish('contact')->assertStatus(422);

        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', 'Talk to Our Team'));
    }

    public function test_page_content_requires_staff_and_valid_sections(): void
    {
        $this->put('/admin/pages/contact', ['hero_heading' => 'X'])->assertRedirect('/login');

        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->put('/admin/pages/contact', ['hero_heading' => 'X'])->assertForbidden();

        $this->staff();
        $this->putJson('/admin/pages/locations', ['sections' => [['description' => 'Missing heading']]])
            ->assertUnprocessable()->assertJsonValidationErrors('sections.0.heading');

        $this->put('/admin/pages/not-a-real-page', ['hero_heading' => 'X'])->assertNotFound();
        // Home and About genuinely exist as pages now, but not on this
        // fixed-field mechanism any more.
        $this->put('/admin/pages/home', ['hero_heading' => 'X'])->assertNotFound();
        // /admin/pages/about still exists as a GET-only redirect to the
        // block editor, so a PUT there is a real 405, not a 404.
        $this->put('/admin/pages/about', ['hero_heading' => 'X'])->assertStatus(405);
    }

    public function test_sustainability_is_no_longer_an_editable_or_public_resource_page(): void
    {
        $this->staff();

        $this->get('/admin/pages/sustainability')->assertNotFound();
        $this->get('/admin/pages/sustainability/preview')->assertNotFound();
        $this->putJson('/admin/pages/sustainability', [])->assertNotFound();
        $this->get('/resources/sustainability')->assertNotFound();
        $this->get('/admin/resources/sustainability')->assertNotFound();
    }

    public function test_seed_is_idempotent_and_preserves_staff_edits(): void
    {
        $this->seed(PageContentSeeder::class);
        Page::where('slug', 'contact')->firstOrFail()->update(['hero_heading' => 'Renamed by staff']);
        $this->seed(PageContentSeeder::class);

        // The seed pack contains the current public page content. Home and
        // About (already present from migrations, block-based) plus the
        // remaining pages this seeder actually populates.
        $this->assertDatabaseCount('pages', 5);
        $this->assertDatabaseHas('pages', ['slug' => 'contact', 'hero_heading' => 'Renamed by staff']);
    }

    // Home's home_blocks toggle mechanism was replaced by the block system
    // — see Tests\Feature\BlockPageTest for its equivalent coverage.

    // CMS-01: Contact's editor never sends intro_body/sections (that
    // template doesn't use them) — a save from it must not null out a value
    // already stored in those fields from before the field was hidden. Under
    // PUB-01 this now means the DRAFT snapshot preserves them (the draft
    // always starts from the live row's current values); publishing then
    // carries them through to the live row unchanged.
    public function test_saving_contact_without_unused_fields_preserves_their_existing_stored_values(): void
    {
        $this->staff();
        Page::firstOrCreate(['slug' => 'contact'])->update([
            'intro_body' => 'Legacy body nobody edits through the UI anymore.',
            'sections' => [['heading' => 'Legacy', 'description' => 'Still here.']],
        ]);

        $this->saveDraft('contact', [
            'hero_heading' => 'Contact Us',
            'hero_subheading' => 'We would love to hear from you.',
        ])->assertOk()
            ->assertJsonPath('content.introBody', 'Legacy body nobody edits through the UI anymore.')
            ->assertJsonPath('content.sections.0.heading', 'Legacy');

        $this->publish('contact')->assertOk();

        $this->assertDatabaseHas('pages', [
            'slug' => 'contact',
            'hero_heading' => 'Contact Us',
            'intro_body' => 'Legacy body nobody edits through the UI anymore.',
        ]);
        $page = Page::where('slug', 'contact')->firstOrFail();
        $this->assertSame('Legacy', $page->sections[0]['heading']);
    }

    // PUB-01: restoring a past revision as the new current draft must load
    // that snapshot without publishing it — the live page stays exactly as
    // it was until a separate, explicit Publish.
    public function test_restore_as_draft_loads_a_past_snapshot_without_touching_the_live_page(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        $first = $this->saveDraft('contact', ['hero_heading' => 'First Draft'])->assertOk();
        $this->publish('contact')->assertOk();
        $firstRevisionId = $first->json('baseRevisionId');

        $second = $this->saveDraft('contact', ['hero_heading' => 'Second Draft'], $firstRevisionId)->assertOk();
        // Not published — "Second Draft" never reaches the live page.

        $restoreResponse = $this->putJson("/admin/pages/contact/revisions/{$firstRevisionId}/restore")
            ->assertOk()->assertJson(['hasUnpublishedChanges' => true])
            ->assertJsonPath('content.heroHeading', 'First Draft');

        // The live page is still "First Draft" (the last published state) —
        // restoring-as-draft never touched it, even though a "Second Draft"
        // save had happened in between.
        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', 'First Draft'));
        $this->assertDatabaseHas('pages', ['slug' => 'contact', 'hero_heading' => 'First Draft']);

        // Restoring inserted a brand new revision rather than overwriting
        // the "Second Draft" one — both remain in history, recoverable.
        $restoredId = $restoreResponse->json('baseRevisionId');
        $this->assertNotSame($second->json('baseRevisionId'), $restoredId);
        $this->assertDatabaseHas('page_revisions', ['id' => $second->json('baseRevisionId'), 'status' => 'draft']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'restored_as_draft', 'subject_type' => 'page']);

        // Publishing the restored draft now does carry "First Draft" through
        // (it already matched, but proves restore's snapshot is what a
        // subsequent publish actually uses).
        $this->publish('contact')->assertOk()->assertJsonPath('content.heroHeading', 'First Draft');
    }

    public function test_restoring_a_revision_from_a_different_page_is_rejected(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        $this->saveDraft('contact', ['hero_heading' => 'Contact Draft'])->assertOk();
        $locationsRevisionId = $this->saveDraft('locations', ['hero_heading' => 'Locations Draft'])->json('baseRevisionId');

        $this->putJson("/admin/pages/contact/revisions/{$locationsRevisionId}/restore")->assertNotFound();
    }

    // PUB-02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): the
    // draft-save action must detect a concurrent edit — the editor's
    // `base_revision_id` no longer matching the page's actual latest
    // revision — and refuse to overwrite it. The response carries enough of
    // the now-current draft's content for the frontend to reconcile, and
    // the losing request's own snapshot is simply never written, not
    // discarded from wherever the frontend is still holding it.
    public function test_concurrent_draft_save_is_detected_and_reported_without_overwriting(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        // Editor A loads the page (no revisions yet, so their base is null)
        // and, unbeknownst to them, editor B saves first.
        $this->saveDraft('contact', ['hero_heading' => 'Editor B Wins The Race'])->assertOk();

        // Editor A now tries to save from their stale base (null).
        $conflict = $this->saveDraft('contact', ['hero_heading' => 'Editor A Never Saw This'], null)
            ->assertStatus(409)
            ->assertJson(['conflict' => true]);

        $conflict->assertJsonPath('current.content.heroHeading', 'Editor B Wins The Race');
        $this->assertNotNull($conflict->json('current.revisionId'));
        $this->assertNotNull($conflict->json('current.authorName'));

        // Editor A's attempted content was never persisted anywhere.
        $this->assertFalse(PageRevision::query()->get()->contains(
            fn (PageRevision $revision) => ($revision->snapshot['hero_heading'] ?? null) === 'Editor A Never Saw This',
        ));

        // Editor B's draft — the actual current state — is exactly what the
        // conflict response described, and nothing was silently published.
        $this->assertDatabaseHas('page_revisions', ['status' => 'draft']);
        $page = Page::where('slug', 'contact')->firstOrFail();
        $this->assertNotSame('Editor B Wins The Race', $page->hero_heading);

        // Editor A can now retry from the correct base and succeed.
        $retryBase = $conflict->json('current.revisionId');
        $this->saveDraft('contact', ['hero_heading' => 'Editor A Reconciled'], $retryBase)
            ->assertOk()->assertJson(['conflict' => false]);
    }

    // Publishing flips the SAME revision row's status (draft -> published)
    // rather than inserting a new row, so its id is unchanged — a save from
    // an editor still holding that same id as their base is therefore not a
    // version conflict (the content they started from wasn't overwritten;
    // it was simply promoted to live). It correctly proceeds as the next
    // draft, layered on top of the now-published content, with no data
    // lost on either side: "Published Version" stays live, "Next Edit"
    // becomes the new pending draft.
    public function test_saving_again_after_publish_starts_a_new_draft_without_a_spurious_conflict(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        $first = $this->saveDraft('contact', ['hero_heading' => 'Published Version'])->assertOk();
        $this->publish('contact')->assertOk();

        $second = $this->saveDraft('contact', ['hero_heading' => 'Next Edit'], $first->json('baseRevisionId'))
            ->assertOk()->assertJson(['conflict' => false])
            ->assertJsonPath('content.heroHeading', 'Next Edit');

        $this->assertNotSame($first->json('baseRevisionId'), $second->json('baseRevisionId'));
        $this->assertDatabaseHas('pages', ['slug' => 'contact', 'hero_heading' => 'Published Version']);
        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', 'Published Version'));
    }

    // PUB-01: the authenticated preview must render the draft (not the
    // live) content, be noindex, and require the same `pages,view`
    // permission as the editor — never reachable without it.
    public function test_preview_renders_draft_content_is_noindex_and_requires_pages_view_permission(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        $this->saveDraft('contact', ['hero_heading' => 'Preview Only Heading'])->assertOk();

        // The live public page is unaffected...
        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', 'Talk to Our Team'));

        // ...but the preview shows the draft, and carries the `preview`
        // flag every one of these templates uses to set PageMeta's noindex
        // (SSR-dependent HTML assertions belong in PublicSeoRenderingTest,
        // not here — this only needs to prove the prop that drives it).
        $this->get('/admin/pages/contact/preview')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('contact')
                ->where('content.heroHeading', 'Preview Only Heading')
                ->where('preview', true));

        $this->staffWithoutPagesAccess();
        $this->get('/admin/pages/contact/preview')->assertForbidden();

        auth()->logout();
        $this->get('/admin/pages/contact/preview')->assertRedirect('/login');
    }

    public function test_preview_falls_back_to_live_content_when_there_is_no_pending_draft(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        $this->get('/admin/pages/contact/preview')->assertInertia(fn (Assert $page) => $page->where('content.heroHeading', 'Talk to Our Team'));
    }

    public function test_admin_editor_resumes_the_pending_draft_and_lists_revision_history(): void
    {
        $this->seed(PageContentSeeder::class);
        $this->staff();

        $this->get('/admin/pages/contact')->assertInertia(fn (Assert $page) => $page
            ->where('hasUnpublishedChanges', false)
            ->where('baseRevisionId', null)
            ->has('revisions', 0));

        $saved = $this->saveDraft('contact', ['hero_heading' => 'Draft In Progress'])->assertOk();

        $this->get('/admin/pages/contact')->assertInertia(fn (Assert $page) => $page
            ->where('content.heroHeading', 'Draft In Progress')
            ->where('hasUnpublishedChanges', true)
            ->where('baseRevisionId', $saved->json('baseRevisionId'))
            ->has('revisions', 1)
            ->where('revisions.0.status', 'draft'));
    }
}
