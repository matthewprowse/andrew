<?php

namespace Tests\Feature;

use App\Models\TeamMember;
use App\Models\User;
use Database\Seeders\TeamMemberSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    private function fields(array $overrides = []): array
    {
        return [...[
            'name' => 'Jane Doe', 'role' => 'Head of Mobility', 'bio' => 'Leads our mobility division.',
            'status' => 'draft', 'sort_order' => 1,
        ], ...$overrides];
    }

    public function test_staff_can_add_and_edit_team_members(): void
    {
        $this->staff();

        $this->post('/admin/team', $this->fields())->assertRedirect('/admin/company/members');
        $member = TeamMember::firstOrFail();
        $this->assertSame('draft', $member->status);

        $this->patch("/admin/team/{$member->id}", [...$this->fields(), 'status' => 'published'])->assertRedirect('/admin/company/members');
        $this->assertSame('published', $member->fresh()->status);
        $this->assertNotNull($member->fresh()->published_at);

        $this->get('/admin/company/members')->assertInertia(fn (Assert $page) => $page->has('members', 1)->where('members.0.name', 'Jane Doe'));
    }

    public function test_only_published_members_are_publicly_visible(): void
    {
        TeamMember::create([...$this->fields(['name' => 'Draft Member']), 'status' => 'draft']);
        TeamMember::create([...$this->fields(['name' => 'Published Member']), 'status' => 'published']);

        $visible = TeamMember::publiclyVisible()->pluck('name');
        $this->assertEquals(['Published Member'], $visible->all());
    }

    public function test_team_requires_staff_and_valid_fields(): void
    {
        $this->post('/admin/team', $this->fields())->assertRedirect('/login');

        Gate::define('access-admin', fn (User $user) => false);
        $this->actingAs(User::factory()->create());
        $this->post('/admin/team', $this->fields())->assertForbidden();

        $this->staff();
        $this->postJson('/admin/team', [...$this->fields(), 'name' => ''])->assertUnprocessable();
        $this->assertDatabaseCount('team_members', 0);
    }

    public function test_seed_is_idempotent_and_preserves_staff_edits(): void
    {
        $this->seed(TeamMemberSeeder::class);
        TeamMember::firstOrFail()->update(['name' => 'Renamed by staff']);
        $this->seed(TeamMemberSeeder::class);

        $this->assertDatabaseCount('team_members', 3);
        $this->assertDatabaseHas('team_members', ['name' => 'Renamed by staff']);
    }
}
