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
            'services' => $this->adminServices(),
            'resourceOptions' => ResourceItem::query()->where('status', 'published')->with('category')->orderBy('title')->orderBy('id')->get()
                ->map(fn (ResourceItem $resource) => $resource->adminData()),
        ]);
    }

    public function test(): Response
    {
        return Inertia::render('admin/test', [
            'services' => $this->adminServices(),
        ]);
    }

    private function adminServices(): \Illuminate\Support\Collection
    {
        return Service::query()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (Service $service) => $service->adminData());
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

        /** @var list<array{resource_ids?: list<int|string>}> $featuredServices */
        $featuredServices = $service->featured_services ?? [];
        $resourceIds = collect($featuredServices)
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
            ->reject(fn (array $resource): bool => in_array((int) $resource['id'], $resourceIds->all(), true))
            ->values();

        $featuredResourceMap = ResourceItem::publiclyVisible()
            ->whereIn('id', $resourceIds)
            ->with(['category', 'file', 'image'])
            ->get()
            ->mapWithKeys(fn (ResourceItem $resource): array => [(string) $resource->id => $resource->publicData()]);
        $serviceData = $service->publicData();
        /** @var list<array<string, mixed>> $serviceFeatures */
        $serviceFeatures = $serviceData['featured_services'] ?? [];
        $serviceData['featured_services'] = array_map(function (array $feature) use ($featuredResourceMap): array {
            /** @var list<int|string> $featureResourceIds */
            $featureResourceIds = is_array($feature['resource_ids'] ?? null) ? $feature['resource_ids'] : [];
            $feature['resources'] = array_values(array_filter(array_map(
                fn (int|string $id): mixed => $featuredResourceMap->get((string) $id),
                $featureResourceIds,
            ), static fn (mixed $resource): bool => is_array($resource)));

            return $feature;
        }, $serviceFeatures);

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
