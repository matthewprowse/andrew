<?php

namespace Tests\Feature;

use App\Models\Career;
use App\Models\User;
use Database\Seeders\CareerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CareersTest extends TestCase
{
    use RefreshDatabase;

    private function fields(): array
    {
        return ['jobTitle' => 'Consultant', 'description' => 'Help people move.', 'location' => 'Cape Town', 'status' => 'Open', 'postedDate' => '2026-09-07'];
    }

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_staff_changes_appear_publicly_and_closed_jobs_disappear(): void
    {
        $this->staff();
        $this->post('/admin/careers', $this->fields())->assertRedirect('/admin/company/members');
        $career = Career::firstOrFail();
        // Open positions is the "open_positions" block on About — see
        // Tests\Feature\BlockPageTest for the seeded block order.
        $this->get('/about')->assertInertia(fn (Assert $page) => $page
            ->has('blocks.4.data.positions', 1)->where('blocks.4.data.positions.0.title', 'Consultant'));
        $this->patch('/admin/careers/'.$career->id, [...$this->fields(), 'description' => 'Updated description.'])->assertRedirect();
        $this->get('/about')->assertInertia(fn (Assert $page) => $page->where('blocks.4.data.positions.0.description', 'Updated description.'));
        $this->patch('/admin/careers/'.$career->id, [...$this->fields(), 'status' => 'Closed'])->assertRedirect();
        $this->get('/about')->assertInertia(fn (Assert $page) => $page->has('blocks.4.data.positions', 0));
        $this->get('/admin/company/members')->assertInertia(fn (Assert $page) => $page->where('careers.0.status', 'Closed'));
    }

    public function test_application_subject_reaches_leads_and_closed_or_unknown_jobs_do_not_prefill(): void
    {
        $this->seed(CareerSeeder::class);
        // The seeder deliberately creates closed roles while their copy is placeholder;
        // this test is about subject prefilling for an open role, so open them explicitly.
        Career::query()->update(['status' => 'open']);
        $career = Career::firstOrFail();
        $subject = 'Application: '.$career->job_title.' — '.$career->location;
        $this->get('/contact?career='.$career->id)->assertInertia(fn (Assert $page) => $page->where('defaultSubject', $subject));
        $this->post('/contact', ['name' => 'Applicant', 'email' => 'applicant@example.com', 'subject' => $subject, 'message' => 'I would like to apply.'])->assertRedirect();
        $this->assertDatabaseHas('leads', ['email' => 'applicant@example.com', 'subject' => $subject]);
        $career->update(['status' => 'closed']);
        foreach ([$career->id, 99999] as $id) {
            $this->get('/contact?career='.$id)->assertInertia(fn (Assert $page) => $page->where('defaultSubject', ''));
        }
    }

    public function test_careers_require_staff_and_valid_fields(): void
    {
        $this->get('/admin/company')->assertRedirect('/login');
        $this->post('/admin/careers', $this->fields())->assertRedirect('/login');
        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->get('/admin/company')->assertForbidden();
        $this->post('/admin/careers', $this->fields())->assertForbidden();
        $career = Career::create(['job_title' => 'Existing', 'description' => 'Existing role', 'location' => 'Cape Town', 'status' => 'open', 'posted_date' => '2026-09-07']);
        $this->patch('/admin/careers/'.$career->id, $this->fields())->assertForbidden();
        $career->delete();
        $this->staff();
        $this->postJson('/admin/careers', [...$this->fields(), 'status' => 'Draft', 'postedDate' => 'invalid'])->assertUnprocessable();
        $this->assertDatabaseCount('careers', 0);
    }

    public function test_long_job_details_produce_a_valid_contact_subject(): void
    {
        $career = Career::create([
            'job_title' => str_repeat('A', 255), 'location' => str_repeat('B', 255),
            'description' => 'Details', 'status' => 'open', 'posted_date' => '2026-09-07',
        ]);
        $subject = substr('Application: '.$career->job_title, 0, 255);
        $this->get('/contact?career='.$career->id)->assertInertia(fn (Assert $page) => $page->where('defaultSubject', $subject));
        $this->post('/contact', [
            'name' => 'Applicant', 'email' => 'applicant@example.com',
            'subject' => $subject, 'message' => 'I would like to apply.',
        ])->assertSessionHasNoErrors()->assertRedirect('/contact');
    }

    public function test_demo_seed_is_idempotent_and_does_not_overwrite_edits(): void
    {
        $this->seed(CareerSeeder::class);
        Career::firstOrFail()->update(['job_title' => 'Renamed by staff', 'description' => 'Edited by staff']);
        $this->seed(CareerSeeder::class);
        $this->assertDatabaseCount('careers', 2);
        $this->assertDatabaseHas('careers', ['job_title' => 'Renamed by staff', 'description' => 'Edited by staff']);
        $this->assertDatabaseMissing('careers', ['job_title' => 'Relocation Consultant']);
    }
}
