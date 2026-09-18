<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\LocationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocationsTest extends TestCase
{
    use RefreshDatabase;

    private function fields(array $overrides = []): array
    {
        return [...[
            'officeName' => 'Branch', 'address' => "Line one\nLine two", 'phone' => '', 'email' => '',
            'sortOrder' => 0, 'status' => 'published', 'isPrimary' => false,
        ], ...$overrides];
    }

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_saved_offices_are_ordered_on_contact_and_updates_persist(): void
    {
        $this->seed(LocationSeeder::class);
        $this->staff();
        $this->post('/admin/locations', $this->fields())->assertRedirect('/admin/locations');
        $location = Location::where('office_name', 'Branch')->firstOrFail();
        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->has('offices', 2)->where('offices.0.officeName', 'Branch')->where('offices.0.phone', '')->where('offices.0.email', ''));
        $this->patch('/admin/locations/'.$location->id, [...$this->fields(), 'officeName' => 'Edited', 'sortOrder' => 2])->assertRedirect();
        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->where('offices.1.officeName', 'Edited'));
        $this->get('/admin/locations')->assertInertia(fn (Assert $page) => $page->has('locations', 2));
    }

    public function test_staff_access_and_validation_are_required(): void
    {
        $this->seed(LocationSeeder::class);
        $location = Location::firstOrFail();
        $this->get('/admin/locations')->assertRedirect('/login');
        $this->post('/admin/locations', $this->fields())->assertRedirect('/login');
        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->get('/admin/locations')->assertForbidden();
        $this->post('/admin/locations', $this->fields())->assertForbidden();
        $this->patch('/admin/locations/'.$location->id, $this->fields())->assertForbidden();
        $this->staff();
        $this->postJson('/admin/locations', [...$this->fields(), 'email' => 'invalid', 'sortOrder' => -1])->assertUnprocessable();
        $this->assertDatabaseCount('locations', 1);
    }

    public function test_empty_contact_and_non_overwriting_seed(): void
    {
        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->has('offices', 0));
        $this->seed(LocationSeeder::class);
        Location::firstOrFail()->update(['office_name' => 'Renamed']);
        $this->seed(LocationSeeder::class);
        $this->assertDatabaseCount('locations', 1);
        $this->assertDatabaseHas('locations', ['office_name' => 'Renamed']);
    }

    // CMS-04: a row created (e.g. by LocationSeeder, or any row that existed
    // before the status column existed) with no explicit status still
    // defaults to 'published' at the database level, so it keeps appearing
    // publicly — the additive migration's whole point.
    public function test_a_pre_migration_style_row_with_no_explicit_status_still_shows_publicly(): void
    {
        Location::create(['office_name' => 'Legacy Office', 'address' => 'Somewhere', 'sort_order' => 1]);

        $this->assertDatabaseHas('locations', ['office_name' => 'Legacy Office', 'status' => 'published']);
        $this->get('/contact')->assertInertia(fn (Assert $page) => $page->has('offices', 1)->where('offices.0.officeName', 'Legacy Office'));
        $this->get('/locations')->assertInertia(fn (Assert $page) => $page->has('offices', 1)->where('offices.0.officeName', 'Legacy Office'));
    }

    // CMS-04: draft and archived offices must not appear on either public
    // consumer (/contact and /locations); only published ones may.
    public function test_draft_and_archived_offices_are_hidden_publicly_but_published_ones_show(): void
    {
        Location::create(['office_name' => 'Draft Office', 'address' => 'A', 'sort_order' => 1, 'status' => 'draft']);
        Location::create(['office_name' => 'Archived Office', 'address' => 'B', 'sort_order' => 2, 'status' => 'archived']);
        Location::create(['office_name' => 'Live Office', 'address' => 'C', 'sort_order' => 3, 'status' => 'published']);

        $this->get('/contact')->assertInertia(fn (Assert $page) => $page
            ->has('offices', 1)
            ->where('offices.0.officeName', 'Live Office'));

        $this->get('/locations')->assertInertia(fn (Assert $page) => $page
            ->has('offices', 1)
            ->where('offices.0.officeName', 'Live Office'));
    }

    // CMS-04: "surface a review list rather than silently unpublishing" —
    // the admin Offices listing must still include draft/archived rows (with
    // their status visible), not just published ones, so staff can find and
    // review them.
    public function test_admin_offices_listing_includes_draft_and_archived_rows_with_status(): void
    {
        Location::create(['office_name' => 'Draft Office', 'address' => 'A', 'sort_order' => 1, 'status' => 'draft']);
        Location::create(['office_name' => 'Archived Office', 'address' => 'B', 'sort_order' => 2, 'status' => 'archived']);
        $this->staff();

        $this->get('/admin/locations')->assertInertia(fn (Assert $page) => $page
            ->has('locations', 2)
            ->where('locations.0.status', 'Draft')
            ->where('locations.1.status', 'Archived'));
    }

    // CMS-04: setting a new primary office must atomically unset any
    // previous one — never two rows flagged primary at once.
    public function test_setting_a_new_primary_office_unsets_the_previous_one(): void
    {
        $this->staff();

        $this->post('/admin/locations', $this->fields(['officeName' => 'First', 'isPrimary' => true]))->assertRedirect();
        $first = Location::where('office_name', 'First')->firstOrFail();
        $this->assertTrue($first->fresh()->is_primary);

        $this->post('/admin/locations', $this->fields(['officeName' => 'Second', 'isPrimary' => true]))->assertRedirect();

        $this->assertFalse($first->fresh()->is_primary);
        $this->assertTrue(Location::where('office_name', 'Second')->firstOrFail()->is_primary);
        $this->assertSame(1, Location::where('is_primary', true)->count());
    }

    // Same invariant via update(), not just store(): editing an existing
    // office to primary must unset whichever office currently holds it.
    public function test_editing_an_office_to_primary_unsets_the_previous_primary(): void
    {
        $this->staff();
        $this->post('/admin/locations', $this->fields(['officeName' => 'First', 'isPrimary' => true]))->assertRedirect();
        $this->post('/admin/locations', $this->fields(['officeName' => 'Second', 'isPrimary' => false]))->assertRedirect();
        $first = Location::where('office_name', 'First')->firstOrFail();
        $second = Location::where('office_name', 'Second')->firstOrFail();

        $this->patch('/admin/locations/'.$second->id, $this->fields(['officeName' => 'Second', 'isPrimary' => true]))->assertRedirect();

        $this->assertFalse($first->fresh()->is_primary);
        $this->assertTrue($second->fresh()->is_primary);
        $this->assertSame(1, Location::where('is_primary', true)->count());
    }

    // CMS-04: the third "Page Copy" tab on /admin/locations is gated by the
    // `pages` permission independently of the `locations` permission that
    // already gates the whole route — and it reuses the exact PUT
    // /admin/pages/{slug} save path batch 3A built (now PUB-01's
    // draft-save path, docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B),
    // so saving from this tab context must still preserve stored fields the
    // locations template's FIELD_VISIBILITY hides (intro/sections), not
    // null them out — and, like every other Page save, only takes effect
    // once explicitly published.
    public function test_locations_page_copy_tab_is_exposed_and_saves_preserve_unset_fields(): void
    {
        Page::firstOrCreate(['slug' => 'locations'])->update([
            'intro_body' => 'Legacy body nobody edits through this tab.',
            'sections' => [['heading' => 'Legacy', 'description' => 'Still here.']],
        ]);
        $this->staff();

        $this->get('/admin/locations')->assertInertia(fn (Assert $page) => $page
            ->has('pageContent')
            ->where('pageContent.content.heroHeading', ''));

        $this->putJson('/admin/pages/locations', [
            'hero_heading' => 'Where We Work',
            'hero_subheading' => 'Offices and coverage across Africa.',
        ])->assertOk()->assertJsonPath('content.introBody', 'Legacy body nobody edits through this tab.');
        $this->putJson('/admin/pages/locations/publish')->assertOk();

        $this->assertDatabaseHas('pages', [
            'slug' => 'locations',
            'hero_heading' => 'Where We Work',
            'intro_body' => 'Legacy body nobody edits through this tab.',
        ]);
        $page = Page::where('slug', 'locations')->firstOrFail();
        $this->assertSame('Legacy', $page->sections[0]['heading']);

        $this->get('/admin/locations')->assertInertia(fn (Assert $page) => $page->where('pageContent.content.heroHeading', 'Where We Work'));
    }

    // A viewer with `locations,view` but not `pages,view` can still reach
    // /admin/locations (Offices/Countries) but must not receive the page-copy
    // dataset — grouping the tabs must not broaden either grant.
    public function test_a_role_with_only_locations_view_does_not_receive_page_copy(): void
    {
        $role = Role::create(['name' => 'Locations Only', 'permissions' => [
            'locations' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $user = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($user);

        $this->get('/admin/locations')->assertOk()->assertInertia(fn (Assert $page) => $page->missing('pageContent'));
    }
}
