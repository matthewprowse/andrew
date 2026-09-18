<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PaidResourceFilesTest extends TestCase
{
    use RefreshDatabase;

    private Media $media;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');

        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);

        ResourceCategory::create(['slug' => 'books', 'title' => 'Books', 'layout' => 'list']);
        Storage::disk('public')->put('media/2026/09/guide.pdf', 'PDF');
        $this->media = Media::create(['file_name' => 'guide.pdf', 'file_path' => 'media/2026/09/guide.pdf', 'mime_type' => 'application/pdf', 'size' => 3, 'kind' => 'document']);
    }

    /** @return array<string, mixed> */
    private function fields(string $accessType, ?int $fileId = null): array
    {
        return [
            'title' => 'Handbook', 'file_media_id' => $fileId ?? $this->media->id, 'status' => 'published', 'sort_order' => 1,
            'access_type' => $accessType, 'price' => $accessType === 'paid' ? '10' : '',
        ];
    }

    public function test_a_paid_resource_moves_its_file_to_private_storage_and_back(): void
    {
        $this->post('/admin/resources/books', $this->fields('paid'))->assertRedirect();

        $this->media->refresh();
        $this->assertTrue($this->media->isPrivate());
        Storage::disk('public')->assertMissing('media/2026/09/guide.pdf');
        Storage::disk('local')->assertExists('media/2026/09/guide.pdf');
        $this->assertStringContainsString("/admin/media/{$this->media->id}/file", $this->media->url());

        $item = ResourceItem::sole();
        $this->patch("/admin/resources/books/{$item->id}", $this->fields('open'))->assertRedirect();

        $this->media->refresh();
        $this->assertFalse($this->media->isPrivate());
        Storage::disk('public')->assertExists('media/2026/09/guide.pdf');
        Storage::disk('local')->assertMissing('media/2026/09/guide.pdf');
        $this->get('/resources/books')->assertInertia(fn (Assert $page) => $page
            ->where('items.0.fileUrl', fn (string $url) => str_contains($url, 'media/2026/09/guide.pdf')));
    }

    public function test_swapping_the_file_on_a_paid_resource_releases_the_old_one(): void
    {
        $this->post('/admin/resources/books', $this->fields('paid'))->assertRedirect();
        Storage::disk('public')->put('media/2026/09/new.pdf', 'NEW');
        $newMedia = Media::create(['file_name' => 'new.pdf', 'file_path' => 'media/2026/09/new.pdf', 'mime_type' => 'application/pdf', 'size' => 3, 'kind' => 'document']);

        $this->patch('/admin/resources/books/'.ResourceItem::sole()->id, $this->fields('paid', $newMedia->id))->assertRedirect();

        $this->assertFalse($this->media->refresh()->isPrivate());
        $this->assertTrue($newMedia->refresh()->isPrivate());
    }

    public function test_a_file_shared_by_two_paid_resources_stays_private_until_neither_is_paid(): void
    {
        $this->post('/admin/resources/books', $this->fields('paid'))->assertRedirect();
        $this->post('/admin/resources/books', $this->fields('paid'))->assertRedirect();
        [$first, $second] = ResourceItem::orderBy('id')->get()->all();

        $this->patch("/admin/resources/books/{$first->id}", $this->fields('email'))->assertRedirect();
        $this->assertTrue($this->media->refresh()->isPrivate());

        $this->patch("/admin/resources/books/{$second->id}", $this->fields('open'))->assertRedirect();
        $this->assertFalse($this->media->refresh()->isPrivate());
    }

    public function test_private_files_are_previewable_by_staff_only(): void
    {
        $this->post('/admin/resources/books', $this->fields('paid'))->assertRedirect();

        $this->get("/admin/media/{$this->media->id}/file")->assertOk();

        $role = Role::create(['name' => 'Analyst', 'permissions' => ['analytics' => ['view' => true, 'edit' => false, 'delete' => false]]]);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
        $this->get("/admin/media/{$this->media->id}/file")->assertForbidden();

        auth()->logout();
        $this->get("/admin/media/{$this->media->id}/file")->assertRedirect('/login');
    }

    public function test_deleting_an_unused_private_file_removes_it_from_private_storage(): void
    {
        Storage::disk('local')->put('media/private.pdf', 'X');
        $media = Media::create(['file_name' => 'private.pdf', 'file_path' => 'media/private.pdf', 'disk' => 'local', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);

        $this->delete("/admin/media/{$media->id}")->assertRedirect();

        Storage::disk('local')->assertMissing('media/private.pdf');
    }
}
