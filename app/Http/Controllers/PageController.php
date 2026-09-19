<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreatePageRequest;
use App\Http\Requests\RenamePageRequest;
use App\Http\Requests\SavePageBlocksRequest;
use App\Models\AuditLog;
use App\Models\Page;
use App\Models\PageRevision;
use App\Models\Service;
use App\Services\PagePublishingService;
use App\Services\PagePublishingWorkflow;
use App\Support\Blocks\BlockRegistry;
use App\Support\ReservedSlugs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Block pages: Home, plus every page created from the admin Pages list.
 * Legacy fixed-field pages (About, Contact, Locations) stay on
 * PageContentController. Both share the same draft/publish/revision
 * mechanism (PagePublishingService), which is agnostic to a page's content
 * shape.
 */
class PageController extends Controller
{
    public function __construct(
        private readonly PagePublishingService $publishing,
        private readonly PagePublishingWorkflow $publishingWorkflow,
        private readonly BlockRegistry $blocks,
    ) {}

    public function home(): Response
    {
        return $this->render($this->find('home'), preview: false);
    }

    public function about(): Response
    {
        return $this->render($this->find('about'), preview: false);
    }

    /**
     * Public catch-all for every other block page. A slug with no published
     * block page falls through to a 301 for a still-indexed pre-move
     * service URL, then a plain 404 — never a silent guess.
     */
    public function show(string $slug): Response|RedirectResponse
    {
        $page = $this->findBlockPage($slug);

        if ($page) {
            abort_unless($this->isPublished($page), 404);

            return $this->render($page, preview: false);
        }

        if (Service::where('slug', $slug)->where('status', 'published')->exists()) {
            return redirect("/services/{$slug}", 301);
        }

        abort(404);
    }

    public function preview(string $slug): Response
    {
        $page = $this->find($slug);
        $previewPage = $this->publishing->currentDraftOrLivePage($page);

        return $this->render($previewPage, preview: true);
    }

    public function adminIndex(): Response
    {
        return Inertia::render('admin/pages/index', [
            'pages' => Page::query()->where('kind', Page::KIND_BLOCK)
                ->orderByDesc('is_system')->orderBy('title')
                ->get()->map(fn (Page $page) => [
                    'slug' => $page->slug,
                    'title' => $page->title ?: $page->slug,
                    'isSystem' => $page->is_system,
                    'published' => $this->isPublished($page),
                    'updatedAt' => $page->updated_at?->format('Y-m-d') ?? '',
                ])->values(),
            'blockCatalogue' => $this->blocks->catalogue(),
        ]);
    }

    public function store(CreatePageRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $page = Page::create([
            'slug' => $data['slug'], 'title' => $data['title'],
            'kind' => Page::KIND_BLOCK, 'is_system' => false, 'blocks' => [],
        ]);
        AuditLog::record('created', 'page', $page->id, ['slug' => $page->slug]);

        return to_route('admin.pages.show', $page->slug);
    }

    /**
     * One-click "+ New page" from the sidebar — skips the title/slug
     * dialog and creates an "Untitled Page" (Untitled Page 2, 3, …)
     * straight into the editor, where both are the first thing to rename.
     */
    public function quickCreate(): RedirectResponse
    {
        abort_unless(request()->user()?->canAdmin('pages', 'create'), 403);

        [$title, $slug] = ReservedSlugs::nextUntitled();
        $page = Page::create(['slug' => $slug, 'title' => $title, 'kind' => Page::KIND_BLOCK, 'is_system' => false, 'blocks' => []]);
        AuditLog::record('created', 'page', $page->id, ['slug' => $page->slug]);

        return to_route('admin.pages.show', $page->slug);
    }

    /**
     * Renames a page's URL. Applied immediately (unlike title/blocks/meta,
     * which only take effect on Publish) — a slug is the page's address,
     * not draft content, so there's nothing to preview or stage.
     */
    public function rename(RenamePageRequest $request, string $slug): RedirectResponse
    {
        $page = $this->find($slug);
        abort_if($page->is_system, 403, "Home's URL can't be changed.");

        $newSlug = $request->validated('slug');
        $page->update(['slug' => $newSlug]);
        AuditLog::record('renamed', 'page', $page->id, ['from' => $slug, 'to' => $newSlug]);

        return to_route('admin.pages.show', $newSlug);
    }

    public function edit(string $slug): Response
    {
        $page = $this->find($slug);

        return Inertia::render('admin/pages/edit', [
            'slug' => $slug,
            'isSystem' => $page->is_system,
            ...$this->publishing->editorProps($page, $slug),
            'blockCatalogue' => $this->blocks->catalogue(),
            'previewUrl' => route('admin.blocks.preview', $slug),
        ]);
    }

    public function update(SavePageBlocksRequest $request, string $slug): JsonResponse
    {
        $data = $request->validated();
        $page = $this->find($slug);

        $snapshot = [
            'title' => $data['title'],
            'blocks' => $data['blocks'] ?? [],
            'meta_title' => $data['meta_title'] ?? $page->meta_title,
            'meta_description' => $data['meta_description'] ?? $page->meta_description,
            'og_image_media_id' => array_key_exists('og_image_media_id', $data) ? $data['og_image_media_id'] : $page->og_image_media_id,
        ];
        $baseRevisionId = array_key_exists('base_revision_id', $data) && $data['base_revision_id'] !== null
            ? (int) $data['base_revision_id'] : null;

        return $this->publishingWorkflow->saveDraft($page, $slug, $snapshot, $baseRevisionId, $request->user()?->id);
    }

    public function publish(Request $request, string $slug): JsonResponse
    {
        $page = $this->find($slug);
        return $this->publishingWorkflow->publish($page, $slug, $request->user()?->id);
    }

    public function restoreAsDraft(Request $request, string $slug, PageRevision $revision): JsonResponse
    {
        $page = $this->find($slug);
        return $this->publishingWorkflow->restoreAsDraft($page, $slug, $revision, $request->user()?->id);
    }

    public function destroy(string $slug): RedirectResponse
    {
        $page = $this->find($slug);
        abort_if($page->is_system, 403, 'The Home page cannot be deleted.');

        AuditLog::record('deleted', 'page', $page->id, ['slug' => $slug]);
        $page->delete();

        return to_route('admin.pages');
    }

    private function find(string $slug): Page
    {
        return $this->findBlockPage($slug) ?? abort(404);
    }

    private function findBlockPage(string $slug): ?Page
    {
        return Page::query()->where('slug', $slug)->where('kind', Page::KIND_BLOCK)->first();
    }

    /**
     * A block page counts as published once it has ever been published —
     * unlike the legacy Page rows, a fresh block page has no content at all
     * until an editor publishes it, so `firstOrCreate`-on-request (the old
     * behaviour) would make every new page publicly visible and empty.
     */
    private function isPublished(Page $page): bool
    {
        return PageRevision::query()->where('page_id', $page->id)->where('status', 'published')->exists();
    }

    private function render(Page $page, bool $preview): Response
    {
        $data = $page->publicData();

        return Inertia::render('page', [
            'slug' => $page->slug,
            'title' => $data['title'],
            'metaTitle' => $data['metaTitle'],
            'metaDescription' => $data['metaDescription'],
            'ogImageUrl' => $data['ogImageUrl'],
            'blocks' => $this->blocks->resolveForPublic($data['blocks']),
            'preview' => $preview,
        ]);
    }

}
