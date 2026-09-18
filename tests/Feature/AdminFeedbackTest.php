<?php

namespace Tests\Feature;

use App\Models\AdminFeedback;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminFeedbackTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);

        return $user;
    }

    private function roleHolder(): User
    {
        $role = Role::create(['name' => 'Editor', 'permissions' => [
            'pages' => ['view' => true, 'edit' => true, 'delete' => false],
        ]]);
        $user = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($user);

        return $user;
    }

    public function test_any_admin_viewer_can_submit_feedback_and_it_records_who_when_where_and_type(): void
    {
        $user = $this->roleHolder();

        $this->postJson('/admin/feedback', [
            'type' => 'bug',
            'message' => 'The search box is a bit slow.',
            'page_url' => '/admin/content',
        ])->assertOk();

        $this->assertDatabaseHas('admin_feedback', [
            'user_id' => $user->id,
            'type' => 'bug',
            'message' => 'The search box is a bit slow.',
            'page_url' => '/admin/content',
        ]);
        $feedback = AdminFeedback::firstOrFail();
        $this->assertNotNull($feedback->created_at);
        $this->assertNotNull($feedback->user_agent);
    }

    public function test_feedback_requires_admin_access_a_valid_type_and_a_message(): void
    {
        $this->postJson('/admin/feedback', ['type' => 'bug', 'message' => 'x'])->assertUnauthorized();

        $this->roleHolder();
        $this->postJson('/admin/feedback', ['type' => 'bug'])->assertUnprocessable()->assertJsonValidationErrors('message');
        $this->postJson('/admin/feedback', ['message' => 'x'])->assertUnprocessable()->assertJsonValidationErrors('type');
        $this->postJson('/admin/feedback', ['type' => 'not-a-real-type', 'message' => 'x'])
            ->assertUnprocessable()->assertJsonValidationErrors('type');
    }

    public function test_feedback_survives_the_submitting_users_deletion(): void
    {
        $user = $this->roleHolder();
        $this->postJson('/admin/feedback', ['type' => 'other', 'message' => 'Still here after deletion.'])->assertOk();
        $feedback = AdminFeedback::firstOrFail();

        $user->delete();

        $this->assertDatabaseHas('admin_feedback', ['id' => $feedback->id, 'user_id' => null]);
        $this->assertSame('Still here after deletion.', $feedback->fresh()->message);
    }

    public function test_screenshots_can_be_attached_and_are_stored_and_listed(): void
    {
        Storage::fake('public');
        $this->roleHolder();

        $this->postJson('/admin/feedback', [
            'type' => 'bug',
            'message' => 'Layout is broken here, see attached.',
            'photos' => [
                UploadedFile::fake()->image('broken-layout.png'),
                UploadedFile::fake()->image('console-error.jpg'),
            ],
        ])->assertOk();

        $feedback = AdminFeedback::with('attachments')->firstOrFail();
        $this->assertCount(2, $feedback->attachments);
        foreach ($feedback->attachments as $attachment) {
            Storage::disk('public')->assertExists($attachment->file_path);
        }

        $data = $feedback->adminData();
        $this->assertCount(2, $data['attachments']);
        $this->assertNotEmpty($data['attachments'][0]['url']);
    }

    public function test_screenshot_uploads_reject_non_image_files_and_cap_at_five(): void
    {
        Storage::fake('public');
        $this->roleHolder();

        $this->postJson('/admin/feedback', [
            'type' => 'bug',
            'message' => 'x',
            'photos' => [UploadedFile::fake()->create('not-an-image.pdf', 10, 'application/pdf')],
        ])->assertUnprocessable()->assertJsonValidationErrors('photos.0');

        $this->postJson('/admin/feedback', [
            'type' => 'bug',
            'message' => 'x',
            'photos' => array_fill(0, 6, UploadedFile::fake()->image('x.png')),
        ])->assertUnprocessable()->assertJsonValidationErrors('photos');
    }

    public function test_only_root_admins_can_view_or_delete_feedback(): void
    {
        AdminFeedback::create(['type' => 'other', 'message' => 'Needs review.']);

        $this->roleHolder();
        $this->get('/admin/feedback')->assertForbidden();

        $this->staff();
        $this->get('/admin/feedback')->assertOk()->assertInertia(fn ($page) => $page
            ->component('admin/feedback/index')
            ->has('feedback', 1));

        $feedback = AdminFeedback::firstOrFail();
        $this->delete("/admin/feedback/{$feedback->id}")->assertRedirect('/admin/feedback');
        $this->assertDatabaseMissing('admin_feedback', ['id' => $feedback->id]);
    }

    public function test_deleting_feedback_removes_its_attachment_files_from_disk(): void
    {
        Storage::fake('public');
        $this->roleHolder();
        $this->postJson('/admin/feedback', [
            'type' => 'bug',
            'message' => 'x',
            'photos' => [UploadedFile::fake()->image('shot.png')],
        ])->assertOk();
        $feedback = AdminFeedback::with('attachments')->firstOrFail();
        $path = $feedback->attachments->first()->file_path;
        Storage::disk('public')->assertExists($path);

        $this->staff();
        $this->delete("/admin/feedback/{$feedback->id}")->assertRedirect('/admin/feedback');

        Storage::disk('public')->assertMissing($path);
        $this->assertDatabaseMissing('admin_feedback_attachments', ['admin_feedback_id' => $feedback->id]);
    }

    public function test_deleting_feedback_requires_root(): void
    {
        AdminFeedback::create(['type' => 'other', 'message' => 'x']);
        $this->roleHolder();
        $feedback = AdminFeedback::firstOrFail();

        $this->delete("/admin/feedback/{$feedback->id}")->assertForbidden();
        $this->assertDatabaseHas('admin_feedback', ['id' => $feedback->id]);
    }
}
