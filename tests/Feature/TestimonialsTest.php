<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\Testimonial;
use App\Models\User;
use App\Support\Blocks\Types\TestimonialsBlock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TestimonialsTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    private function payload(array $overrides = []): array
    {
        return [...['quote' => 'They made our move simple.', 'author' => 'Alex Smith', 'company' => 'Example Co', 'serviceId' => null, 'sortOrder' => 1, 'status' => 'Draft'], ...$overrides];
    }

    public function test_admin_manages_testimonials_and_only_published_content_is_public(): void
    {
        $this->staff();
        $this->post('/admin/testimonials', $this->payload())->assertRedirect('/admin/testimonials');
        $testimonial = Testimonial::sole();
        // The homepage's testimonials come from the testimonials block's own
        // resolved data now (see App\Support\Blocks\Types\TestimonialsBlock),
        // not a page-level prop — checked directly here rather than through
        // '/', so this stays correct regardless of where that block sits.
        $this->assertCount(0, (new TestimonialsBlock)->resolve([])['testimonials']);

        $this->patch('/admin/testimonials/'.$testimonial->id, $this->payload(['status' => 'Published']))->assertRedirect('/admin/testimonials');
        $resolved = (new TestimonialsBlock)->resolve([])['testimonials'];
        $this->assertCount(1, $resolved);
        $this->assertSame('Alex Smith', $resolved[0]['author']);
        $this->assertNotNull($testimonial->fresh()->published_at);

        // PUB-04 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B).
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'subject_type' => 'testimonial', 'subject_id' => $testimonial->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'updated', 'subject_type' => 'testimonial', 'subject_id' => $testimonial->id]);
    }

    public function test_service_testimonial_appears_on_its_service_page(): void
    {
        $service = Service::create(['name' => 'Mobility', 'headline' => 'Mobility', 'slug' => 'mobility', 'intro' => 'Support', 'status' => 'published']);
        Testimonial::create(['quote' => 'Specific support.', 'author' => 'Jordan', 'service_id' => $service->id, 'status' => 'published']);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page->has('testimonials', 1)->where('testimonials.0.quote', 'Specific support.'));
    }

    public function test_guests_and_non_admins_cannot_manage_testimonials(): void
    {
        $this->post('/admin/testimonials', $this->payload())->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get('/admin/testimonials')->assertForbidden();
    }
}
