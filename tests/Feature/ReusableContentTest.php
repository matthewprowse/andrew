<?php

namespace Tests\Feature;

use App\Console\Commands\ImportServiceFaqs;
use App\Models\Faq;
use App\Models\Role;
use App\Models\Service;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Inertia\Testing\AssertableInertia as Assert;
use ReflectionClass;
use Tests\TestCase;

/**
 * LIB-05/06 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4 batch 4B): Reusable
 * Content workspace (Testimonials + FAQs) and the new FAQ store/import.
 * See tests/Feature/TestimonialsTest.php for Testimonials' own, unchanged
 * CRUD/public-placement coverage — that file is rerun, not modified, by
 * this batch.
 */
class ReusableContentTest extends TestCase
{
    use RefreshDatabase;

    private function root(): User
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);

        return $user;
    }

    private function userWithRole(Role $role): User
    {
        $user = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($user);

        return $user;
    }

    private function service(array $overrides = [], array $faqs = []): Service
    {
        return Service::create([...[
            'name' => 'Immigration', 'headline' => 'H', 'slug' => 'immigration', 'intro' => 'i',
            'body' => 'b', 'scope' => [], 'countries' => [], 'sort_order' => 1, 'status' => 'published',
            'faqs' => $faqs,
        ], ...$overrides]);
    }

    // --- LIB-06: import idempotency and read-only Service guarantee -----

    public function test_import_creates_one_faq_per_service_entry_and_is_idempotent_on_rerun(): void
    {
        $faqs = [
            ['question' => 'Q1', 'answer' => 'A1'],
            ['question' => 'Q2', 'answer' => 'A2'],
        ];
        $service = $this->service([], $faqs);

        Artisan::call('faqs:import-from-services');
        $this->assertSame(2, Faq::count());

        // Re-run: no duplicates, same row count.
        Artisan::call('faqs:import-from-services');
        $this->assertSame(2, Faq::count());

        $imported = Faq::orderBy('id')->get();
        $this->assertSame('service:'.$service->id.':0', $imported[0]->source);
        $this->assertSame('service:'.$service->id.':1', $imported[1]->source);
        $this->assertSame('published', $imported[0]->status);
        $this->assertSame($service->id, $imported[0]->service_id);
    }

    public function test_import_never_mutates_the_original_service_faqs_data(): void
    {
        $faqs = [['question' => 'Q1', 'answer' => 'A1'], ['question' => 'Q2', 'answer' => 'A2']];
        $service = $this->service([], $faqs);
        $before = $service->fresh()->faqs;
        $beforeUpdatedAt = $service->fresh()->updated_at;

        Artisan::call('faqs:import-from-services');
        Artisan::call('faqs:import-from-services');

        $after = $service->fresh()->faqs;
        $this->assertSame($before, $after);
        $this->assertEquals($beforeUpdatedAt, $service->fresh()->updated_at);
    }

    public function test_import_across_multiple_services_with_matching_local_dev_shape(): void
    {
        // Mirrors the confirmed real-data shape (docs/ADMIN_UX_SEO_BUILD_PLAN.md's
        // audit table and this batch's own dev-DB recheck): several services,
        // three FAQ entries each.
        foreach (['Mobility', 'Immigration', 'Remuneration', 'Research', 'Training'] as $index => $name) {
            $this->service([
                'name' => $name, 'slug' => '/'.strtolower($name), 'sort_order' => $index + 1,
            ], [
                ['question' => "{$name} Q1", 'answer' => 'A1'],
                ['question' => "{$name} Q2", 'answer' => 'A2'],
                ['question' => "{$name} Q3", 'answer' => 'A3'],
            ]);
        }

        Artisan::call('faqs:import-from-services');
        $this->assertSame(15, Faq::count());

        Artisan::call('faqs:import-from-services');
        $this->assertSame(15, Faq::count());
    }

    public function test_import_command_never_calls_a_service_write_method(): void
    {
        // Static assertion that ImportServiceFaqs contains no Service
        // write-path call. Complements the behavioral byte-identical-data
        // assertion above with a structural guard against a future edit
        // accidentally introducing one.
        $source = file_get_contents((new ReflectionClass(ImportServiceFaqs::class))->getFileName());
        $this->assertStringNotContainsString('->save(', $source);
        $this->assertStringNotContainsString('Service::update', $source);
        $this->assertStringNotContainsString('->update(', $source);
    }

    // --- LIB-06: public-eligibility scope ---------------------------------

    public function test_public_eligible_scope_includes_imported_and_excludes_internal_or_draft(): void
    {
        $service = $this->service([], [['question' => 'Q', 'answer' => 'A']]);
        Artisan::call('faqs:import-from-services');
        $imported = Faq::sole();

        $draft = Faq::create(['question' => 'New', 'answer' => 'New answer', 'status' => 'draft']);
        $published = Faq::create(['question' => 'New2', 'answer' => 'New answer 2', 'status' => 'published']);
        $secondDraft = Faq::create(['question' => 'New3', 'answer' => 'New answer 3', 'status' => 'draft']);

        $eligibleIds = Faq::publicEligible()->pluck('id');

        $this->assertTrue($eligibleIds->contains($imported->id));
        $this->assertFalse($eligibleIds->contains($draft->id));
        $this->assertTrue($eligibleIds->contains($published->id));
        $this->assertFalse($eligibleIds->contains($secondDraft->id));
        $this->assertSame($service->id, $imported->service_id);
    }

    public function test_freshly_created_faq_defaults_to_internal_via_the_admin_endpoint(): void
    {
        $role = Role::create(['name' => 'Resources Editor', 'permissions' => [
            'resources' => ['view' => true, 'edit' => true, 'delete' => false],
        ]]);
        $this->userWithRole($role);

        $this->post('/admin/faqs', [
            'question' => 'New question', 'answer' => 'New answer',
            'serviceId' => null, 'status' => 'Draft', 'reviewDate' => null,
        ])->assertRedirect();

        $faq = Faq::sole();
        $this->assertNull($faq->source);
        $this->assertFalse(Faq::publicEligible()->pluck('id')->contains($faq->id));

        // PUB-04 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B).
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'subject_type' => 'faq', 'subject_id' => $faq->id]);
    }

    // --- LIB-05/06: permission gating -------------------------------------

    public function test_faq_crud_requires_resources_permission_and_is_independent_of_testimonials(): void
    {
        $viewOnly = Role::create(['name' => 'Resources Viewer', 'permissions' => [
            'resources' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->userWithRole($viewOnly);
        $this->post('/admin/faqs', [
            'question' => 'Q', 'answer' => 'A', 'serviceId' => null, 'status' => 'Draft', 'reviewDate' => null,
        ])->assertForbidden();

        $editor = Role::create(['name' => 'Resources Editor', 'permissions' => [
            'resources' => ['view' => true, 'edit' => true, 'delete' => false],
        ]]);
        $this->userWithRole($editor);
        $this->post('/admin/faqs', [
            'question' => 'Q', 'answer' => 'A', 'serviceId' => null, 'status' => 'Draft', 'reviewDate' => null,
        ])->assertRedirect();
        $faq = Faq::sole();

        $this->patch('/admin/faqs/'.$faq->id, [
            'question' => 'Q2', 'answer' => 'A2', 'serviceId' => null, 'status' => 'Draft', 'reviewDate' => null,
        ])->assertRedirect();
        $this->assertSame('Q2', $faq->fresh()->question);

        // PUB-04 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B).
        $this->assertDatabaseHas('audit_logs', ['action' => 'updated', 'subject_type' => 'faq', 'subject_id' => $faq->id]);
    }

    public function test_guests_cannot_manage_faqs(): void
    {
        $this->post('/admin/faqs', [
            'question' => 'Q', 'answer' => 'A', 'serviceId' => null, 'status' => 'Draft', 'reviewDate' => null,
        ])->assertRedirect('/login');
    }

    public function test_faq_and_testimonial_pages_are_gated_independently(): void
    {
        Testimonial::create(['quote' => 'Q', 'author' => 'A', 'status' => 'published']);
        Faq::create(['question' => 'Q', 'answer' => 'A', 'status' => 'draft']);

        $testimonialsOnly = Role::create(['name' => 'Testimonials Only', 'permissions' => [
            'testimonials' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->userWithRole($testimonialsOnly);
        $this->get('/admin/testimonials')->assertInertia(fn (Assert $page) => $page
            ->component('admin/testimonials/index')
            ->has('testimonials', 1)
            ->has('services', 0));
        $this->get('/admin/faqs')->assertForbidden();

        $faqsOnly = Role::create(['name' => 'Faqs Only', 'permissions' => [
            'resources' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->userWithRole($faqsOnly);
        $this->get('/admin/faqs')->assertInertia(fn (Assert $page) => $page
            ->component('admin/faqs/index')
            ->has('faqs', 1)
            ->has('services', 0));
        $this->get('/admin/testimonials')->assertForbidden();

        $neither = Role::create(['name' => 'Neither', 'permissions' => [
            'analytics' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->userWithRole($neither);
        $this->get('/admin/reusable-content')->assertForbidden();
        $this->get('/admin/faqs')->assertForbidden();
        $this->get('/admin/testimonials')->assertForbidden();
    }

    public function test_root_admin_sees_each_standalone_content_page(): void
    {
        $this->root();
        Testimonial::create(['quote' => 'Q', 'author' => 'A', 'status' => 'published']);
        Faq::create(['question' => 'Q', 'answer' => 'A', 'status' => 'draft']);

        $this->get('/admin/testimonials')->assertInertia(fn (Assert $page) => $page
            ->component('admin/testimonials/index')
            ->has('testimonials', 1));
        $this->get('/admin/faqs')->assertInertia(fn (Assert $page) => $page
            ->component('admin/faqs/index')
            ->has('faqs', 1));
    }

    // --- Compatibility route -----------------------------------------------

    public function test_legacy_reusable_content_url_redirects_to_a_canonical_page(): void
    {
        $this->root();

        $this->get('/admin/reusable-content')->assertRedirect('/admin/testimonials');
        $this->get('/admin/reusable-content?tab=faqs')->assertRedirect('/admin/faqs');

        // The write endpoint stays at its original path and returns directly
        // to the standalone Testimonials page.
        $this->post('/admin/testimonials', [
            'quote' => 'Q', 'author' => 'A', 'company' => '', 'serviceId' => null, 'sortOrder' => 1, 'status' => 'Draft',
        ])->assertRedirect('/admin/testimonials');
        $this->assertSame(1, Testimonial::count());
    }
}
