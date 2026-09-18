<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Lead;
use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private function root(): User
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);

        return $user;
    }

    private function userWithRole(Role $role): User
    {
        $user = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($user);

        return $user;
    }

    private function fullPermissions(): array
    {
        return collect(array_keys(config('admin.sections')))
            ->mapWithKeys(fn (string $key) => [$key => collect(array_keys(config('admin.actions')))->mapWithKeys(fn (string $action) => [$action => true])->all()])
            ->all();
    }

    public function test_root_admin_bypasses_role_restrictions_entirely(): void
    {
        $this->root();

        $this->get('/admin/company')->assertOk();
        $this->get('/admin/company/members')->assertOk();
    }

    public function test_a_plain_user_with_no_role_is_denied_all_admin_access(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get('/admin')->assertForbidden();
        $this->get('/admin/company')->assertForbidden();
    }

    public function test_a_role_grants_view_and_edit_independently(): void
    {
        $role = Role::create(['name' => 'Team Viewer', 'permissions' => [
            'team' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->userWithRole($role);

        $this->get('/admin/company/members')->assertOk();
        $this->post('/admin/team', ['name' => 'Jane', 'role' => 'Advisor', 'status' => 'draft', 'sort_order' => 1])
            ->assertForbidden();
    }

    public function test_create_is_independent_from_edit_and_publish(): void
    {
        $role = Role::create(['name' => 'Article Author', 'permissions' => [
            'blog' => ['view' => true, 'create' => true, 'edit' => false, 'publish' => false, 'delete' => false],
        ]]);
        $this->userWithRole($role);
        $fields = [
            'title' => 'Draft article', 'urlSlug' => 'draft-article', 'excerpt' => 'Summary',
            'body' => 'Body', 'status' => 'Live', 'publishDate' => today()->format('Y-m-d'),
        ];

        $this->post('/admin/blog', $fields)->assertRedirect('/admin/blog');
        $post = BlogPost::sole();
        $this->assertSame('draft', $post->status);
        $this->patch("/admin/blog/{$post->id}", $fields)->assertForbidden();
    }

    public function test_publish_is_independent_from_edit(): void
    {
        $author = User::factory()->create();
        $post = BlogPost::create([
            'title' => 'Draft', 'slug' => 'draft', 'excerpt' => 'Summary', 'body' => 'Body',
            'status' => 'draft', 'author_id' => $author->id,
        ]);
        $role = Role::create(['name' => 'Article Editor', 'permissions' => [
            'blog' => ['view' => true, 'create' => false, 'edit' => true, 'publish' => false, 'delete' => false],
        ]]);
        $this->userWithRole($role);

        $this->patch("/admin/blog/{$post->id}", [
            'title' => 'Draft', 'urlSlug' => 'draft', 'excerpt' => 'Summary', 'body' => 'Body',
            'status' => 'Published', 'publishDate' => today()->format('Y-m-d'),
        ])->assertRedirect('/admin/blog');
        $this->assertSame('draft', $post->fresh()->status);
    }

    public function test_a_role_without_a_section_denies_that_sections_pages(): void
    {
        $role = Role::create(['name' => 'No Team Access', 'permissions' => [
            'team' => ['view' => false, 'edit' => false, 'delete' => false],
        ]]);
        $this->userWithRole($role);

        $this->get('/admin/company/members')->assertForbidden();
    }

    public function test_delete_tier_permission_is_enforced_separately_from_edit(): void
    {
        $lead = Lead::create(['type' => 'contact', 'name' => 'Jane Doe', 'email' => 'jane@example.com', 'submitted_at' => now()]);
        $role = Role::create(['name' => 'Inquiries Editor', 'permissions' => [
            'inquiries' => ['view' => true, 'edit' => true, 'delete' => false],
        ]]);
        $this->userWithRole($role);

        $this->patch("/admin/inquiries/{$lead->id}", ['handled' => true])->assertRedirect('/admin/inquiries');
        $this->patch("/admin/inquiries/{$lead->id}/forget")->assertForbidden();
    }

    public function test_website_hub_is_reachable_with_any_of_its_constituent_sections_and_forbidden_without_them(): void
    {
        $role = Role::create(['name' => 'Pages Only', 'permissions' => [
            'pages' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->userWithRole($role);
        $this->get('/admin/website')->assertRedirect('/admin/blocks/home');

        $unrelated = Role::create(['name' => 'Analytics Only', 'permissions' => [
            'analytics' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->actingAs(User::factory()->create(['role_id' => $unrelated->id]));
        $this->get('/admin/website')->assertRedirect('/admin/blocks/home');
    }

    public function test_content_hub_is_reachable_with_any_of_its_constituent_sections_and_forbidden_without_them(): void
    {
        $role = Role::create(['name' => 'Blog Only', 'permissions' => [
            'blog' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->userWithRole($role);
        $this->get('/admin/content')->assertRedirect('/admin/blog');

        $unrelated = Role::create(['name' => 'Estimator Only', 'permissions' => [
            'estimator' => ['view' => true, 'edit' => false, 'delete' => false],
        ]]);
        $this->actingAs(User::factory()->create(['role_id' => $unrelated->id]));
        $this->get('/admin/content')->assertForbidden();
    }

    public function test_website_redirect_is_reachable_by_root_admins(): void
    {
        $this->root();

        $this->get('/admin/website')->assertRedirect('/admin/blocks/home');
    }

    public function test_only_root_admins_can_manage_roles_and_users_even_with_full_section_access(): void
    {
        $role = Role::create(['name' => 'Everything Editor', 'permissions' => $this->fullPermissions()]);
        $this->userWithRole($role);

        $this->get('/admin/users')->assertForbidden();
        $this->post('/admin/roles', ['name' => 'New Role', 'permissions' => []])->assertForbidden();
    }

    public function test_role_crud_persists_only_known_sections_and_audit_logs_each_change(): void
    {
        $this->root();

        $this->post('/admin/roles', [
            'name' => 'Content Editor',
            'description' => 'Can edit pages and services',
            'permissions' => [
                'pages' => ['view' => true, 'edit' => true, 'delete' => false],
                'not-a-real-section' => ['view' => true, 'edit' => true, 'delete' => true],
            ],
        ])->assertRedirect('/admin/company/members');

        $role = Role::sole();
        $this->assertSame('Content Editor', $role->name);
        $this->assertTrue($role->permissions['pages']['view']);
        $this->assertFalse($role->permissions['pages']['delete']);
        $this->assertArrayNotHasKey('not-a-real-section', $role->permissions);
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'subject_type' => 'role', 'subject_id' => $role->id]);

        $this->patch("/admin/roles/{$role->id}", [
            'name' => 'Content Editor',
            'permissions' => ['pages' => ['view' => true, 'edit' => false, 'delete' => false]],
        ])->assertRedirect('/admin/company/members');
        $this->assertFalse($role->fresh()->permissions['pages']['edit']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'updated', 'subject_type' => 'role', 'subject_id' => $role->id]);

        $this->post('/admin/roles', ['name' => '', 'permissions' => []])->assertSessionHasErrors('name');
    }

    public function test_a_role_still_assigned_to_users_cannot_be_deleted(): void
    {
        $this->root();
        $role = Role::create(['name' => 'Assigned Role', 'permissions' => []]);
        User::factory()->create(['role_id' => $role->id]);

        $this->delete("/admin/roles/{$role->id}")->assertSessionHasErrors('role');
        $this->assertDatabaseHas('roles', ['id' => $role->id]);

        $this->assertDatabaseMissing('audit_logs', ['action' => 'deleted', 'subject_type' => 'role', 'subject_id' => $role->id]);
    }

    public function test_an_unused_role_can_be_deleted(): void
    {
        $this->root();
        $role = Role::create(['name' => 'Unused Role', 'permissions' => []]);

        $this->delete("/admin/roles/{$role->id}")->assertRedirect('/admin/company/members');
        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'deleted', 'subject_type' => 'role', 'subject_id' => $role->id]);
    }

    public function test_creating_an_admin_user_sends_a_password_reset_link_and_is_audit_logged(): void
    {
        Notification::fake();
        $this->root();
        $role = Role::create(['name' => 'Reader', 'permissions' => []]);

        $this->post('/admin/users', ['name' => 'New Staffer', 'email' => 'staffer@example.com', 'role_id' => $role->id])
            ->assertRedirect('/admin/company/members');

        $user = User::where('email', 'staffer@example.com')->sole();
        $this->assertSame($role->id, $user->role_id);
        Notification::assertSentTo($user, ResetPassword::class);
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'subject_type' => 'user', 'subject_id' => $user->id]);
    }

    public function test_creating_an_admin_user_rejects_a_duplicate_email(): void
    {
        $this->root();
        $existing = User::factory()->create();

        $this->postJson('/admin/users', ['name' => 'Dup', 'email' => $existing->email])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_creating_an_admin_user_requires_a_role(): void
    {
        Notification::fake();
        $this->root();

        $this->postJson('/admin/users', [
            'name' => 'New Staffer',
            'email' => 'staffer@example.com',
        ])->assertUnprocessable()->assertJsonValidationErrors('role_id');

        $this->assertDatabaseMissing('users', ['email' => 'staffer@example.com']);
    }

    public function test_bulk_role_assignment_updates_each_selected_user_and_logs_individually(): void
    {
        $this->root();
        $role = Role::create(['name' => 'Bulk Role', 'permissions' => []]);
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $this->post('/admin/users/assign-role', ['user_ids' => [$userA->id, $userB->id], 'role_id' => $role->id])
            ->assertRedirect('/admin/company/members');

        $this->assertSame($role->id, $userA->fresh()->role_id);
        $this->assertSame($role->id, $userB->fresh()->role_id);
        $this->assertDatabaseHas('audit_logs', ['action' => 'role_assigned', 'subject_type' => 'user', 'subject_id' => $userA->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'role_assigned', 'subject_type' => 'user', 'subject_id' => $userB->id]);

        $this->postJson('/admin/users/assign-role', ['user_ids' => [$userA->id], 'role_id' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('role_id');
        $this->assertSame($role->id, $userA->fresh()->role_id);
    }
}
