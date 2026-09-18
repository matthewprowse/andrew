<?php

namespace Tests\Feature;

use App\Mail\ResourceAccessVerification;
use App\Models\Media;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ResourceAccessTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    private function gatedItem(): ResourceItem
    {
        $category = ResourceCategory::create(['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list']);
        $media = Media::create(['file_name' => 'guide.pdf', 'file_path' => 'media/guide.pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);

        return ResourceItem::create([
            'resource_category_id' => $category->id, 'title' => 'Relocation Guide', 'file_media_id' => $media->id,
            'access_type' => 'email', 'status' => 'published', 'sort_order' => 1,
        ]);
    }

    public function test_gated_items_hide_the_direct_link_but_ungated_items_do_not(): void
    {
        $item = $this->gatedItem();

        $this->get('/resources/brochures')->assertInertia(fn (Assert $page) => $page
            ->where('items.0.accessType', 'email')
            ->where('items.0.fileUrl', '')
            ->where('items.0.externalUrl', ''));

        $item->update(['access_type' => 'open']);

        $this->get('/resources/brochures')->assertInertia(fn (Assert $page) => $page
            ->where('items.0.accessType', 'open')
            ->where('items.0.fileUrl', fn (string $url) => $url !== ''));
    }

    public function test_requesting_access_emails_a_signed_verification_link(): void
    {
        Mail::fake();
        $item = $this->gatedItem();

        $this->post("/resources/brochures/{$item->id}/request-access", [
            'first_name' => 'Jane', 'last_name' => 'Doe', 'email' => 'jane@example.com', 'company' => 'Acme', 'consent' => true,
        ])->assertRedirect();

        $resourceRequest = ResourceRequest::sole();
        $this->assertDatabaseHas('resource_requests', [
            'resource_item_id' => $item->id, 'first_name' => 'Jane', 'last_name' => 'Doe', 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'company' => 'Acme', 'verified_at' => null,
        ]);
        $this->assertNotNull($resourceRequest->consent_given_at);

        Mail::assertSent(ResourceAccessVerification::class, fn (ResourceAccessVerification $mail) => $mail->resourceRequest->email === 'jane@example.com');
    }

    public function test_requesting_access_without_consent_is_rejected(): void
    {
        $item = $this->gatedItem();

        $this->postJson("/resources/brochures/{$item->id}/request-access", [
            'first_name' => 'Jane', 'last_name' => 'Doe', 'email' => 'jane@example.com',
        ])->assertUnprocessable()->assertJsonValidationErrors('consent');

        $this->assertDatabaseCount('resource_requests', 0);
    }

    public function test_requesting_access_is_rate_limited(): void
    {
        $item = $this->gatedItem();
        $payload = ['first_name' => 'Jane', 'last_name' => 'Doe', 'email' => 'jane@example.com', 'consent' => true];

        foreach (range(1, 6) as $_) {
            $this->post("/resources/brochures/{$item->id}/request-access", $payload);
        }

        $this->post("/resources/brochures/{$item->id}/request-access", $payload)->assertStatus(429);
    }

    public function test_requesting_access_on_a_non_gated_item_404s(): void
    {
        $item = $this->gatedItem();
        $item->update(['access_type' => 'open']);

        $this->post("/resources/brochures/{$item->id}/request-access", [
            'first_name' => 'Jane', 'last_name' => 'Doe', 'email' => 'jane@example.com', 'consent' => true,
        ])->assertNotFound();
    }

    public function test_visiting_the_signed_link_verifies_and_redirects_to_the_file(): void
    {
        $item = $this->gatedItem();
        $resourceRequest = ResourceRequest::create([
            'resource_item_id' => $item->id, 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'submitted_at' => now(),
        ]);

        $signedUrl = URL::temporarySignedRoute('resources.access.verify', now()->addHours(24), ['resourceRequest' => $resourceRequest->id]);

        $this->get($signedUrl)->assertRedirect($item->file->url());

        $this->assertNotNull($resourceRequest->fresh()->verified_at);
    }

    public function test_an_unsigned_or_tampered_link_is_rejected(): void
    {
        $item = $this->gatedItem();
        $resourceRequest = ResourceRequest::create([
            'resource_item_id' => $item->id, 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'submitted_at' => now(),
        ]);

        $this->get("/resources/access/{$resourceRequest->id}/verify")->assertForbidden();
        $this->assertNull($resourceRequest->fresh()->verified_at);
    }

    public function test_resource_requests_appear_in_the_admin_orders_resource_requests_tab(): void
    {
        $item = $this->gatedItem();
        $resourceRequest = ResourceRequest::create([
            'resource_item_id' => $item->id, 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'company' => 'Acme', 'submitted_at' => now(),
        ]);
        $this->staff();

        $this->get('/admin/orders')->assertInertia(fn (Assert $page) => $page
            ->has('resourceRequests', 1)
            ->where('resourceRequests.0.resourceTitle', 'Relocation Guide')
            ->where('resourceRequests.0.email', 'jane@example.com')
            ->where('resourceRequests.0.verified', false));

        $resourceRequest->update(['verified_at' => now()]);

        $this->get('/admin/orders')->assertInertia(fn (Assert $page) => $page->where('resourceRequests.0.verified', true));
    }
}
