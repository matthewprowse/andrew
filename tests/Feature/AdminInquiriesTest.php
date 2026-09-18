<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminInquiriesTest extends TestCase
{
    use RefreshDatabase;

    private function signInStaff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_public_contact_appears_in_staff_inbox(): void
    {
        $this->post('/contact', [
            'name' => 'Jane Example', 'email' => 'jane@example.com',
            'subject' => 'Moving to Cape Town', 'message' => 'Please help with my move.',
        ])->assertRedirect('/contact');

        $this->signInStaff();
        $this->get('/admin/inquiries')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/inquiries/index')->has('leads', 1)
            ->where('leads.0.email', 'jane@example.com')->where('leads.0.subject', 'Moving to Cape Town')
            ->where('leads.0.handled', false));
    }

    public function test_estimator_email_appears_without_optional_contact_fields(): void
    {
        $this->signInStaff();
        $this->postJson('/estimator/access', ['email' => 'planner@example.com'])->assertOk();
        $this->get('/admin/inquiries')->assertInertia(fn (Assert $page) => $page
            ->has('leads', 0));
    }

    public function test_handled_update_persists_and_rejects_invalid_values(): void
    {
        $lead = Lead::create(['type' => 'contact', 'email' => 'planner@example.com', 'submitted_at' => now()]);
        $this->signInStaff();
        $this->patch("/admin/inquiries/{$lead->id}", ['handled' => true])->assertRedirect('/admin/inquiries');
        $this->assertTrue($lead->fresh()->handled);
        $this->get('/admin/inquiries')->assertInertia(fn (Assert $page) => $page->where('leads.0.handled', true));
        $this->patchJson("/admin/inquiries/{$lead->id}", ['handled' => 'invalid'])->assertUnprocessable();
        $this->assertTrue($lead->fresh()->handled);
    }

    public function test_guests_and_nonstaff_cannot_read_or_update_inquiries(): void
    {
        $lead = Lead::create(['type' => 'quote', 'email' => 'planner@example.com', 'submitted_at' => now()]);
        $this->get('/admin/inquiries')->assertRedirect('/login');
        $this->patch("/admin/inquiries/{$lead->id}", ['handled' => true])->assertRedirect('/login');
        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->get('/admin/inquiries')->assertForbidden();
        $this->patch("/admin/inquiries/{$lead->id}", ['handled' => true])->assertForbidden();
        $this->assertFalse($lead->fresh()->handled);
    }
}
