<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Lead;
use App\Models\Media;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DataSubjectRequestsTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_forgetting_a_lead_breaks_identity_but_keeps_the_row(): void
    {
        $this->staff();
        $lead = Lead::create(['type' => 'contact', 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'subject' => 'Moving', 'message' => 'Please help', 'submitted_at' => now()]);

        $this->patch("/admin/inquiries/{$lead->id}/forget")->assertRedirect('/admin/inquiries');

        $lead->refresh();
        $this->assertNull($lead->name);
        $this->assertNull($lead->subject);
        $this->assertNull($lead->message);
        $this->assertNotSame('jane@example.com', $lead->email);
        $this->assertNotNull($lead->anonymized_at);
        // The row itself survives — this is anonymization, not deletion.
        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'type' => 'contact']);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'anonymized', 'subject_type' => 'lead', 'subject_id' => $lead->id, 'actor_id' => auth()->id(),
        ]);
    }

    public function test_forgetting_a_lead_twice_is_idempotent_and_logs_once(): void
    {
        $this->staff();
        $lead = Lead::create(['type' => 'contact', 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'submitted_at' => now()]);

        $this->patch("/admin/inquiries/{$lead->id}/forget");
        $firstAnonymizedAt = $lead->fresh()->anonymized_at;
        $this->patch("/admin/inquiries/{$lead->id}/forget");

        $this->assertSame($firstAnonymizedAt->toDateTimeString(), $lead->fresh()->anonymized_at->toDateTimeString());
        $this->assertSame(1, AuditLog::where('subject_type', 'lead')->where('subject_id', $lead->id)->count());
    }

    public function test_forgetting_a_resource_request_breaks_identity_but_keeps_the_row(): void
    {
        $this->staff();
        $category = ResourceCategory::create(['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list']);
        $media = Media::create(['file_name' => 'guide.pdf', 'file_path' => 'media/guide.pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);
        $item = ResourceItem::create(['resource_category_id' => $category->id, 'title' => 'Relocation Guide', 'file_media_id' => $media->id, 'access_type' => 'email', 'status' => 'published', 'sort_order' => 1]);
        $resourceRequest = ResourceRequest::create(['resource_item_id' => $item->id, 'first_name' => 'Jane', 'last_name' => 'Doe', 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'company' => 'Acme', 'submitted_at' => now()]);

        $this->patch("/admin/orders/resource-requests/{$resourceRequest->id}/forget")->assertRedirect('/admin/orders');

        $resourceRequest->refresh();
        $this->assertNull($resourceRequest->name);
        $this->assertNull($resourceRequest->first_name);
        $this->assertNull($resourceRequest->last_name);
        $this->assertNull($resourceRequest->company);
        $this->assertNotSame('jane@example.com', $resourceRequest->email);
        $this->assertNotNull($resourceRequest->anonymized_at);
        // The row (and its link to the resource it was about) survives.
        $this->assertDatabaseHas('resource_requests', ['id' => $resourceRequest->id, 'resource_item_id' => $item->id]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'anonymized', 'subject_type' => 'resource_request', 'subject_id' => $resourceRequest->id,
        ]);
    }

    public function test_forget_endpoints_require_staff(): void
    {
        $lead = Lead::create(['type' => 'contact', 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'submitted_at' => now()]);

        $this->patch("/admin/inquiries/{$lead->id}/forget")->assertRedirect('/login');
        $this->assertNull($lead->fresh()->anonymized_at);

        $this->actingAs(User::factory()->create());
        $this->patch("/admin/inquiries/{$lead->id}/forget")->assertForbidden();
        $this->assertNull($lead->fresh()->anonymized_at);
    }

    public function test_admin_inquiries_index_hides_forgotten_records(): void
    {
        $this->staff();
        $lead = Lead::create(['type' => 'contact', 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'submitted_at' => now()]);
        $lead->anonymize();

        $this->get('/admin/inquiries')->assertInertia(fn (Assert $page) => $page
            ->has('leads', 0));
    }
}
