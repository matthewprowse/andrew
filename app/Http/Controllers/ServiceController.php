<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveServiceRequest;
use App\Models\BlogPost;
use App\Models\ResourceItem;
use App\Models\Service;
use App\Models\Testimonial;
use App\Support\RichContentSanitizer;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    public function admin(): Response
    {
        return Inertia::render('admin/services/index', [
            'services' => Service::query()->orderBy('sort_order')->orderBy('id')->get()
                ->map(fn (Service $service) => $service->adminData()),
            'resourceOptions' => ResourceItem::query()->where('status', 'published')->with('category')->orderBy('title')->orderBy('id')->get()
                ->map(fn (ResourceItem $resource) => $resource->adminData()),
        ]);
    }

    public function test(): Response
    {
        return Inertia::render('admin/test', [
            'services' => Service::query()->orderBy('sort_order')->orderBy('id')->get()
                ->map(fn (Service $service) => $service->adminData()),
        ]);
    }

    public function index(): Response
    {
        return Inertia::render('services', ['services' => Service::where('status', 'published')->orderBy('sort_order')->orderBy('id')->get()]);
    }

    public function show(string $slug): Response
    {
        $service = Service::where('slug', $slug)->where('status', 'published')->firstOrFail();
        $testimonials = Testimonial::query()->published()
            ->where(fn ($query) => $query->where('service_id', $service->id)->orWhereNull('service_id'))
            ->orderByRaw('case when service_id = ? then 0 else 1 end', [$service->id])
            ->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (Testimonial $testimonial) => $testimonial->publicData());

        // Only posts explicitly tagged to this service belong on this page.
        $taggedPosts = BlogPost::publiclyVisible()
            ->whereHas('services', fn ($query) => $query->where('services.id', $service->id))
            ->orderByDesc('publish_date')->orderByDesc('id')
            ->limit(3)->get();
        $relevantPosts = $taggedPosts
            ->map(fn (BlogPost $post): array => [
                'title' => $post->title,
                'slug' => $post->slug,
                'excerpt' => $post->excerpt,
                'publishDate' => $post->publish_date?->format('Y-m-d') ?? '',
            ]);

        $resourceIds = collect($service->featured_services ?? [])
            ->flatMap(fn (array $feature): array => $feature['resource_ids'] ?? [])
            ->map(fn ($id): int => (int) $id)
            ->filter()->unique()->values();

        // Keep the existing service-level association as a compatibility
        // fallback while editors move resources onto specific featured
        // services. The public page renders both in the same combined area.
        $resources = ResourceItem::publiclyVisible()
            ->whereHas('services', fn ($query) => $query->where('services.id', $service->id))
            ->with(['category', 'file', 'image'])
            ->orderBy('sort_order')->orderByDesc('id')->get()
            ->map(fn (ResourceItem $resource): array => $resource->publicData())
            ->reject(fn (array $resource): bool => $resourceIds->contains((int) $resource['id']))
            ->values();

        $featuredResourceMap = ResourceItem::publiclyVisible()
            ->whereIn('id', $resourceIds)
            ->with(['category', 'file', 'image'])
            ->get()
            ->mapWithKeys(fn (ResourceItem $resource): array => [(string) $resource->id => $resource->publicData()]);
        $serviceData = $service->publicData();
        $serviceData['featured_services'] = collect($serviceData['featured_services'] ?? [])
            ->map(function (array $feature) use ($featuredResourceMap): array {
                $feature['resources'] = collect($feature['resource_ids'] ?? [])
                    ->map(fn ($id) => $featuredResourceMap->get((string) $id))
                    ->filter()->values()->all();

                return $feature;
            })->values()->all();

        return Inertia::render('service', [
            'service' => $serviceData,
            'testimonials' => $testimonials,
            'relevantPosts' => $relevantPosts,
            'resources' => $resources,
        ]);
    }

    public function store(SaveServiceRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['status'] = (request()->user()?->canAdmin('services', 'publish') ?? false)
            && in_array($data['status'], ['Live', 'published'], true) ? 'published' : 'draft';
        if ($data['status'] === 'published') {
            $data['published_at'] = now();
        }
        if (array_key_exists('rich_content', $data)) {
            $data['rich_content'] = RichContentSanitizer::sanitize($data['rich_content']);
        }

        Service::create($data);

        return to_route('admin.services');
    }

    public function update(SaveServiceRequest $request, Service $service): RedirectResponse
    {
        $data = $request->validated();
        $data['status'] = (request()->user()?->canAdmin('services', 'publish') ?? false)
            && in_array($data['status'], ['Live', 'published'], true) ? 'published' : 'draft';
        if ($data['status'] === 'published' && ! $service->published_at) {
            $data['published_at'] = now();
        }
        if (array_key_exists('rich_content', $data)) {
            $data['rich_content'] = RichContentSanitizer::sanitize($data['rich_content']);
        }

        $service->update($data);

        return to_route('admin.services');
    }
}
