<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\ServiceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ServiceRichContentTest extends TestCase
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
            'cta_link' => '/contact', 'cta_button_label' => 'Contact us',
        ];
    }

    public function test_rich_content_is_sanitized_to_the_editor_allowlist_on_save(): void
    {
        $this->staff();
        $dirty = '<p>Hello <strong>there</strong></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad link</a><a href="/contact">good link</a>';

        $this->post('/admin/services', [...$this->payload(), 'rich_content' => $dirty])->assertRedirect();

        $service = Service::sole();
        $this->assertSame(
            '<p>Hello <strong>there</strong></p><a href="#">bad link</a><a href="/contact">good link</a>',
            $service->rich_content,
        );
    }

    public function test_featured_services_objects_round_trip_through_save_and_public_display(): void
    {
        $this->staff();
        $data = [...$this->payload(), 'status' => 'published', 'featured_services' => [
            ['name' => 'Visa applications', 'description' => 'End-to-end visa handling.'],
        ]];

        $this->post('/admin/services', $data)->assertRedirect();

        $service = Service::sole();
        $this->assertSame([
            ['name' => 'Visa applications', 'description' => 'End-to-end visa handling.'],
        ], $service->featured_services);
    }

    public function test_featured_services_require_a_name(): void
    {
        $this->staff();
        $this->postJson('/admin/services', [...$this->payload(), 'featured_services' => [['description' => 'No name']]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('featured_services.0.name');
    }

    public function test_the_new_admin_editors_lean_field_set_creates_and_updates_a_service(): void
    {
        $this->staff();
        $media = Media::create([
            'file_name' => 'mobility-banner.jpg', 'file_path' => 'media/mobility-banner.jpg',
            'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image',
        ]);

        // Exactly what the rebuilt admin/services form submits: no scope,
        // countries, faqs, body, icon, or banner_image — banner_media_id sent
        // as an empty string when nothing is selected in the picker.
        $create = [
            'name' => 'Mobility', 'headline' => 'Move with confidence', 'slug' => 'mobility',
            'intro' => 'Support for your relocation.', 'banner_media_id' => '',
            'cta_text' => 'Ready to move?', 'cta_description' => 'Talk to our team.',
            'cta_button_label' => 'Contact us', 'cta_link' => '/contact',
            'sort_order' => 1, 'status' => 'draft',
            'rich_content' => '<p>We handle every step.</p>',
            'featured_services' => [['name' => 'Visa applications', 'description' => 'End-to-end handling.']],
            'meta_title' => 'Mobility Services', 'meta_description' => 'Corporate relocation across Africa.',
        ];
        $this->post('/admin/services', $create)->assertRedirect('/admin/services');

        $service = Service::sole();
        $this->assertNull($service->banner_media_id);
        $this->assertSame('<p>We handle every step.</p>', $service->rich_content);
        $this->assertSame([['name' => 'Visa applications', 'description' => 'End-to-end handling.']], $service->featured_services);

        $update = [...$create, 'status' => 'published', 'banner_media_id' => $media->id, 'headline' => 'Updated headline'];
        $this->patch("/admin/services/{$service->id}", $update)->assertRedirect('/admin/services');

        $service = $service->fresh();
        $this->assertSame($media->id, $service->banner_media_id);
        $this->assertSame('Updated headline', $service->headline);
        $this->assertNotNull($service->published_at);
    }

    public function test_backfill_migration_converts_legacy_scope_and_featured_primary_once(): void
    {
        // RefreshDatabase already ran this migration on an empty table, so we
        // invoke it directly against a manually inserted legacy-shaped row.
        $id = DB::table('services')->insertGetId([
            'name' => 'Mobility', 'headline' => 'Move with confidence', 'slug' => 'mobility',
            'intro' => 'Support.', 'status' => 'draft', 'sort_order' => 1,
            'scope' => json_encode([['heading' => 'Planning', 'intro' => 'We handle it.', 'items' => ['Visa guidance', 'Home search']]]),
            'featured_primary' => json_encode(['Visa applications']),
            'countries' => json_encode([]), 'faqs' => json_encode([]),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        (require database_path('migrations/2026_09_10_020000_backfill_rich_content_and_featured_services_on_services_table.php'))->up();

        $service = Service::find($id);
        $this->assertSame(
            '<h2>Planning</h2><p>We handle it.</p><ul><li>Visa guidance</li><li>Home search</li></ul>',
            $service->rich_content,
        );
        $this->assertSame([['name' => 'Visa applications', 'description' => '']], $service->featured_services);

        // Re-running must not clobber content already entered through the new editor.
        $service->update(['rich_content' => '<p>Edited by hand.</p>']);
        (require database_path('migrations/2026_09_10_020000_backfill_rich_content_and_featured_services_on_services_table.php'))->up();
        $this->assertSame('<p>Edited by hand.</p>', $service->fresh()->rich_content);
    }

    public function test_seeded_services_are_populated_with_rich_content_and_featured_services(): void
    {
        $this->seed(ServiceSeeder::class);

        $service = Service::where('slug', 'mobility')->sole();
        $this->assertNotSame('', $service->rich_content);
        $this->assertStringContainsString('<h2>', $service->rich_content);
    }
}
