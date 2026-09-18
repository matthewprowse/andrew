import type { PageContentAdmin } from '@/types/page-content';

// PUB-01/PUB-02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B). Mirrors
// PageRevision::historyData() and PageContentController's JSON responses.

export type PageRevisionSummary = {
    id: number;
    status: 'draft' | 'published';
    authorName: string;
    createdAt: string;
};

export type PageDraftSaveResponse = {
    conflict: false;
    baseRevisionId: number;
    hasUnpublishedChanges: true;
    content: PageContentAdmin;
    revisions: PageRevisionSummary[];
};

export type PageDraftConflictResponse = {
    conflict: true;
    message: string;
    current: {
        revisionId: number;
        status: 'draft' | 'published';
        authorName: string;
        updatedAt: string;
        content: PageContentAdmin;
    } | null;
};

export type PagePublishResponse = {
    hasUnpublishedChanges: false;
    content: PageContentAdmin;
    revisions: PageRevisionSummary[];
};

export type PageRestoreResponse = {
    baseRevisionId: number;
    hasUnpublishedChanges: true;
    content: PageContentAdmin;
    revisions: PageRevisionSummary[];
};

// Mirrors PagePublishingService::editorProps() — everything
// PageContentManager needs, bundled together so every admin page that
// embeds it (the standalone Pages editor, Company's About/Careers tabs,
// Locations' Page Copy tab) passes it through the same shape.
export type PageEditorProps = {
    content: PageContentAdmin;
    hasUnpublishedChanges: boolean;
    baseRevisionId: number | null;
    revisions: PageRevisionSummary[];
    previewUrl: string;
};
