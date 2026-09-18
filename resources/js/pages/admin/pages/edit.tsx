import { BlockPageEditor } from '@/features/admin/pages/block-page-editor';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import type { BlockCatalogueEntry } from '@/types/blocks';
import type { BlockPageContentAdmin } from '@/types/block-page';
import type { PageRevisionSummary } from '@/types/page-revision';

export default function PageEdit({
    slug,
    isSystem,
    content,
    blockCatalogue,
    hasUnpublishedChanges,
    baseRevisionId,
    revisions,
    previewUrl,
}: {
    slug: string;
    isSystem: boolean;
    content: BlockPageContentAdmin;
    blockCatalogue: BlockCatalogueEntry[];
    hasUnpublishedChanges: boolean;
    baseRevisionId: number | null;
    revisions: PageRevisionSummary[];
    previewUrl: string;
}) {
    return (
        <AdminWorkspaceLayout title={content.title || slug}>
            <BlockPageEditor
                key={slug}
                slug={slug}
                isSystem={isSystem}
                content={content}
                blockCatalogue={blockCatalogue}
                hasUnpublishedChanges={hasUnpublishedChanges}
                baseRevisionId={baseRevisionId}
                revisions={revisions}
                previewUrl={previewUrl}
            />
        </AdminWorkspaceLayout>
    );
}
