<?php

namespace App\Support;

use App\Models\BlogPost;
use App\Models\ResourceItem;
use Illuminate\Support\Collection;

/**
 * Read-model facade over the two existing, separately-owned content tables
 * (BlogPost, ResourceItem) for the unified admin listing at /admin/content
 * (LIB-01, docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4).
 *
 * Deliberately NOT a new table, a new authoritative store, or a new write
 * path: this class only ever reads. Editing still goes through each type's
 * own existing validated route (BlogController@update /
 * ResourceController@update) — see AdminContentController and
 * resources/js/features/admin/content/content-library-manager.tsx, which
 * route an edit action back to the owning type's existing manager page/
 * dialog rather than posting anywhere new.
 *
 * Typed ids ("article:12" / "resource:7") are the collision-proofing
 * mechanism the plan calls for: BlogPost and ResourceItem each auto-increment
 * their own id sequence, so a bare numeric id could collide between the two
 * tables. Prefixing by type makes every id returned by list() — and every id
 * this class will accept back via parseId() — unambiguous regardless of
 * numeric overlap. See tests/Feature/ContentLibraryTest.php for a same-number
 * collision fixture proving this.
 */
class ContentLibrary
{
    /**
     * @return Collection<int, array<string, mixed>>
     */
    public static function list(bool $includeArticles = true, bool $includeResources = true): Collection
    {
        $articles = $includeArticles ? static::articles() : collect();
        $resources = $includeResources ? static::resources() : collect();

        return $articles->concat($resources)
            ->sortByDesc(fn (array $row) => $row['updatedAt'])
            ->values();
    }

    /** @return Collection<int, array<string, mixed>> */
    protected static function articles(): Collection
    {
        return BlogPost::query()->with('services')->get()
            ->map(fn (BlogPost $post): array => static::articleRow($post));
    }

    /** @return array<string, mixed> */
    protected static function articleRow(BlogPost $post): array
    {
        // Articles dropped their free-text category in favor of a many-to-many
        // service link (LIB-03 follow-up); 'category'/'categoryKey' stay null
        // for articles so this unified row shape doesn't have to invent a
        // single category out of what can now be zero, one, or many services.
        $primaryService = $post->services->first();

        return [
            'id' => 'article:'.$post->id,
            'type' => 'article',
            'title' => $post->title,
            'category' => null,
            'categoryKey' => null,
            'resourceCategoryKind' => null,
            'serviceId' => $primaryService ? (string) $primaryService->id : null,
            'serviceName' => $primaryService?->name,
            'serviceIds' => $post->services->pluck('id')->map(fn ($id) => (string) $id)->all(),
            'serviceNames' => $post->services->pluck('name')->all(),
            // Articles are never gated (only ResourceItem has an
            // email-verification flow) — see the plan's LIB-01 wording.
            'accessMode' => 'public',
            'status' => $post->status === 'published' ? 'Live' : 'Draft',
            'updatedAt' => optional($post->updated_at)->toIso8601String() ?? '',
            'publicUrl' => '/blog/'.$post->slug,
            'editHref' => '/admin/blog',
            'editId' => (string) $post->id,
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    protected static function resources(): Collection
    {
        return ResourceItem::query()->with(['category', 'services'])->get()
            ->map(fn (ResourceItem $item): array => static::resourceRow($item));
    }

    /** @return array<string, mixed> */
    protected static function resourceRow(ResourceItem $item): array
    {
        $category = $item->category;
        $services = $item->services;
        $primaryService = $services->first();

        return [
            'id' => 'resource:'.$item->id,
            'type' => 'resource',
            'title' => $item->title,
            'category' => $category?->title,
            'categoryKey' => $category?->slug,
            'resourceCategoryKind' => $category?->kind,
            'serviceId' => $primaryService ? (string) $primaryService->id : ($item->service_id ? (string) $item->service_id : null),
            'serviceName' => $primaryService?->name,
            'serviceIds' => $services->pluck('id')->map(fn ($id) => (string) $id)->all(),
            'serviceNames' => $services->pluck('name')->all(),
            'accessMode' => match ($item->access_type) {
                ResourceItem::ACCESS_PAID => 'paid',
                ResourceItem::ACCESS_EMAIL => 'gated',
                default => 'public',
            },
            'status' => $item->status === 'published' ? 'Live' : 'Draft',
            'updatedAt' => optional($item->updated_at)->toIso8601String() ?? '',
            // Resources have no item-specific public page — they're
            // reached via their category listing (ResourceController@show)
            // and downloaded/redirected from there. The category page is
            // the correct "canonical public URL" per the plan: a link
            // into the existing route, not a new URL scheme.
            'publicUrl' => $category ? '/resources/'.$category->slug : null,
            'editHref' => $category ? '/admin/resources/'.$category->slug : null,
            'editId' => (string) $item->id,
        ];
    }

    /**
     * Splits a typed id such as "article:12" back into its type and numeric
     * id. Not currently called from a route (edit actions link straight to
     * the owning type's existing admin page — see class docblock), but kept
     * as the documented, testable inverse of the id scheme above rather than
     * leaving the format as an implicit convention.
     *
     * @return array{type: string, id: int}|null null for anything that isn't
     *                                           a well-formed typed id, so callers can 404/ignore rather than crash.
     */
    public static function parseId(string $typedId): ?array
    {
        if (! preg_match('/^(article|resource):(\d+)$/', $typedId, $matches)) {
            return null;
        }

        return ['type' => $matches[1], 'id' => (int) $matches[2]];
    }
}
