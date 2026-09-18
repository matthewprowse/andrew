<?php

namespace App\Exceptions;

use App\Models\PageRevision;
use RuntimeException;

/**
 * PUB-02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): thrown by
 * PagePublishingService::saveDraft() when the editor's `baseRevisionId` no
 * longer matches the page's actual latest revision — someone else saved (or
 * published) a change first. Carries that actual current revision
 * (nullable — a page can legitimately have zero revisions) so the catching
 * controller can report what changed without a second query, and so no
 * side's data is silently discarded: the caller never applies `$snapshot`
 * when this is thrown.
 */
class PageRevisionConflictException extends RuntimeException
{
    public function __construct(public readonly ?PageRevision $current)
    {
        parent::__construct('The page was changed by someone else since this edit started.');
    }
}
