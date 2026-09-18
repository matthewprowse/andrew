<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\Location;
use App\Models\Page;
use App\Services\PagePublishingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LocationsController extends Controller
{
    public function __construct(private readonly PagePublishingService $publishing) {}

    public function show(): Response
    {
        return $this->render(Page::firstOrCreate(['slug' => 'locations']), preview: false);
    }

    /**
     * PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): extracted
     * so PageContentController::preview() can reuse this exact rendering
     * path with a draft-hydrated `$page` swapped in, instead of duplicating
     * this template's props. `public` so it's callable cross-controller via
     * the container; Offices/Countries always read live data regardless of
     * preview — those models aren't part of this batch's draft/publish
     * mechanism (Page-only, see the batch's scope decision).
     */
    public function render(Page $page, bool $preview): Response
    {
        return Inertia::render('locations', [
            'content' => $page->publicData(),
            'offices' => Location::publiclyVisible()->orderBy('sort_order')->orderBy('id')->get()->map(fn (Location $location) => $location->publicData()),
            'countries' => Country::publiclyVisible()->orderBy('sort_order')->orderBy('id')->get()->map(fn (Country $country) => $country->publicData()),
            'preview' => $preview,
        ]);
    }

    public function showCountry(string $slug): Response
    {
        $country = Country::publiclyVisible()->where('slug', $slug)->firstOrFail();

        return Inertia::render('country', ['country' => $country->publicData()]);
    }

    public function index(): Response
    {
        // CMS-04: the "locations" page copy tab reuses the generic Pages
        // editor, gated by the `pages` permission section — same pattern as
        // CMS-03's About/Careers tabs on Company. The Offices/Countries
        // datasets above are gated by the route's own `locations,view`
        // middleware already; this only adds a fourth, independently gated
        // dataset on top of that, it never broadens what Offices/Countries
        // themselves show.
        $canViewPages = (bool) Auth::user()?->canAdmin('pages', 'view');

        $props = [
            'locations' => Location::query()->orderBy('sort_order')->orderBy('id')->get()->map(fn (Location $location) => $location->adminData()),
            'countries' => Country::query()->orderBy('sort_order')->orderBy('id')->get()->map(fn (Country $country) => $country->adminData()),
        ];

        if ($canViewPages) {
            // PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B):
            // this tab embeds the same PageContentManager the standalone
            // /admin/pages/locations editor uses, so it needs the same
            // draft-aware content and companion props — see
            // PagePublishingService::editorProps().
            $props['pageContent'] = $this->publishing->editorProps(Page::firstOrCreate(['slug' => 'locations']), 'locations');
        }

        return Inertia::render('admin/locations/index', $props);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedFields($request);

        DB::transaction(function () use ($data) {
            // CMS-04: at most one office may be primary at a time. Setting a
            // new primary atomically unsets any previous one inside the same
            // transaction as the create, so two rows can never both read
            // is_primary = true, even under concurrent requests.
            if ($data['is_primary']) {
                Location::query()->where('is_primary', true)->update(['is_primary' => false]);
            }

            Location::create($data);
        });

        return to_route('admin.locations');
    }

    public function update(Request $request, Location $location): RedirectResponse
    {
        $data = $this->validatedFields($request);

        DB::transaction(function () use ($data, $location) {
            if ($data['is_primary']) {
                Location::query()->where('id', '!=', $location->id)->where('is_primary', true)->update(['is_primary' => false]);
            }

            $location->update($data);
        });

        return to_route('admin.locations');
    }

    /** @return array<string, mixed> */
    private function validatedFields(Request $request): array
    {
        $data = $request->validate([
            'officeName' => ['required', 'string', 'max:255'], 'address' => ['required', 'string', 'max:20000'],
            'phone' => ['nullable', 'string', 'max:64'], 'email' => ['nullable', 'email', 'max:255'],
            'sortOrder' => ['required', 'integer', 'min:0', 'max:1000000'],
            'status' => ['required', 'in:draft,published,archived'],
            'isPrimary' => ['sometimes', 'boolean'],
        ]);

        return ['office_name' => $data['officeName'], 'address' => $data['address'], 'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null, 'sort_order' => $data['sortOrder'],
            'status' => (request()->user()?->canAdmin('locations', 'publish') ?? false) ? $data['status'] : 'draft',
            'is_primary' => $data['isPrimary'] ?? false];
    }
}
