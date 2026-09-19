<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Models\Career;
use App\Models\Lead;
use App\Models\Location;
use App\Models\Page;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    /**
     * Show the public contact page.
     */
    public function show(Request $request): Response
    {
        $career = $request->integer('career') > 0
            ? Career::query()->where('status', 'open')->find($request->integer('career'))
            : null;

        return $this->render(Page::firstOrCreate(['slug' => 'contact']), preview: false, defaultSubject: $career
            ? Str::limit('Application: '.$career->job_title.' — '.$career->location, 255, '')
            : '');
    }

    /**
     * PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): extracted
     * so PageContentController::preview() can reuse this exact rendering
     * path with a draft-hydrated `$page` swapped in, instead of duplicating
     * this template's props. `public` so it's callable cross-controller via
     * the container. Preview never needs a prefilled subject line — it has
     * no career-application context — so it always passes the default ''.
     */
    public function render(Page $page, bool $preview, string $defaultSubject = ''): Response
    {
        return Inertia::render('contact', [
            'content' => $page->publicData(),
            'offices' => Location::publiclyVisible()->orderBy('sort_order')->orderBy('id')->get()->map(fn (Location $location) => $location->publicData()),
            'defaultSubject' => $defaultSubject,
            'preview' => $preview,
        ]);
    }

    /**
     * Store a new contact submission as a lead.
     */
    public function store(ContactRequest $request): RedirectResponse
    {
        Lead::create([
            ...$request->validated(),
            'type' => 'contact',
            'submitted_at' => now(),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __("Thanks — we've received your message and will be in touch soon."),
        ]);

        if ($request->filled('service_id')) {
            $service = Service::query()->find($request->integer('service_id'));
            if ($service) {
                return to_route('services.show', ['slug' => $service->slug]);
            }
        }

        return to_route('contact.show');
    }
}
