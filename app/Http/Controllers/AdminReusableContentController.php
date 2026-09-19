<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use App\Models\Testimonial;
use App\Support\AdminOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Standalone FAQ and Testimonials pages for the Content Library. The legacy
 * combined URL remains as a permission-aware compatibility redirect.
 */
class AdminReusableContentController extends Controller
{
    public function faqs(): Response
    {
        $user = Auth::user();
        abort_unless($user?->canAdmin('resources', 'view'), 403);

        return Inertia::render('admin/faqs/index', [
            'faqs' => Faq::query()->with(['service', 'services'])->orderBy('id')->get()->map(fn (Faq $faq) => $faq->adminData()),
            'services' => $this->services(),
        ]);
    }

    public function testimonials(): Response
    {
        $user = Auth::user();
        abort_unless($user?->canAdmin('testimonials', 'view'), 403);

        return Inertia::render('admin/testimonials/index', [
            'testimonials' => Testimonial::query()->orderBy('sort_order')->orderBy('id')->get()->map(fn (Testimonial $testimonial) => $testimonial->adminData()),
            'services' => $this->services(),
        ]);
    }

    public function index(): RedirectResponse
    {
        $user = Auth::user();
        $canViewTestimonials = (bool) $user?->canAdmin('testimonials', 'view');
        $canViewFaqs = (bool) $user?->canAdmin('resources', 'view');

        abort_unless($canViewTestimonials || $canViewFaqs, 403);

        if (request()->query('tab') === 'faqs' && $canViewFaqs) {
            return to_route('admin.faqs');
        }

        if ($canViewTestimonials) {
            return to_route('admin.testimonials');
        }

        return to_route('admin.faqs');
    }

    /** @return Collection<int, array{id: string, name: string}> */
    private function services(): Collection
    {
        return AdminOptions::services();
    }
}
