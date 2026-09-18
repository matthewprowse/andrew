<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ResourceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_explicitly_configured_existing_users_have_admin_access(): void
    {
        $staff = User::factory()->create();
        $customer = User::factory()->create();

        config(['admin.user_ids' => [(string) $staff->id]]);

        $this->assertTrue(Gate::forUser($staff)->allows('access-admin'));
        $this->assertFalse(Gate::forUser($customer)->allows('access-admin'));

        config(['admin.user_ids' => []]);

        $this->assertFalse(Gate::forUser($staff)->allows('access-admin'));
    }

    public function test_admin_pages_require_staff_access(): void
    {
        $this->get('/admin')->assertRedirect('/login');

        $user = User::factory()->create();
        $this->actingAs($user);
        $this->get('/admin')->assertForbidden();
        $this->get('/admin/users')->assertForbidden();

        config(['admin.user_ids' => [(string) $user->id]]);
        // /admin is a real dashboard now (see resources/js/pages/admin/index.tsx),
        // not a redirect to Services.
        $this->get('/admin')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/index'));
    }

    /**
     * Regression check for the Phase 2 admin-shell migration (NAV-05):
     * every destination Services' unchanged sidebar has always linked to
     * must still resolve for a permitted user, whether it's now on the new
     * AdminWorkspaceLayout shell or (for Services/estimator) still on the
     * original AdminLayout.
     */
    public function test_every_old_sidebar_destination_still_resolves_for_a_root_admin(): void
    {
        $this->seed(ResourceCategorySeeder::class);
        $user = User::factory()->create();
        config(['admin.user_ids' => [(string) $user->id]]);
        $this->actingAs($user);

        $okRoutes = [
            '/admin/services',
            '/admin/pages',
            '/admin/blocks/home',
            '/admin/company',
            '/admin/testimonials',
            '/admin/faqs',
            '/admin/blog',
            '/admin/locations',
            '/admin/resources/brochures',
            '/admin/inquiries',
            '/admin/analytics',
            '/admin/media-library',
            '/admin/media',
            '/admin/company/menu',
            '/admin/estimator',
            '/admin/estimator/overview',
        ];
        foreach ($okRoutes as $route) {
            $response = $this->get($route);
            $this->assertSame(200, $response->getStatusCode(), "Expected 200 for {$route}, got {$response->getStatusCode()}.");
        }

        $redirectRoutes = [
            '/admin/content' => '/admin/blog',
            '/admin/website' => '/admin/blocks/home',
            '/admin/team' => '/admin/company/members',
            '/admin/careers' => '/admin/company/members',
            '/admin/reusable-content' => '/admin/testimonials',
            '/admin/settings' => '/admin/company',
            '/admin/users' => '/admin/company/members',
        ];
        foreach ($redirectRoutes as $route => $target) {
            $this->get($route)->assertRedirect($target);
        }
    }
}
