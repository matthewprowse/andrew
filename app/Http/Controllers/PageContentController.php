<?php

namespace App\Http\Controllers;

use App\Exceptions\PageRevisionConflictException;
use App\Http\Requests\SavePageContentRequest;
use App\Models\AuditLog;
use App\Models\Page;
use App\Models\PageRevision;
use App\Services\PagePublishingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PageContentController extends Controller
{
    // Home and About moved to the block-page system (see
    // App\Http\Controllers\PageController) and are no longer this
    // controller's slugs.
    public const SLUGS = ['contact', 'locations'];

    public function __construct(private readonly PagePublishingService $publishing) {}

    /**
     * PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B):
     * authenticated preview. Renders the exact same public template with
     * the current draft's content swapped in for the live row — reusing
     * renderHome()/renderAbout() below and each other controller's
     * equivalent render method rather than duplicating any template. Gated
     * by the same `pages,view` permission as the editor itself (see
     * routes/web.php); noindex is set on every one of these templates via
     * their `preview` prop → PageMeta's `noindex`, and this route is never
     * referenced by SitemapController, so it is not indexable and not
     * listed regardless of the auth gate.
     */
    public function preview(string $slug): Response
    {
        $page = $this->find($slug);
        $previewPage = $this->publishing->currentDraftOrLivePage($page);

        return match ($slug) {
            'contact' => app(ContactController::class)->render($previewPage, preview: true),
            'locations' => app(LocationsController::class)->render($previewPage, preview: true),
            // Unreachable given find()'s abort_unless() against self::SLUGS
            // above and the route's whereIn('slug', self::SLUGS) constraint
            // — required so this match is exhaustive over `string`.
            default => abort(404),
        };
    }

    public function admin(string $slug): Response
    {
        $page = $this->find($slug);

        return Inertia::render('admin/pages/legacy-edit', [
            'slug' => $slug,
            // PUB-01/02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B):
            // content, hasUnpublishedChanges, baseRevisionId, revisions,
            // previewUrl — see PagePublishingService::editorProps(), also
            // reused by LocationsController for its own embedded copy of
            // this same editor so both stay in sync.
            ...$this->publishing->editorProps($page, $slug),
        ]);
    }

    /**
     * PUB-01: an ordinary Save now creates a new draft revision instead of
     * writing straight to the live `pages` row — the live row (and every
     * public page reading it) is completely unaffected until an explicit
     * Publish. Returns JSON, not an Inertia redirect: PUB-02's conflict
     * response needs a structured body the editor can read without a full
     * page reload, and the frontend's fetch-based save (see
     * page-content-manager.tsx) never sends the X-Inertia header, so a
     * plain JSON response is exactly what Inertia's client expects to
     * *not* have to handle here.
     */
    public function update(SavePageContentRequest $request, string $slug): JsonResponse
    {
        $data = $request->validated();
        $page = $this->find($slug);
        $snapshot = $this->buildSnapshot($page, $slug, $data);
        $baseRevisionId = array_key_exists('base_revision_id', $data) && $data['base_revision_id'] !== null
            ? (int) $data['base_revision_id']
            : null;

        try {
            $revision = $this->publishing->saveDraft($page, $snapshot, $baseRevisionId, $request->user()?->id);
        } catch (PageRevisionConflictException $exception) {
            return $this->conflictResponse($page, $exception->current);
        }

        AuditLog::record('draft_saved', 'page', $page->id, ['slug' => $slug, 'revision_id' => $revision->id]);

        return response()->json([
            'conflict' => false,
            'baseRevisionId' => $revision->id,
            'hasUnpublishedChanges' => true,
            'content' => $this->publishing->applySnapshot($page, $revision->snapshot)->adminData(),
            'revisions' => $this->publishing->history($page)->map(fn (PageRevision $r) => $r->historyData())->values(),
        ]);
    }

    /**
     * PUB-01: the only action that ever changes the live `pages` row under
     * this mechanism. Copies the current draft's snapshot onto it and marks
     * that revision published, atomically (PagePublishingService::publish).
     */
    public function publish(Request $request, string $slug): JsonResponse
    {
        $page = $this->find($slug);
        $revision = $this->publishing->publish($page, $request->user()?->id);

        if (! $revision) {
            return response()->json(['message' => 'There is no draft to publish.'], 422);
        }

        AuditLog::record('published', 'page', $page->id, ['slug' => $slug, 'revision_id' => $revision->id]);

        return response()->json([
            'hasUnpublishedChanges' => false,
            'content' => $page->refresh()->adminData(),
            'revisions' => $this->publishing->history($page)->map(fn (PageRevision $r) => $r->historyData())->values(),
        ]);
    }

    /**
     * PUB-01: loads a past revision's snapshot as the new current draft.
     * Never touches the live row and never publishes anything — see
     * PagePublishingService::restoreAsDraft(). Restoring always inserts a
     * new revision rather than overwriting the row it supersedes, so the
     * revision being replaced-as-current stays in history and recoverable
     * too. The frontend is responsible for warning the editor before
     * calling this that it will replace whatever draft is currently pending
     * — the backend has no way to know about unsaved in-browser edits.
     */
    public function restoreAsDraft(Request $request, string $slug, PageRevision $revision): JsonResponse
    {
        $page = $this->find($slug);
        $restored = $this->publishing->restoreAsDraft($page, $revision->id, $request->user()?->id);
        abort_if($restored === null, 404);

        AuditLog::record('restored_as_draft', 'page', $page->id, ['slug' => $slug, 'source_revision_id' => $revision->id, 'revision_id' => $restored->id]);

        return response()->json([
            'baseRevisionId' => $restored->id,
            'hasUnpublishedChanges' => true,
            'content' => $this->publishing->applySnapshot($page, $restored->snapshot)->adminData(),
            'revisions' => $this->publishing->history($page)->map(fn (PageRevision $r) => $r->historyData())->values(),
        ]);
    }

    public function find(string $slug): Page
    {
        abort_unless(in_array($slug, self::SLUGS, true), 404);

        return Page::firstOrCreate(['slug' => $slug]);
    }

    /**
     * Every editable Page field, in the same snake_case shape stored on the
     * live row and in a page_revisions.snapshot — the single place both the
     * live-write path (pre-PUB-01) and the draft-write path (PUB-01) build
     * that shape, so they can never drift apart.
     *
     * CMS-01: each template's editor only displays the fields that template
     * actually consumes, so a save from one of those editors may omit
     * fields the model still has stored (e.g. Contact's editor never sends
     * intro_body). A field's existing value — read from the live row, which
     * is what a fresh draft always starts from — is preserved unless the
     * request actually supplies a new one for it; omission must never be
     * read as "clear this field".
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function buildSnapshot(Page $page, string $slug, array $data): array
    {
        $updates = [];
        foreach ([
            'hero_heading', 'hero_subheading', 'intro_heading', 'intro_body',
            'intro_image_media_id', 'meta_title', 'meta_description', 'og_image_media_id',
        ] as $field) {
            $updates[$field] = array_key_exists($field, $data) ? $data[$field] : $page->{$field};
        }

        $updates['sections'] = array_key_exists('sections', $data) ? $data['sections'] : ($page->sections ?? []);

        $updates['show_team_section'] = $slug === 'about'
            ? (array_key_exists('show_team_section', $data) ? (bool) $data['show_team_section'] : (bool) $page->show_team_section)
            : false;

        if ($slug === 'home') {
            $merged = $page->homeBlocksData();
            if (array_key_exists('home_blocks', $data) && is_array($data['home_blocks'])) {
                foreach ($data['home_blocks'] as $key => $value) {
                    if (isset($merged[$key]) && is_array($value)) {
                        $merged[$key] = [...$merged[$key], ...$value];
                    }
                }
            }
            $updates['home_blocks'] = $merged;
        }

        return $updates;
    }

    private function conflictResponse(Page $page, ?PageRevision $current): JsonResponse
    {
        return response()->json([
            'conflict' => true,
            'message' => 'This page was changed by someone else since you started editing. Review the differences below, then save again if you still want your changes.',
            'current' => $current ? [
                'revisionId' => $current->id,
                'status' => $current->status,
                'authorName' => $current->author->name ?? ($current->author_id ? 'Deleted user' : 'System'),
                'updatedAt' => $current->created_at?->toIso8601String(),
                'content' => $this->publishing->applySnapshot($page, $current->snapshot)->adminData(),
            ] : null,
        ], 409);
    }
}
