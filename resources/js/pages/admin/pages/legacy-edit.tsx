import { PageContentManager } from '@/features/admin/pages/page-content-manager';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import type { PageContentAdmin } from '@/types/page-content';
import type { PageRevisionSummary } from '@/types/page-revision';

// The fixed-field editor for Contact and Locations — the two remaining
// pages that never moved to the block system (see App\Http\Controllers\
// PageContentController). Not used for Home or About any more; those are
// admin/pages/edit.tsx (the block editor) instead.
export default function LegacyPageEdit({
    slug,
    content,
    hasUnpublishedChanges,
    baseRevisionId,
    revisions,
    previewUrl,
}: {
    slug: string;
    content: PageContentAdmin;
    hasUnpublishedChanges: boolean;
    baseRevisionId: number | null;
    revisions: PageRevisionSummary[];
    previewUrl: string;
}) {
    return (
        <AdminWorkspaceLayout
            title={slug.charAt(0).toUpperCase() + slug.slice(1)}
        >
            <PageContentManager
                key={slug}
                slug={slug}
                content={content}
                hasUnpublishedChanges={hasUnpublishedChanges}
                baseRevisionId={baseRevisionId}
                revisions={revisions}
                previewUrl={previewUrl}
            />
        </AdminWorkspaceLayout>
    );
}
