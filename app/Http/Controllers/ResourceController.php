<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveResourceItemRequest;
use App\Models\AuditLog;
use App\Models\Media;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\Service;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ResourceController extends Controller
{
    public function landing(): Response
    {
        return Inertia::render('resource', [
            'slug' => 'resources',
            'categories' => ResourceCategory::query()->orderBy('id')->get()->map(fn (ResourceCategory $category) => [
                'title' => $category->title,
                'href' => '/resources/'.$category->slug,
                'itemCount' => $category->items()->where('status', 'published')->count(),
            ]),
        ]);
    }

    public function show(string $category): Response
    {
        $resourceCategory = ResourceCategory::where('slug', $category)->firstOrFail();

        return $this->render($resourceCategory);
    }

    private function render(ResourceCategory $resourceCategory): Response
    {
        return Inertia::render('resource', [
            'slug' => $resourceCategory->slug,
            'layout' => $resourceCategory->layout,
            'items' => ResourceItem::publiclyVisible()
                ->where('resource_category_id', $resourceCategory->id)
                ->with(['category', 'file', 'image'])
                ->orderBy('sort_order')->orderByDesc('id')->get()
                ->map(fn (ResourceItem $item) => $item->publicData()),
        ]);
    }

    public function admin(string $category): Response
    {
        $resourceCategory = ResourceCategory::where('slug', $category)->firstOrFail();

        return Inertia::render('admin/resources/index', [
            'category' => $category,
            'layout' => $resourceCategory->layout,
            'items' => $resourceCategory->items()
                ->with(['services', 'file', 'image'])
                ->orderBy('sort_order')->orderByDesc('id')->get()
                ->map(fn (ResourceItem $item) => $item->adminData()),
            // LIB-03: read-only service list for the association dropdown —
            // same precedent as TestimonialController@index. Never written
            // back to; only the resource item's own service_id changes.
            'services' => Service::query()->orderBy('sort_order')->orderBy('id')->get(['id', 'name'])->map(fn (Service $service) => ['id' => (string) $service->id, 'name' => $service->name]),
        ]);
    }

    public function store(SaveResourceItemRequest $request, string $category): RedirectResponse
    {
        $resourceCategory = ResourceCategory::where('slug', $category)->firstOrFail();

        [$fields, $serviceIds] = $this->fields($request);
        $item = ResourceItem::create([
            ...$fields,
            'resource_category_id' => $resourceCategory->id,
        ]);
        $item->services()->sync($serviceIds);
        $this->syncFileVisibility($item);
        AuditLog::record('created', 'resource_item', $item->id, ['title' => $item->title, 'category' => $category, 'status' => $item->status]);

        return to_route('admin.resources.index', $category);
    }

    public function update(SaveResourceItemRequest $request, string $category, ResourceItem $item): RedirectResponse
    {
        $resourceCategory = ResourceCategory::where('slug', $category)->firstOrFail();
        abort_unless($item->resource_category_id === $resourceCategory->id, 404);

        [$fields, $serviceIds] = $this->fields($request, $item);
        $previousFileId = $item->file_media_id;
        $item->update($fields);
        $item->services()->sync($serviceIds);
        $this->syncFileVisibility($item, $previousFileId);
        AuditLog::record('updated', 'resource_item', $item->id, ['title' => $item->title, 'category' => $category, 'status' => $item->status]);

        return to_route('admin.resources.index', $category);
    }

    public function updateLayout(Request $request, string $category): RedirectResponse
    {
        $data = $request->validate(['layout' => ['required', Rule::in(['list', 'cards'])]]);

        ResourceCategory::where('slug', $category)->firstOrFail()->update(['layout' => $data['layout']]);

        return to_route('admin.resources.index', $category);
    }

    /**
     * Paid resources keep their file on the private disk; anything else
     * keeps it public. Also re-checks a file this item just stopped using.
     */
    private function syncFileVisibility(ResourceItem $item, ?int $previousFileId = null): void
    {
        $item->refresh()->file?->syncVisibility();

        if ($previousFileId !== null && $previousFileId !== $item->file_media_id) {
            Media::find($previousFileId)?->syncVisibility();
        }
    }

    /** @return array{0: array<string, mixed>, 1: list<int>} */
    private function fields(SaveResourceItemRequest $request, ?ResourceItem $item = null): array
    {
        $data = $request->validated();
        $publishedAt = $item ? $item->published_at : null;
        $accessType = $data['access_type'] ?? ($item->access_type ?? ResourceItem::ACCESS_OPEN);
        $serviceIds = array_values(array_unique(array_map(
            'intval',
            $data['service_ids'] ?? (filled($data['service_id'] ?? null) ? [$data['service_id']] : []),
        )));

        $published = (request()->user()?->canAdmin('resources', 'publish') ?? false)
            && $data['status'] === 'published';

        return [[
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'action_label' => $data['action_label'] ?? null,
            'file_media_id' => $data['file_media_id'] ?? null,
            'image_media_id' => $data['image_media_id'] ?? null,
            'external_url' => $data['external_url'] ?? null,
            'access_type' => $accessType,
            'price_cents' => $accessType === ResourceItem::ACCESS_PAID ? Money::toCents((string) $data['price']) : null,
            'status' => $published ? 'published' : 'draft',
            'sort_order' => $data['sort_order'],
            'published_at' => $published ? ($publishedAt ?? now()) : $publishedAt,
            'service_id' => $serviceIds[0] ?? null,
        ], $serviceIds];
    }
}
