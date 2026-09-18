import { ContentLibraryManager } from '@/features/admin/content/content-library-manager';
import type {
    ContentLibraryItem,
    ContentLibraryResourceCategory,
    ContentLibraryServiceOption,
} from '@/types/content-library';

export default function AdminContentIndex({
    items,
    services,
    articleCategories,
    resourceCategories,
    canViewBlog,
    canViewResources,
}: {
    items: ContentLibraryItem[];
    services: ContentLibraryServiceOption[];
    articleCategories: string[];
    resourceCategories: ContentLibraryResourceCategory[];
    canViewBlog: boolean;
    canViewResources: boolean;
}) {
    return (
        <ContentLibraryManager
            items={items}
            services={services}
            articleCategories={articleCategories}
            resourceCategories={resourceCategories}
            canViewBlog={canViewBlog}
            canViewResources={canViewResources}
        />
    );
}
