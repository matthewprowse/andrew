<?php

namespace Tests\Feature;

use App\Models\Career;
use App\Models\Role;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CompanyTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    private function userWithPermission(string $section): void
    {
        $role = Role::create([
            'name' => ucfirst($section).' viewer',
            'permissions' => [$section => ['view' => true, 'edit' => false, 'delete' => false]],
        ]);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    public function test_old_company_urls_redirect_to_their_canonical_pages(): void
    {
        $this->staff();
        $this->get('/admin/team')->assertRedirect('/admin/company/members');
        $this->get('/admin/careers')->assertRedirect('/admin/company/members');
        $this->get('/admin/users')->assertRedirect('/admin/company/members');
    }

    public function test_guests_are_redirected_to_login(): void
    {
        foreach (['/admin/company', '/admin/company/members', '/admin/company/about'] as $url) {
            $this->get($url)->assertRedirect('/login');
        }
    }

    public function test_company_settings_is_a_standalone_page(): void
    {
        $this->staff();
        $this->get('/admin/company')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/company/index')->where('section', 'site')->has('settings.site')->has('settings.menu')->has('settings.socialLinks')
            ->missing('members')->missing('careers')->missing('about'));
    }

    public function test_menu_and_social_links_are_separate_settings_pages(): void
    {
        $this->staff();

        $this->get('/admin/company/menu')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/company/index')->where('section', 'menu'));
        $this->get('/admin/company/social-links')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/company/index')->where('section', 'social-links'));

        $this->get('/admin/settings/site')->assertRedirect('/admin/company');
        $this->get('/admin/settings/menu')->assertRedirect('/admin/company/menu');
        $this->get('/admin/settings/social-links')->assertRedirect('/admin/company/social-links');
    }

    public function test_root_members_page_combines_users_team_members_and_roles(): void
    {
        $this->staff();
        $role = Role::create(['name' => 'Editor', 'permissions' => []]);
        User::factory()->create(['name' => 'Application User', 'role_id' => $role->id]);
        TeamMember::create(['name' => 'Public Person', 'role' => 'Director', 'status' => 'published', 'sort_order' => 1]);

        $this->get('/admin/company/members')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/company/members')->has('members', 1)->where('members.0.name', 'Public Person')
            ->has('users', 2)->has('roles', 1)->has('sections'));
    }

    public function test_team_viewer_only_receives_public_team_records_on_members_page(): void
    {
        $this->userWithPermission('team');
        TeamMember::create(['name' => 'Public Person', 'role' => 'Director', 'status' => 'published', 'sort_order' => 1]);

        $this->get('/admin/company/members')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/company/members')->has('members', 1)
            ->missing('users')->missing('roles')->missing('sections'));
        $this->get('/admin/company')->assertForbidden();
    }

    public function test_open_positions_are_part_of_team_members_and_independently_scoped(): void
    {
        Career::create(['job_title' => 'Consultant', 'description' => 'x', 'location' => 'Cape Town', 'status' => 'open', 'posted_date' => '2026-09-07']);
        TeamMember::create(['name' => 'Public Person', 'role' => 'Director', 'status' => 'published', 'sort_order' => 1]);

        $this->userWithPermission('careers');
        $this->get('/admin/company/members')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/company/members')->has('careers', 1)->missing('members'));

        $this->userWithPermission('team');
        $this->get('/admin/company/members')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/company/members')->has('members', 1)->missing('careers'));

        $this->userWithPermission('pages');
        $this->get('/admin/company/members')->assertForbidden();
    }

    public function test_old_careers_and_about_editor_urls_redirect(): void
    {
        $this->userWithPermission('careers');
        $this->get('/admin/company/careers')->assertRedirect('/admin/company/members');

        $this->userWithPermission('pages');
        $this->get('/admin/pages/about')->assertRedirect('/admin/blocks/about');
        // /admin/company/about is a second, older bookmark for the same
        // destination — About moved onto the block-page system (see
        // Tests\Feature\BlockPageTest), so both point at its real editor now.
        $this->get('/admin/company/about')->assertRedirect('/admin/blocks/about');
    }

    public function test_unrelated_roles_cannot_reach_company_pages(): void
    {
        $this->userWithPermission('analytics');
        foreach (['/admin/company', '/admin/company/members'] as $url) {
            $this->get($url)->assertForbidden();
        }
        // /admin/company/about redirects unconditionally (same pattern as
        // /admin/company/careers) — its destination enforces the permission.
        $this->get('/admin/company/about')->assertRedirect('/admin/blocks/about');
        $this->get('/admin/blocks/about')->assertForbidden();
    }

    public function test_site_settings_are_still_saved_through_the_existing_endpoint(): void
    {
        $this->staff();
        $payload = ['site' => [
            'footerText' => 'Updated footer', 'copyrightLine' => '', 'defaultCtaText' => '', 'defaultCtaDescription' => '',
            'defaultCtaButtonLabel' => '', 'defaultCtaLink' => '/contact', 'euraHeading' => '', 'euraText' => '',
            'organizationName' => '', 'defaultOgImage' => '', 'organizationLogo' => '', 'feedbackEnabled' => true,
        ]];
        $this->put('/admin/settings/site', $payload)->assertRedirect();
        $this->get('/admin/company')->assertInertia(fn (Assert $page) => $page->where('settings.site.footerText', 'Updated footer'));
    }

    // The old "published team member count" warning belonged to About's
    // fixed show_team_section toggle, which the block system replaced with
    // an ordinary Team block an editor adds or removes — see
    // Tests\Feature\BlockPageTest for its current coverage (the Team block
    // reflects live published team members).
}
