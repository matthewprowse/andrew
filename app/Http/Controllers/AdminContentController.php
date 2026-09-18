<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class AdminContentController extends Controller
{
    /**
     * Unified Content Library listing (LIB-01,
     * docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4) — replaces the Phase 2
     * navigation-only hub. Merges published+draft BlogPost and ResourceItem
     * rows into one normalized, filterable table via the read-only
     * ContentLibrary facade; editing still goes through each type's own
     * existing validated route (see resources/js/features/admin/content/
     * content-library-manager.tsx).
     *
     * Each source is included only if the user can view that section —
     * matches the per-tab permission scoping the plan requires for combined
     * workspaces (§3.2: "each tab, action, dataset, and request retains its
     * own underlying permission check"). The route itself stays gated on the
     * blog/resources OR (not a single section) so the sidebar's Content
     * Library item — a union over those two sections — never links to a
     * 403. Testimonials (and FAQs) moved to the Reusable Content workspace
     * under Website as of LIB-05/06 (docs/ADMIN_UX_SEO_BUILD_PLAN.md
     * §Phase 4 batch 4B) — see AdminReusableContentController — so
     * `testimonials` is no longer part of this gate or this listing.
     */
    public function index(): RedirectResponse
    {
        $user = Auth::user();
        $canViewBlog = (bool) $user?->canAdmin('blog', 'view');
        $canViewResources = (bool) $user?->canAdmin('resources', 'view');
        $canViewTestimonials = (bool) $user?->canAdmin('testimonials', 'view');
        abort_unless($canViewBlog || $canViewResources || $canViewTestimonials, 403);

        if ($canViewBlog) {
            return to_route('admin.blog');
        }

        if ($canViewResources) {
            return to_route('admin.resources.index', ['category' => 'brochures']);
        }

        return to_route('admin.testimonials');
    }
}
