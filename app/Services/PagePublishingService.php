<?php

namespace App\Services;

use App\Exceptions\PageRevisionConflictException;
use App\Models\Page;
use App\Models\PageRevision;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * PUB-01/PUB-02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): the
 * whole draft/publish/restore/concurrency mechanism for `Page` lives here,
 * not scattered across the controller, so it stays realistically
 * extensible to other content types later without having been extended to
 * them in this batch (see the batch's scope decision — Page only).
 *
 * Model: every ordinary draft save INSERTs a brand-new `page_revisions` row
 * (status='draft') rather than updating one in place. That makes a row's
 * own auto-increment id a reliable, collision-free version marker for the
 * optimistic-concurrency check, and keeps every state fully recoverable —
 * nothing is ever destroyed, only superseded. Publish does not insert a new
 * row: it copies the current draft's snapshot onto the live `pages` row and
 * flips that same draft row's status to 'published', atomically.
 */
class PagePublishingService
{
    /**
     * The most recent revision row for this page, draft or published, or
     * null if the page has never had a revision (i.e. it has only ever
     * existed as the plain live row). This is the version marker PUB-02
     * compares an editor's `baseRevisionId` against.
     */
    public function latestRevision(Page $page): ?PageRevision
    {
        return PageRevision::query()->where('page_id', $page->id)->orderByDesc('id')->first();
    }

    /**
     * The revision an editor should currently be looking at: the latest
     * draft if unpublished changes are pending, otherwise null (meaning the
     * editor should fall back to the live row's own published content).
     */
    public function currentDraft(Page $page): ?PageRevision
    {
        $latest = $this->latestRevision($page);

        return $latest?->status === 'draft' ? $latest : null;
    }

    /**
     * Ordered most-recent-first, for the admin revision-history list.
     *
     * @return Collection<int, PageRevision>
     */
    public function history(Page $page, int $limit = 30): Collection
    {
        return PageRevision::query()->where('page_id', $page->id)->with('author')
            ->orderByDesc('id')->limit($limit)->get();
    }

    /**
     * Create a new draft revision from `$snapshot`, unless `$baseRevisionId`
     * (the revision id the editor started from) no longer matches the
     * page's actual latest revision — in which case someone else changed it
     * first and this throws instead of overwriting anything.
     * `$baseRevisionId` must be null when the editor started from a page
     * that had no revisions at all yet.
     *
     * @param  array<string, mixed>  $snapshot
     *
     * @throws PageRevisionConflictException
     */
    public function saveDraft(Page $page, array $snapshot, ?int $baseRevisionId, ?int $authorId): PageRevision
    {
        $latest = $this->latestRevision($page);

        if ($baseRevisionId !== $latest?->id) {
            throw new PageRevisionConflictException($latest);
        }

        return PageRevision::create([
            'page_id' => $page->id,
            'status' => 'draft',
            'snapshot' => $snapshot,
            'author_id' => $authorId,
        ]);
    }

    /**
     * Copy the current draft's snapshot onto the live `pages` row and mark
     * that revision published — the only way the live row changes under
     * this mechanism. Returns null if there is no pending draft to publish
     * (nothing has been saved since the last publish, or ever).
     */
    public function publish(Page $page, ?int $authorId): ?PageRevision
    {
        $draft = $this->currentDraft($page);
        if (! $draft) {
            return null;
        }

        DB::transaction(function () use ($page, $draft) {
            $page->update($draft->snapshot);
            $draft->update(['status' => 'published']);
        });

        return $draft->refresh();
    }

    /**
     * Load a past revision's snapshot (any status, this page only) as a
     * brand-new current draft — it does not touch the live row and does not
     * publish anything. Always inserts a new row, so restoring never
     * destroys the revision it replaces as "current" — it remains in
     * history. Returns null if the source revision doesn't belong to this
     * page (a slug/revision mismatch).
     */
    public function restoreAsDraft(Page $page, int $sourceRevisionId, ?int $authorId): ?PageRevision
    {
        $source = PageRevision::query()->where('page_id', $page->id)->find($sourceRevisionId);
        if (! $source) {
            return null;
        }

        return PageRevision::create([
            'page_id' => $page->id,
            'status' => 'draft',
            'snapshot' => $source->snapshot,
            'author_id' => $authorId,
        ]);
    }

    /**
     * An unsaved, in-memory Page with `$snapshot` applied over a clone of
     * the live row — never persisted. Used to rehydrate a stored snapshot
     * back into a real Page instance so callers can reuse Page::adminData()/
     * publicData() (introImage/ogImage relations included) instead of
     * duplicating either method's field list. The clone's relation cache is
     * explicitly cleared first so a stale eager-loaded introImage/ogImage
     * already on `$page` can never leak into the rehydrated result.
     *
     * @param  array<string, mixed>  $snapshot
     */
    public function applySnapshot(Page $page, array $snapshot): Page
    {
        $draftPage = clone $page;
        $draftPage->unsetRelations();
        $draftPage->forceFill($snapshot);

        return $draftPage;
    }

    /**
     * The Page instance every template/renderer should read from: the live
     * row, unless a draft is pending, in which case an unsaved Page with the
     * draft's snapshot applied — so public preview rendering and the admin
     * editor's "resume where I left off" both read through the same
     * mechanism instead of duplicating the draft-or-live choice.
     */
    public function currentDraftOrLivePage(Page $page): Page
    {
        $draft = $this->currentDraft($page);

        return $draft ? $this->applySnapshot($page, $draft->snapshot) : $page;
    }

    /**
     * Every prop `PageContentManager` (the shared React editor) needs to
     * drive PUB-01/02's draft/publish/history UI, in one place — reused by
     * PageContentController::admin() and by every other admin page that
     * embeds this same editor for a Page slug (AdminCompanyController's
     * About/Careers tabs, LocationsController's Page Copy tab), so none of
     * them can drift out of sync with what the component actually expects.
     *
     * @return array{content: array<string, mixed>, hasUnpublishedChanges: bool, baseRevisionId: int|null, revisions: Collection<int, array<string, mixed>>, previewUrl: string}
     */
    public function editorProps(Page $page, string $slug): array
    {
        $draft = $this->currentDraft($page);

        return [
            'content' => $draft ? $this->applySnapshot($page, $draft->snapshot)->adminData() : $page->adminData(),
            'hasUnpublishedChanges' => $draft !== null,
            'baseRevisionId' => $this->latestRevision($page)?->id,
            'revisions' => $this->history($page)->map(fn (PageRevision $revision) => $revision->historyData())->values(),
            'previewUrl' => route('admin.pages.preview', $slug),
        ];
    }
}
