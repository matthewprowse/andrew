<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class ResourceCategory extends Model
{
    public const FORMAT_SLUGS = ['brochures', 'webinars', 'books'];

    protected $fillable = ['slug', 'title', 'layout', 'kind'];

    /** @return HasMany<ResourceItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(ResourceItem::class);
    }

    /**
     * LIB-04 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4): topic vs format
     * (brochures/webinars/books). Purely an
     * admin-facing classification — never consulted for the public
     * `/resources/{category}` route or ResourceAccessController's signed
     * links, both of which still key off `slug` alone.
     */
    public function isTopic(): bool
    {
        return $this->kind === 'topic';
    }

    /**
     * LIB-07 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4): a category with
     * zero published items shouldn't be promoted from places where that
     * would be a dead end (homepage promotion cards), while remaining
     * directly reachable at its existing URL and never auto-redirected.
     */
    public function hasPublishedItems(): bool
    {
        return $this->items()->where('status', 'published')->exists();
    }

    /**
     * Slugs of every category with zero published items — the read-only
     * fact LIB-07 asks to be surfaced (rather than hiding categories
     * outright) so admins can see which URLs are currently dead ends and so
     * homepage/landing promotion can quietly skip them. Small, fixed table
     * (four rows today), so a plain per-row exists() check is clearer than a
     * having()-based aggregate query here.
     *
     * @return Collection<int, string>
     */
    public static function emptySlugs(): Collection
    {
        return static::query()->get()
            ->reject(fn (self $category) => $category->hasPublishedItems())
            ->pluck('slug')
            ->values();
    }
}
