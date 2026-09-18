<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PUB-01/PUB-02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): one
 * immutable snapshot of a Page's editable fields at a point in time. Rows
 * are never updated in place — see App\Services\PagePublishingService for
 * the create/publish/restore mechanics — so a row's own `id` is a reliable
 * version marker for optimistic-concurrency comparisons.
 *
 * @property int $id
 * @property int $page_id
 * @property string $status
 * @property array<string, mixed> $snapshot
 * @property int|null $author_id
 */
class PageRevision extends Model
{
    protected $fillable = ['page_id', 'status', 'snapshot', 'author_id'];

    protected function casts(): array
    {
        return ['snapshot' => 'array'];
    }

    /** @return BelongsTo<Page, $this> */
    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * Shape consumed by the admin revision-history list: who, when,
     * draft/published — with enough to drive a restore-as-draft action per
     * entry. Never exposes the raw snapshot in the list (the editor only
     * needs that when it actually restores or hits a concurrency conflict).
     *
     * @return array<string, mixed>
     */
    public function historyData(): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'authorName' => $this->author->name ?? ($this->author_id ? 'Deleted user' : 'System'),
            'createdAt' => $this->created_at?->toIso8601String() ?? '',
        ];
    }
}
