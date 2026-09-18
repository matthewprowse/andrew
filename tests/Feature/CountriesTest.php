<?php

namespace Tests\Feature;

use App\Models\Country;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Database\Seeders\LocationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CountriesTest extends TestCase
{
    use RefreshDatabase;

    private function fields(array $overrides = []): array
    {
        return [...[
            'name' => 'Kenya', 'slug' => 'kenya', 'region' => 'East Africa',
            'description' => 'Coordination across East Africa.', 'sortOrder' => 1, 'status' => 'published',
        ], ...$overrides];
    }

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_public_locations_page_shows_offices_and_countries(): void
    {
        $this->seed([LocationSeeder::class, CountrySeeder::class]);

        $this->get('/locations')->assertInertia(fn (Assert $page) => $page
            ->has('offices', 1)
            ->where('offices.0.officeName', 'Head Office')
            ->has('countries', 12)
            ->where('countries.0.name', 'South Africa'));
    }

    public function test_country_detail_page_renders_and_unknown_slug_404s(): void
    {
        $this->seed(CountrySeeder::class);

        $this->get('/locations/kenya')->assertInertia(fn (Assert $page) => $page
            ->where('country.name', 'Kenya')
            ->where('country.region', 'East Africa'));

        $this->get('/locations/not-a-real-country')->assertNotFound();
    }

    public function test_staff_can_add_and_edit_countries_and_it_reflects_publicly(): void
    {
        $this->staff();

        $this->post('/admin/countries', $this->fields())->assertRedirect('/admin/locations');
        $country = Country::firstOrFail();
        $this->get('/locations/kenya')->assertInertia(fn (Assert $page) => $page->where('country.name', 'Kenya'));

        $this->patch("/admin/countries/{$country->id}", [...$this->fields(), 'name' => 'Kenya (East Africa Hub)'])
            ->assertRedirect('/admin/locations');
        $this->get('/locations/kenya')->assertInertia(fn (Assert $page) => $page->where('country.name', 'Kenya (East Africa Hub)'));

        $this->get('/admin/locations')->assertInertia(fn (Assert $page) => $page->has('countries', 1));
    }

    public function test_countries_require_staff_and_valid_unique_slug(): void
    {
        $this->post('/admin/countries', $this->fields())->assertRedirect('/login');

        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->post('/admin/countries', $this->fields())->assertForbidden();

        $this->staff();
        $this->postJson('/admin/countries', [...$this->fields(), 'slug' => 'Not A Slug!'])->assertUnprocessable();
        Country::create(['name' => 'Kenya', 'slug' => 'kenya', 'sort_order' => 1]);
        $this->postJson('/admin/countries', $this->fields())->assertUnprocessable();
    }

    public function test_seed_is_idempotent_and_preserves_staff_edits(): void
    {
        $this->seed(CountrySeeder::class);
        Country::where('slug', 'kenya')->firstOrFail()->update(['name' => 'Renamed by staff']);
        $this->seed(CountrySeeder::class);

        $this->assertDatabaseCount('countries', 12);
        $this->assertDatabaseHas('countries', ['slug' => 'kenya', 'name' => 'Renamed by staff']);
    }

    // CMS-04: a row created with no explicit status (e.g. by CountrySeeder,
    // or any row that existed before the status column existed) still
    // defaults to 'published' at the database level, so it keeps appearing
    // publicly — the additive migration's whole point.
    public function test_a_pre_migration_style_row_with_no_explicit_status_still_shows_publicly(): void
    {
        Country::create(['name' => 'Legacy Country', 'slug' => 'legacy-country', 'sort_order' => 1]);

        $this->assertDatabaseHas('countries', ['slug' => 'legacy-country', 'status' => 'published']);
        $this->get('/locations')->assertInertia(fn (Assert $page) => $page->has('countries', 1)->where('countries.0.slug', 'legacy-country'));
        $this->get('/locations/legacy-country')->assertInertia(fn (Assert $page) => $page->where('country.slug', 'legacy-country'));
    }

    // CMS-04: draft and archived countries must not appear on the public
    // locations listing, and their detail route must 404 rather than
    // silently render; published countries must still work.
    public function test_draft_and_archived_countries_are_hidden_publicly_but_published_ones_show(): void
    {
        Country::create(['name' => 'Draft Country', 'slug' => 'draft-country', 'sort_order' => 1, 'status' => 'draft']);
        Country::create(['name' => 'Archived Country', 'slug' => 'archived-country', 'sort_order' => 2, 'status' => 'archived']);
        Country::create(['name' => 'Live Country', 'slug' => 'live-country', 'sort_order' => 3, 'status' => 'published']);

        $this->get('/locations')->assertInertia(fn (Assert $page) => $page
            ->has('countries', 1)
            ->where('countries.0.slug', 'live-country'));

        $this->get('/locations/draft-country')->assertNotFound();
        $this->get('/locations/archived-country')->assertNotFound();
        $this->get('/locations/live-country')->assertInertia(fn (Assert $page) => $page->where('country.slug', 'live-country'));
    }

    // CMS-04: "surface a review list rather than silently unpublishing" —
    // the admin Countries listing must still include draft/archived rows
    // (with their status visible), not just published ones.
    public function test_admin_countries_listing_includes_draft_and_archived_rows_with_status(): void
    {
        Country::create(['name' => 'Draft Country', 'slug' => 'draft-country', 'sort_order' => 1, 'status' => 'draft']);
        Country::create(['name' => 'Archived Country', 'slug' => 'archived-country', 'sort_order' => 2, 'status' => 'archived']);
        $this->staff();

        $this->get('/admin/locations')->assertInertia(fn (Assert $page) => $page
            ->has('countries', 2)
            ->where('countries.0.status', 'Draft')
            ->where('countries.1.status', 'Archived'));
    }

    // CMS-04: draft/archived countries must also disappear from the
    // sitemap — otherwise it would list a URL that 404s.
    public function test_sitemap_only_lists_published_country_urls(): void
    {
        Country::create(['name' => 'Draft Country', 'slug' => 'draft-country', 'sort_order' => 1, 'status' => 'draft']);
        Country::create(['name' => 'Live Country', 'slug' => 'live-country', 'sort_order' => 2, 'status' => 'published']);

        $sitemap = $this->get('/sitemap.xml')->assertOk()->getContent();

        $this->assertStringContainsString('/locations/live-country', $sitemap);
        $this->assertStringNotContainsString('/locations/draft-country', $sitemap);
    }
}
