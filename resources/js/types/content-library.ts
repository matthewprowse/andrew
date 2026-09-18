// Normalized shape produced by App\Support\ContentLibrary (LIB-01,
// docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4). Mirrors that class's
// ContentLibrary::articles()/resources() output field-for-field — keep both
// in sync if either changes.

export type ContentLibraryType = 'article' | 'resource';
export type ContentLibraryStatus = 'Draft' | 'Live';
export type ContentLibraryAccessMode = 'public' | 'gated' | 'paid';
export type ResourceCategoryKind = 'topic' | 'format';

export type ContentLibraryItem = {
    /** Typed id, e.g. "article:12" / "resource:7" — collision-proof across the two source tables. */
    id: string;
    type: ContentLibraryType;
    title: string;
    category: string | null;
    /** Filter-safe value: the raw BlogPost category string, or the ResourceCategory slug. */
    categoryKey: string | null;
    resourceCategoryKind: ResourceCategoryKind | null;
    serviceId: string | null;
    serviceIds: string[];
    serviceName: string | null;
    serviceNames: string[];
    status: ContentLibraryStatus;
    accessMode: ContentLibraryAccessMode;
    /** ISO 8601 */
    updatedAt: string;
    /** Existing public route this row is reachable at — null only if the owning resource category was deleted out from under it. */
    publicUrl: string | null;
    /** Existing admin page whose own edit dialog owns this row's form — null under the same condition as publicUrl. */
    editHref: string | null;
    editId: string;
};

export type ContentLibraryServiceOption = { id: string; name: string };

export type ContentLibraryResourceCategory = {
    slug: string;
    title: string;
    kind: ResourceCategoryKind;
    isEmpty: boolean;
};
