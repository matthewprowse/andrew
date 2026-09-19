<?php

namespace App\Services;

use App\Exceptions\PageRevisionConflictException;
use App\Models\AuditLog;
use App\Models\Page;
use App\Models\PageRevision;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * Coordinates the HTTP-facing part of the page publishing workflow.
 *
 * PagePublishingService owns revision persistence and snapshot handling. This
 * service owns the response and audit-log contract shared by block and legacy
 * page controllers. Snapshot construction and page lookup intentionally stay
 * in those controllers because the two content models are different.
 */
class PagePublishingWorkflow
{
    public function __construct(private readonly PagePublishingService $publishing) {}

    /**
     * @param array<string, mixed> $snapshot
     */
    public function saveDraft(
        Page $page,
        string $slug,
        array $snapshot,
        ?int $baseRevisionId,
        ?int $authorId,
    ): JsonResponse {
        try {
            $revision = $this->publishing->saveDraft($page, $snapshot, $baseRevisionId, $authorId);
        } catch (PageRevisionConflictException $exception) {
            return $this->conflictResponse($page, $exception->current);
        }

        AuditLog::record('draft_saved', 'page', $page->id, ['slug' => $slug, 'revision_id' => $revision->id]);

        return response()->json([
            'conflict' => false,
            'baseRevisionId' => $revision->id,
            'hasUnpublishedChanges' => true,
            'content' => $this->publishing->applySnapshot($page, $revision->snapshot)->adminData(),
            'revisions' => $this->historyData($page),
        ]);
    }

    public function publish(Page $page, string $slug, ?int $authorId): JsonResponse
    {
        $revision = $this->publishing->publish($page, $authorId);

        if (! $revision) {
            return response()->json(['message' => 'There is no draft to publish.'], 422);
        }

        AuditLog::record('published', 'page', $page->id, ['slug' => $slug, 'revision_id' => $revision->id]);

        return response()->json([
            'hasUnpublishedChanges' => false,
            'content' => $page->refresh()->adminData(),
            'revisions' => $this->historyData($page),
        ]);
    }

    public function restoreAsDraft(Page $page, string $slug, PageRevision $revision, ?int $authorId): JsonResponse
    {
        $restored = $this->publishing->restoreAsDraft($page, $revision->id, $authorId);
        abort_if($restored === null, 404);

        AuditLog::record('restored_as_draft', 'page', $page->id, [
            'slug' => $slug,
            'source_revision_id' => $revision->id,
            'revision_id' => $restored->id,
        ]);

        return response()->json([
            'baseRevisionId' => $restored->id,
            'hasUnpublishedChanges' => true,
            'content' => $this->publishing->applySnapshot($page, $restored->snapshot)->adminData(),
            'revisions' => $this->historyData($page),
        ]);
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

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function historyData(Page $page): Collection
    {
        return $this->publishing->history($page)
            ->map(fn (PageRevision $revision) => $revision->historyData())
            ->values();
    }
}
