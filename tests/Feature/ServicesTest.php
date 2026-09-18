<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\ServiceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ServicesTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    private function payload(): array
    {
        return [
            'name' => 'Mobility', 'headline' => 'Move with confidence', 'slug' => 'mobility',
            'intro' => 'Support for your relocation.', 'status' => 'draft', 'sort_order' => 1,
            'scope' => [['heading' => 'Planning', 'items' => ['Visa guidance', 'Home search']]],
            'faqs' => [['question' => 'Where?', 'answer' => 'Across Africa.']],
            'cta_link' => '/contact', 'cta_button_label' => 'Contact us',
        ];
    }

    public function test_admin_changes_control_public_content_and_draft_visibility(): void
    {
        $this->staff();
        $data = $this->payload();
        $this->post('/admin/services', $data)->assertRedirect('/admin/services');
        $service = Service::sole();
        $this->get('/services/mobility')->assertNotFound();
        $this->get('/services')->assertInertia(fn (Assert $page) => $page->has('services', 0));

        $this->patch('/admin/services/'.$service->id, [...$data, 'status' => 'published'])->assertRedirect();
        $this->get('/services/mobility')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('service')->where('service.headline', 'Move with confidence')
            ->where('service.scope.0.items.1', 'Home search')->where('service.faqs.0.answer', 'Across Africa.')
            ->where('service.cta_link', '/contact'));
        $this->get('/services')->assertInertia(fn (Assert $page) => $page->has('services', 1)
            ->where('serviceLinks.0.href', '/services/mobility'));
        $this->assertNotNull($service->fresh()->published_at);

        unset($data['scope'], $data['faqs']);
        $this->patch('/admin/services/'.$service->id, [...$data, 'headline' => 'Updated headline'])->assertRedirect();
        $this->assertCount(1, $service->fresh()->scope);
        $this->get('/services/mobility')->assertNotFound();
        $this->get('/services')->assertInertia(fn (Assert $page) => $page->has('services', 0)->has('serviceLinks', 0));
    }

    public function test_updating_without_legacy_fields_leaves_their_existing_values_untouched(): void
    {
        $this->staff();
        $this->post('/admin/services', [
            ...$this->payload(),
            'body' => 'Old additional info',
            'icon' => 'plane',
            'banner_image' => 'https://example.test/legacy-banner.jpg',
            'countries' => ['South Africa'],
            'featured_primary' => ['Visa applications'],
        ])->assertRedirect();
        $service = Service::sole();

        // The new editor no longer sends these fields at all.
        $slim = [
            'name' => 'Mobility', 'headline' => 'Move with confidence', 'slug' => 'mobility',
            'intro' => 'Support for your relocation.', 'status' => 'draft', 'sort_order' => 2,
            'cta_link' => '/contact', 'cta_button_label' => 'Contact us',
        ];
        $this->patch("/admin/services/{$service->id}", $slim)->assertRedirect();

        $service = $service->fresh();
        $this->assertSame(2, $service->sort_order);
        $this->assertSame('Old additional info', $service->body);
        $this->assertSame('plane', $service->icon);
        $this->assertSame('https://example.test/legacy-banner.jpg', $service->banner_image);
        $this->assertSame(['South Africa'], $service->countries);
        $this->assertSame(['Visa applications'], $service->featured_primary);
        $this->assertSame([['heading' => 'Planning', 'items' => ['Visa guidance', 'Home search']]], $service->scope);
        $this->assertSame([['question' => 'Where?', 'answer' => 'Across Africa.']], $service->faqs);
    }

    public function test_invalid_urls_and_nested_content_are_rejected_without_writes(): void
    {
        $this->staff();
        foreach (['/admin', '/login', '/bad/path', '//external.test'] as $slug) {
            $this->postJson('/admin/services', [...$this->payload(), 'slug' => $slug])->assertUnprocessable();
        }
        foreach (['javascript:alert(1)', '//external.test', '/\\external.test'] as $link) {
            $this->postJson('/admin/services', [...$this->payload(), 'cta_link' => $link])->assertUnprocessable();
        }
        $this->postJson('/admin/services', [...$this->payload(), 'faqs' => [['question' => 'Missing answer']]])->assertUnprocessable();
        $this->postJson('/admin/services', [...$this->payload(), 'status' => 'published', 'intro' => ''])->assertUnprocessable();
        $this->assertDatabaseCount('services', 0);
    }

    public function test_a_library_banner_is_persisted_and_preferred_over_an_existing_banner_url(): void
    {
        $this->staff();
        $media = Media::create([
            'file_name' => 'mobility-banner.jpg',
            'file_path' => 'media/mobility-banner.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1,
            'kind' => 'image',
            'alt_text' => 'Family arriving at a new home',
        ]);

        $data = [...$this->payload(), 'status' => 'published', 'banner_image' => 'https://example.test/legacy-banner.jpg'];
        $this->post('/admin/services', $data)->assertRedirect('/admin/services');

        $service = Service::sole();
        $this->assertNull($service->banner_media_id);
        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->component('service')
            ->where('service.bannerImageUrl', 'https://example.test/legacy-banner.jpg')
            ->where('service.bannerImageAlt', 'Mobility service banner'));

        $this->patch("/admin/services/{$service->id}", [...$data, 'banner_media_id' => $media->id])
            ->assertRedirect('/admin/services');

        $service = $service->fresh();
        $this->assertSame($media->id, $service->banner_media_id);
        $this->assertSame('https://example.test/legacy-banner.jpg', $service->banner_image);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->component('service')
            ->where('service.bannerImageUrl', $media->url())
            ->where('service.bannerImageAlt', 'Family arriving at a new home')
            ->where('service.banner_image', 'https://example.test/legacy-banner.jpg'));
    }

    public function test_a_service_banner_must_reference_an_image_in_the_media_library(): void
    {
        $this->staff();
        $document = Media::create([
            'file_name' => 'brochure.pdf',
            'file_path' => 'media/brochure.pdf',
            'mime_type' => 'application/pdf',
            'size' => 1,
            'kind' => 'document',
        ]);

        $this->postJson('/admin/services', [...$this->payload(), 'banner_media_id' => $document->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('banner_media_id');
    }

    public function test_customer_and_guest_cannot_manage_services(): void
    {
        $this->post('/admin/services', $this->payload())->assertRedirect('/login');
        $this->actingAs(User::factory()->create());
        $this->get('/admin/services')->assertForbidden();
        $this->post('/admin/services', $this->payload())->assertForbidden();
        $this->assertDatabaseCount('services', 0);
    }

    public function test_seed_import_preserves_existing_content_without_overwriting_edits(): void
    {
        $this->seed(ServiceSeeder::class);
        $this->assertDatabaseCount('services', 5);
        $service = Service::where('slug', 'mobility')->sole();
        $service->update(['headline' => 'Editorial update', 'status' => 'draft', 'slug' => 'relocation-support']);
        $this->seed(ServiceSeeder::class);
        $this->assertDatabaseCount('services', 5);
        $this->assertSame('Editorial update', $service->fresh()->headline);
        $this->assertSame('draft', $service->fresh()->status);
    }

    public function test_services_are_seeded_in_the_agreed_priority_order(): void
    {
        $this->seed(ServiceSeeder::class);

        $this->assertSame(
            ['Immigration', 'Mobility', 'Remuneration', 'Research', 'Training'],
            Service::query()->orderBy('sort_order')->pluck('name')->all(),
        );
    }

    public function test_display_order_is_admin_controlled_and_reordering_persists(): void
    {
        $this->staff();
        $this->seed(ServiceSeeder::class);
        $mobility = Service::where('slug', 'mobility')->sole();
        $immigration = Service::where('slug', 'immigration')->sole();

        $this->patch("/admin/services/{$mobility->id}", [...$this->payload(), 'sort_order' => 0])->assertRedirect();

        $ordered = Service::query()->orderBy('sort_order')->pluck('slug')->all();
        $this->assertSame('mobility', $ordered[0]);
        $this->assertSame(0, $mobility->fresh()->sort_order);
        $this->assertSame(1, $immigration->fresh()->sort_order);
    }
}
