<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Media;
use App\Models\Page;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\Service;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaLibraryTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_staff_can_upload_a_file_and_it_is_stored_and_categorised(): void
    {
        Storage::fake('public');
        $this->staff();

        $this->postJson('/admin/media', [
            'file' => UploadedFile::fake()->create('handbook.pdf', 100, 'application/pdf'),
            'file_name' => 'relocation-handbook.pdf',
            'alt_text' => 'Relocation handbook cover',
        ])->assertCreated()->assertJsonPath('data.fileName', 'relocation-handbook.pdf')->assertJsonPath('data.kind', 'document');

        $media = Media::firstOrFail();
        $this->assertTrue(Storage::disk('public')->exists($media->file_path));
        $this->assertSame('document', $media->kind);

        Storage::fake('public');
        $this->postJson('/admin/media', [
            'file' => UploadedFile::fake()->image('banner.jpg'),
        ])->assertCreated()->assertJsonPath('data.kind', 'image');
    }

    public function test_upload_rejects_wrong_mime_and_oversized_files(): void
    {
        Storage::fake('public');
        $this->staff();

        $this->postJson('/admin/media', ['file' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain')])
            ->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->postJson('/admin/media', ['file' => UploadedFile::fake()->create('huge.pdf', 30000, 'application/pdf')])
            ->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_the_library_can_be_searched_and_filtered_for_the_picker(): void
    {
        $this->staff();
        Media::create(['file_name' => 'brochure.pdf', 'file_path' => 'x', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);
        Media::create(['file_name' => 'banner.jpg', 'file_path' => 'y', 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);

        $this->getJson('/admin/media?search=brochure')->assertJsonCount(1, 'data')->assertJsonPath('data.0.fileName', 'brochure.pdf');
        $this->getJson('/admin/media')->assertJsonCount(2, 'data');
    }

    public function test_staff_can_edit_alt_text_and_file_name(): void
    {
        $this->staff();
        $media = Media::create(['file_name' => 'old.pdf', 'file_path' => 'x', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);

        $this->patch("/admin/media/{$media->id}", ['file_name' => 'renamed.pdf', 'alt_text' => 'Updated'])
            ->assertRedirect('/admin/media-library');

        $this->assertDatabaseHas('media', ['id' => $media->id, 'file_name' => 'renamed.pdf', 'alt_text' => 'Updated']);
    }

    public function test_media_still_referenced_by_a_resource_item_cannot_be_deleted(): void
    {
        Storage::fake('public');
        $this->staff();
        $category = ResourceCategory::create(['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list']);
        $media = Media::create(['file_name' => 'x.pdf', 'file_path' => 'media/x.pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);
        ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'X', 'file_media_id' => $media->id, 'status' => 'draft', 'sort_order' => 1]);

        $this->delete("/admin/media/{$media->id}")->assertSessionHasErrors('media');
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_media_referenced_by_a_page_or_team_member_cannot_be_deleted(): void
    {
        Storage::fake('public');
        $this->staff();
        $media = Media::create(['file_name' => 'portrait.jpg', 'file_path' => 'media/portrait.jpg', 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);

        Page::create(['slug' => 'contact', 'intro_image_media_id' => $media->id]);
        $this->delete("/admin/media/{$media->id}")->assertSessionHasErrors('media');

        Page::query()->delete();
        TeamMember::create(['name' => 'Jane Doe', 'role' => 'Advisor', 'photo_media_id' => $media->id, 'status' => 'draft', 'sort_order' => 1]);
        $this->delete("/admin/media/{$media->id}")->assertSessionHasErrors('media');
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_media_referenced_by_a_service_banner_cannot_be_deleted(): void
    {
        Storage::fake('public');
        $this->staff();
        $media = Media::create(['file_name' => 'banner.jpg', 'file_path' => 'media/banner.jpg', 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);
        Service::create([
            'name' => 'Mobility',
            'headline' => 'Move with confidence',
            'slug' => 'mobility',
            'banner_media_id' => $media->id,
            'status' => 'draft',
            'sort_order' => 1,
        ]);

        $this->delete("/admin/media/{$media->id}")->assertSessionHasErrors('media');

        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_media_referenced_by_a_page_og_image_cannot_be_deleted(): void
    {
        Storage::fake('public');
        $this->staff();
        $media = Media::create(['file_name' => 'share.jpg', 'file_path' => 'media/share.jpg', 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);
        Page::create(['slug' => 'contact', 'og_image_media_id' => $media->id]);

        $this->delete("/admin/media/{$media->id}")->assertSessionHasErrors('media');
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_media_possibly_referenced_by_an_article_banner_cannot_be_deleted(): void
    {
        Storage::fake('public');
        $this->staff();
        $path = UploadedFile::fake()->create('nairobi.jpg', 10, 'image/jpeg')->store('media/2026/09', 'public');
        $media = Media::create(['file_name' => 'nairobi.jpg', 'file_path' => $path, 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);
        BlogPost::create(['title' => 'Settling In', 'slug' => 'settling-in', 'category' => 'Mobility', 'excerpt' => 'x', 'body' => 'x', 'status' => 'draft', 'banner_image' => $media->url()]);

        $this->delete("/admin/media/{$media->id}")->assertSessionHasErrors('media');
        $this->assertDatabaseHas('media', ['id' => $media->id]);

        // An unrelated banner URL must never falsely block an unrelated file.
        $other = Media::create(['file_name' => 'unrelated.jpg', 'file_path' => 'media/unrelated.jpg', 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);
        $this->delete("/admin/media/{$other->id}")->assertRedirect('/admin/media-library');
        $this->assertDatabaseMissing('media', ['id' => $other->id]);
    }

    public function test_index_reports_confirmed_and_unconfirmed_usage_per_item(): void
    {
        $this->staff();
        $path = 'media/2026/09/tagged.jpg';
        Storage::fake('public');
        Storage::disk('public')->put($path, 'x');
        $referenced = Media::create(['file_name' => 'tagged.jpg', 'file_path' => $path, 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);
        Page::create(['slug' => 'contact', 'og_image_media_id' => $referenced->id]);
        $unused = Media::create(['file_name' => 'free.jpg', 'file_path' => 'media/free.jpg', 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);

        $response = $this->getJson('/admin/media')->assertOk();
        $items = collect($response->json('data'))->keyBy('id');

        $this->assertContains('Page social-share (OG) image', $items[(string) $referenced->id]['usage']['confirmed']);
        $this->assertSame([], $items[(string) $unused->id]['usage']['confirmed']);
        $this->assertSame([], $items[(string) $unused->id]['usage']['unconfirmed']);
    }

    public function test_index_can_filter_by_type(): void
    {
        $this->staff();
        Media::create(['file_name' => 'a.pdf', 'file_path' => 'a.pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);
        Media::create(['file_name' => 'b.jpg', 'file_path' => 'b.jpg', 'mime_type' => 'image/jpeg', 'size' => 1, 'kind' => 'image']);

        $this->getJson('/admin/media?type=image')->assertJsonCount(1, 'data')->assertJsonPath('data.0.fileName', 'b.jpg');
        $this->getJson('/admin/media?type=document')->assertJsonCount(1, 'data')->assertJsonPath('data.0.fileName', 'a.pdf');
    }

    public function test_unused_media_can_be_deleted_and_removed_from_disk(): void
    {
        Storage::fake('public');
        $path = UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')->store('media', 'public');
        $this->staff();
        $media = Media::create(['file_name' => 'x.pdf', 'file_path' => $path, 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);

        $this->delete("/admin/media/{$media->id}")->assertRedirect('/admin/media-library');

        $this->assertDatabaseMissing('media', ['id' => $media->id]);
        $this->assertFalse(Storage::disk('public')->exists($path));
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'deleted', 'subject_type' => 'media', 'subject_id' => $media->id, 'actor_id' => auth()->id(),
        ]);
    }

    public function test_media_requires_staff(): void
    {
        $this->getJson('/admin/media')->assertUnauthorized();
        $this->postJson('/admin/media', [])->assertUnauthorized();

        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->getJson('/admin/media')->assertForbidden();
    }
}
