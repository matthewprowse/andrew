<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Country;
use App\Models\Faq;
use App\Models\Lead;
use App\Models\Location;
use App\Models\Media;
use App\Models\Page;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Models\Role;
use App\Models\Service;
use App\Models\Testimonial;
use App\Models\User;
use Database\Seeders\ResourceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * LIB-08 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4 batch 4C — the final
 * batch of Phase 4): global, permission-aware admin search. Each source is
 * asserted absent from the JSON response (not merely unmatched) when the
 * viewer's role lacks that source's own view grant — the plan's explicit
 * "gated ... before its records are even counted or returned" wording,
 * mirrored on the response shape the same way Phase 2's CompanyTest and
 * Phase 4B's ReusableContentTest assert missing Inertia props for an
 * ungranted tab.
 */
class AdminSearchTest extends TestCase
{
    use RefreshDatabase;

    private function root(): User
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);

        return $user;
    }

    private function userWithRole(array $permissions): User
    {
        $role = Role::create(['name' => 'Test Role '.uniqid(), 'permissions' => $permissions]);
        $user = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($user);

        return $user;
    }

    /** @return array<string, mixed> */
    private function search(string $query): array
    {
        return $this->getJson('/admin/search?q='.urlencode($query))->json();
    }

    private function groupKeys(array $response): array
    {
        return collect($response['groups'])->pluck('key')->all();
    }

    private function group(array $response, string $key): ?array
    {
        return collect($response['groups'])->firstWhere('key', $key);
    }

    // --- Guarding -----------------------------------------------------

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/admin/search?q=test')->assertRedirect('/login');
    }

    public function test_a_user_with_no_role_is_forbidden(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get('/admin/search?q=test')->assertForbidden();
    }

    public function test_a_short_query_returns_no_groups_without_erroring(): void
    {
        $this->root();
        Page::create(['slug' => 'contact', 'hero_heading' => 'About Us']);

        $response = $this->search('a');
        $this->assertSame([], $response['groups']);
    }

    // --- Per-source permission gating (the ticket's central requirement) --

    public function test_a_role_with_only_one_sections_view_grant_gets_results_from_that_source_only(): void
    {
        Page::create(['slug' => 'contact', 'hero_heading' => 'Andrew Reach']);
        Testimonial::create(['quote' => 'Andrew Reach helped us relocate', 'author' => 'Jane', 'status' => 'published']);
        Service::create([
            'name' => 'Andrew Reach', 'headline' => 'H', 'slug' => 'andrew-reach', 'intro' => 'i', 'body' => 'b',
            'scope' => [], 'countries' => [], 'sort_order' => 1, 'status' => 'published',
        ]);

        $this->userWithRole(['pages' => ['view' => true, 'edit' => false, 'delete' => false]]);

        $response = $this->search('Andrew Reach');

        $this->assertSame(['pages'], $this->groupKeys($response));
        $this->assertSame('Andrew Reach', $this->group($response, 'pages')['items'][0]['title']);
    }

    public function test_a_query_matching_nothing_in_an_ungranted_source_is_actually_absent_not_hidden(): void
    {
        Service::create([
            'name' => 'Immigration Support', 'headline' => 'H', 'slug' => 'immigration', 'intro' => 'i', 'body' => 'b',
            'scope' => [], 'countries' => [], 'sort_order' => 1, 'status' => 'published',
        ]);

        // No `services` grant at all — services must never appear in the
        // groups array, matching or not.
        $this->userWithRole(['pages' => ['view' => true, 'edit' => false, 'delete' => false]]);

        $response = $this->search('Immigration');

        $this->assertNull($this->group($response, 'services'));
        $this->assertArrayNotHasKey('services', collect($response['groups'])->pluck('key', 'key')->all());
    }

    public function test_root_admin_sees_every_source(): void
    {
        $this->root();

        Page::create(['slug' => 'contact', 'hero_heading' => 'Everywhere Match']);
        BlogPost::create(['title' => 'Everywhere Match Article', 'slug' => 'everywhere-match', 'category' => 'News', 'excerpt' => 'e', 'body' => 'b', 'status' => 'published']);
        Testimonial::create(['quote' => 'Everywhere Match testimonial', 'author' => 'Jane', 'status' => 'published']);
        Faq::create(['question' => 'Everywhere Match question?', 'answer' => 'A', 'visibility' => 'internal', 'status' => 'draft']);
        Location::create(['office_name' => 'Everywhere Match Office', 'address' => 'x', 'sort_order' => 1, 'status' => 'published']);
        Country::create(['name' => 'Everywhere Match Country', 'slug' => 'everywhere-match', 'sort_order' => 1, 'status' => 'published']);
        Lead::create(['type' => 'contact', 'name' => 'Everywhere Match Lead', 'email' => 'a@example.com', 'submitted_at' => now()]);
        Media::create(['file_name' => 'Everywhere Match.pdf', 'file_path' => 'x', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);
        Service::create([
            'name' => 'Everywhere Match Service', 'headline' => 'H', 'slug' => 'everywhere-match', 'intro' => 'i', 'body' => 'b',
            'scope' => [], 'countries' => [], 'sort_order' => 1, 'status' => 'published',
        ]);

        $response = $this->search('Everywhere Match');

        $this->assertEqualsCanonicalizing(
            ['pages', 'content', 'testimonials', 'faqs', 'locations', 'inquiries', 'media', 'services'],
            $this->groupKeys($response),
        );
    }

    // --- Anonymized leads must never resurface -------------------------

    public function test_an_anonymized_lead_never_appears_in_results_regardless_of_query_match(): void
    {
        $this->userWithRole(['inquiries' => ['view' => true, 'edit' => false, 'delete' => false]]);

        $lead = Lead::create(['type' => 'contact', 'name' => 'Secret Person', 'email' => 'secret@example.com', 'subject' => 'Secret subject', 'submitted_at' => now()]);
        $lead->anonymize();

        $byName = $this->search('Secret Person');
        $byEmail = $this->search('secret@example.com');
        $bySubject = $this->search('Secret subject');

        $this->assertNull($this->group($byName, 'inquiries'));
        $this->assertNull($this->group($byEmail, 'inquiries'));
        $this->assertNull($this->group($bySubject, 'inquiries'));
    }

    public function test_an_anonymized_resource_request_never_appears_in_results(): void
    {
        $this->userWithRole(['inquiries' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $this->seed(ResourceCategorySeeder::class);
        $category = ResourceCategory::where('slug', 'brochures')->sole();
        $item = ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Guide', 'status' => 'published']);

        $resourceRequest = ResourceRequest::create([
            'resource_item_id' => $item->id, 'name' => 'Forgotten Person', 'email' => 'forgotten@example.com',
            'company' => 'Forgotten Co', 'submitted_at' => now(),
        ]);
        $resourceRequest->anonymize();

        $response = $this->search('Forgotten');
        $this->assertNull($this->group($response, 'inquiries'));
    }

    public function test_a_non_anonymized_lead_still_appears_normally(): void
    {
        $this->userWithRole(['inquiries' => ['view' => true, 'edit' => false, 'delete' => false]]);
        Lead::create(['type' => 'contact', 'name' => 'Visible Person', 'email' => 'visible@example.com', 'submitted_at' => now()]);

        $response = $this->search('Visible Person');
        $group = $this->group($response, 'inquiries');

        $this->assertNotNull($group);
        $this->assertSame('Visible Person', $group['items'][0]['title']);
    }

    // --- Services: read-only, gated by `services`, plain link ----------

    public function test_services_results_require_services_view_and_link_to_the_plain_unmodified_page(): void
    {
        Service::create([
            'name' => 'Relocation Concierge', 'headline' => 'A headline', 'slug' => 'relocation-concierge',
            'intro' => 'i', 'body' => 'b', 'scope' => [], 'countries' => [], 'sort_order' => 1, 'status' => 'published',
        ]);

        // No `services` grant: absent from the response entirely.
        $this->userWithRole(['pages' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withoutGrant = $this->search('Relocation Concierge');
        $this->assertNull($this->group($withoutGrant, 'services'));

        $this->userWithRole(['services' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withGrant = $this->search('Relocation Concierge');
        $group = $this->group($withGrant, 'services');

        $this->assertNotNull($group);
        $this->assertSame('Relocation Concierge', $group['items'][0]['title']);
        // No query params, no deep-link id — a plain, unmodified navigation
        // link to the protected Services screen.
        $this->assertSame('/admin/services', $group['items'][0]['href']);
    }

    public function test_services_search_never_writes_anything(): void
    {
        $service = Service::create([
            'name' => 'Immutable Service', 'headline' => 'H', 'slug' => 'immutable', 'intro' => 'i', 'body' => 'b',
            'scope' => [], 'countries' => [], 'sort_order' => 1, 'status' => 'published',
        ]);
        $updatedAt = $service->updated_at;

        $this->userWithRole(['services' => ['view' => true, 'edit' => true, 'delete' => true]]);
        $this->search('Immutable Service');

        $this->assertEquals($updatedAt, $service->fresh()->updated_at);
        $this->assertSame('Immutable Service', $service->fresh()->name);
    }

    // --- Content Library: article needs blog, resource needs resources -

    public function test_content_library_article_result_requires_blog_view_independent_of_resources(): void
    {
        BlogPost::create(['title' => 'Kenya Relocation Guide', 'slug' => 'kenya-guide', 'category' => 'News', 'excerpt' => 'e', 'body' => 'b', 'status' => 'published']);

        $this->userWithRole(['resources' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withoutBlog = $this->search('Kenya Relocation');
        $this->assertNull($this->group($withoutBlog, 'content'));

        $this->userWithRole(['blog' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withBlog = $this->search('Kenya Relocation');
        $group = $this->group($withBlog, 'content');

        $this->assertNotNull($group);
        $this->assertSame('Kenya Relocation Guide', $group['items'][0]['title']);
        $this->assertSame('/admin/blog?edit='.BlogPost::sole()->id, $group['items'][0]['href']);
    }

    public function test_content_library_resource_result_requires_resources_view_independent_of_blog(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $category = ResourceCategory::where('slug', 'brochures')->sole();
        $item = ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Nairobi Housing Brochure', 'status' => 'published']);

        $this->userWithRole(['blog' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withoutResources = $this->search('Nairobi Housing');
        $this->assertNull($this->group($withoutResources, 'content'));

        $this->userWithRole(['resources' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withResources = $this->search('Nairobi Housing');
        $group = $this->group($withResources, 'content');

        $this->assertNotNull($group);
        $this->assertSame('Nairobi Housing Brochure', $group['items'][0]['title']);
        $this->assertSame('/admin/resources/brochures?edit='.$item->id, $group['items'][0]['href']);
    }

    // --- FAQs: gated by `resources`, not a separate key -----------------

    public function test_faqs_are_gated_by_the_resources_section_not_testimonials(): void
    {
        Faq::create(['question' => 'What visa is required for Kenya?', 'answer' => 'A work permit.', 'visibility' => 'internal', 'status' => 'draft']);

        $this->userWithRole(['testimonials' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withTestimonialsOnly = $this->search('visa is required');
        $this->assertNull($this->group($withTestimonialsOnly, 'faqs'));

        $this->userWithRole(['resources' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withResources = $this->search('visa is required');
        $group = $this->group($withResources, 'faqs');

        $this->assertNotNull($group);
        $this->assertSame('What visa is required for Kenya?', $group['items'][0]['title']);
        $this->assertSame('/admin/faqs', $group['items'][0]['href']);
    }

    // --- Testimonials -----------------------------------------------------

    public function test_testimonials_are_gated_by_their_own_section(): void
    {
        Testimonial::create(['quote' => 'A wonderful moving experience', 'author' => 'Sipho', 'company' => 'Acme', 'status' => 'published']);

        $this->userWithRole(['resources' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withoutTestimonials = $this->search('wonderful moving');
        $this->assertNull($this->group($withoutTestimonials, 'testimonials'));

        $this->userWithRole(['testimonials' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withTestimonials = $this->search('wonderful moving');
        $group = $this->group($withTestimonials, 'testimonials');

        $this->assertNotNull($group);
        $this->assertSame('Sipho · Acme', $group['items'][0]['title']);
        $this->assertSame('/admin/testimonials', $group['items'][0]['href']);
    }

    // --- Locations: offices and countries, gated by `locations` --------

    public function test_locations_covers_both_offices_and_countries_gated_by_locations_section(): void
    {
        Location::create(['office_name' => 'Johannesburg Office', 'address' => 'x', 'sort_order' => 1, 'status' => 'published']);
        Country::create(['name' => 'Johannesburg Coverage Area', 'slug' => 'jhb-area', 'sort_order' => 1, 'status' => 'published']);

        $this->userWithRole(['media' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withoutLocations = $this->search('Johannesburg');
        $this->assertNull($this->group($withoutLocations, 'locations'));

        $this->userWithRole(['locations' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withLocations = $this->search('Johannesburg');
        $group = $this->group($withLocations, 'locations');

        $this->assertNotNull($group);
        $this->assertCount(2, $group['items']);
    }

    // --- Media -----------------------------------------------------------

    public function test_media_is_gated_by_the_media_section(): void
    {
        Media::create(['file_name' => 'team-photo-2026.jpg', 'alt_text' => 'Team at the Cape Town office', 'file_path' => 'x', 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);

        $this->userWithRole(['pages' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withoutMedia = $this->search('team-photo');
        $this->assertNull($this->group($withoutMedia, 'media'));

        $this->userWithRole(['media' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withMedia = $this->search('team-photo');
        $group = $this->group($withMedia, 'media');

        $this->assertNotNull($group);
        $this->assertSame('team-photo-2026.jpg', $group['items'][0]['title']);

        // Alt text is also searchable.
        $byAlt = $this->search('Cape Town office');
        $this->assertNotNull($this->group($byAlt, 'media'));
    }

    // --- Pages -------------------------------------------------------------

    public function test_pages_are_gated_by_the_pages_section(): void
    {
        Page::create(['slug' => 'contact', 'hero_heading' => 'Get in touch with our Durban team']);

        $this->userWithRole(['settings' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withoutPages = $this->search('Durban team');
        $this->assertNull($this->group($withoutPages, 'pages'));

        $this->userWithRole(['pages' => ['view' => true, 'edit' => false, 'delete' => false]]);
        $withPages = $this->search('Durban team');
        $group = $this->group($withPages, 'pages');

        $this->assertNotNull($group);
        $this->assertSame('/admin/pages/contact', $group['items'][0]['href']);
    }

    // --- Result cap ----------------------------------------------------

    public function test_results_per_source_are_capped(): void
    {
        $this->root();
        for ($i = 1; $i <= 10; $i++) {
            Testimonial::create(['quote' => "Capped quote {$i}", 'author' => "Author {$i}", 'status' => 'published']);
        }

        $response = $this->search('Capped quote');
        $group = $this->group($response, 'testimonials');

        $this->assertNotNull($group);
        $this->assertLessThanOrEqual(8, count($group['items']));
    }
}
