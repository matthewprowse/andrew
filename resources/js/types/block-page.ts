import type { PageBlock } from '@/types/blocks';
import type { PageRevisionSummary } from '@/types/page-revision';

export type BlockPageContentAdmin = {
    title: string;
    blocks: PageBlock[];
    metaTitle: string;
    metaDescription: string;
    ogImage: { id: string; url: string; fileName: string } | null;
};

export type BlockPageDraftSaveResponse = {
    conflict: false;
    baseRevisionId: number;
    hasUnpublishedChanges: true;
    content: BlockPageContentAdmin;
    revisions: PageRevisionSummary[];
};

export type BlockPageDraftConflictResponse = {
    conflict: true;
    message: string;
    current: {
        revisionId: number;
        status: 'draft' | 'published';
        authorName: string;
        updatedAt: string;
        content: BlockPageContentAdmin;
    } | null;
};

export type BlockPagePublishResponse = {
    hasUnpublishedChanges: false;
    content: BlockPageContentAdmin;
    revisions: PageRevisionSummary[];
};

export type BlockPageRestoreResponse = {
    baseRevisionId: number;
    hasUnpublishedChanges: true;
    content: BlockPageContentAdmin;
    revisions: PageRevisionSummary[];
};
