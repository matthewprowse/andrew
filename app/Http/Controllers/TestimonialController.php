<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveTestimonialRequest;
use App\Models\AuditLog;
use App\Models\Testimonial;
use Illuminate\Http\RedirectResponse;

/**
 * Listing/display moved to AdminReusableContentController as part of LIB-05
 * (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4 batch 4B) — Testimonials is now
 * a tab on /admin/reusable-content rather than its own standalone page. This
 * controller's write behavior, validation (SaveTestimonialRequest, still
 * gated by the `testimonials` permission section), public placement rules,
 * and post-save redirect target (`admin.testimonials`) are all unchanged
 * from before this batch — only the removed read-only index() method is
 * new. `admin.testimonials` now names the GET compatibility redirect in
 * routes/web.php (same pattern as /admin/team → /admin/company) rather than
 * a real page, so a save here still 302s to /admin/testimonials, which
 * itself then 302s on to /admin/reusable-content?tab=testimonials — this
 * keeps tests/Feature/TestimonialsTest.php's existing
 * assertRedirect('/admin/testimonials') assertions passing unmodified.
 */
class TestimonialController extends Controller
{
    public function store(SaveTestimonialRequest $request): RedirectResponse
    {
        $testimonial = Testimonial::create($this->fields($request));
        AuditLog::record('created', 'testimonial', $testimonial->id, ['author' => $testimonial->author, 'status' => $testimonial->status]);

        return to_route('admin.testimonials');
    }

    public function update(SaveTestimonialRequest $request, Testimonial $testimonial): RedirectResponse
    {
        $testimonial->update($this->fields($request, $testimonial));
        AuditLog::record('updated', 'testimonial', $testimonial->id, ['author' => $testimonial->author, 'status' => $testimonial->status]);

        return to_route('admin.testimonials');
    }

    /** @return array<string, mixed> */
    private function fields(SaveTestimonialRequest $request, ?Testimonial $testimonial = null): array
    {
        $data = $request->validated();
        $published = (request()->user()?->canAdmin('testimonials', 'publish') ?? false)
            && in_array($data['status'], ['Live', 'Published'], true);
        $publishedAt = $testimonial ? $testimonial->published_at : null;

        return ['quote' => $data['quote'], 'author' => $data['author'], 'company' => $data['company'] ?? null, 'service_id' => $data['serviceId'] ?? null, 'sort_order' => $data['sortOrder'], 'status' => $published ? 'published' : 'draft', 'published_at' => $published ? ($publishedAt ?? now()) : $publishedAt];
    }
}
