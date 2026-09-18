import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink } from 'lucide-react';
import {
    columnFilteringFeature,
    createColumnHelper,
    createFilteredRowModel,
    createSortedRowModel,
    filterFn_includesString,
    globalFilteringFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import type {
    ContentLibraryItem,
    ContentLibraryResourceCategory,
    ContentLibraryServiceOption,
} from '@/types/content-library';

// LIB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4): the real unified
// listing that replaces the Phase 2 navigation-only hub. `items` already
// arrives normalized and type-tagged from App\Support\ContentLibrary — this
// component is purely a filterable read view over it plus routing into each
// row's OWN existing editor. It never posts anything itself; there is no
// save path here at all (see LIB-02's "facade normalizes for display, not
// for a single edit form").

const ALL = 'all';
const NO_SERVICE = 'none';

const columnLabels: Record<string, string> = {
    title: 'Title',
    type: 'Type',
    category: 'Category / Topic',
    serviceName: 'Service',
    status: 'Status',
    accessMode: 'Access',
    updatedAt: 'Updated',
};

const features = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    globalFilteringFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: { includesString: filterFn_includesString },
});

function formatDate(iso: string) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

const helper = createColumnHelper<typeof features, ContentLibraryItem>();
const columns = helper.columns([
    helper.accessor('title', { header: 'Title' }),
    helper.accessor('type', {
        header: 'Type',
        cell: (info) => (
            <Badge variant="outline">
                {info.getValue() === 'article' ? 'Article' : 'Resource'}
            </Badge>
        ),
    }),
    helper.accessor('category', {
        header: 'Category / Topic',
        cell: (info) => info.getValue() || '—',
    }),
    helper.accessor('serviceName', {
        header: 'Service',
        cell: (info) => info.getValue() || '—',
    }),
    helper.accessor('status', {
        header: 'Status',
        cell: (info) => (
            <Badge variant={info.getValue() === 'Live' ? 'secondary' : 'ghost'}>
                {info.getValue()}
            </Badge>
        ),
    }),
    helper.accessor('accessMode', {
        header: 'Access',
        cell: (info) =>
            ({ public: 'Public', gated: 'Gated', paid: 'Paid' })[
                info.getValue()
            ],
    }),
    helper.accessor('updatedAt', {
        header: 'Updated',
        cell: (info) => formatDate(info.getValue()),
    }),
    helper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
            const item = info.row.original;
            return (
                <div className="flex items-center gap-3">
                    {item.editHref && (
                        <a
                            href={`${item.editHref}?edit=${item.editId}`}
                            className="text-sm underline-offset-4 hover:underline"
                        >
                            Edit
                        </a>
                    )}
                    {item.publicUrl && (
                        <a
                            href={item.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                        >
                            View <ExternalLink className="size-3.5" />
                        </a>
                    )}
                </div>
            );
        },
    }),
]);

function FilterSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-44" aria-label={label}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CategoryFilterSelect({
    value,
    onChange,
    articleCategories,
    resourceCategories,
}: {
    value: string;
    onChange: (value: string) => void;
    articleCategories: string[];
    resourceCategories: ContentLibraryResourceCategory[];
}) {
    const topics = resourceCategories.filter((c) => c.kind === 'topic');
    const formats = resourceCategories.filter((c) => c.kind === 'format');

    // LIB-04/LIB-07: topics and formats are grouped separately so the
    // format-vs-topic distinction is visible in the filter itself, and each
    // resource category's option reports whether it currently has zero
    // published items — a read-only fact, not a reason to omit it here.
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-56" aria-label="Category / Topic">
                <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {articleCategories.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>Article categories</SelectLabel>
                        {articleCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                                {category}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}
                {topics.length > 0 && (
                    <>
                        <SelectSeparator />
                        <SelectGroup>
                            <SelectLabel>Resource topics</SelectLabel>
                            {topics.map((category) => (
                                <SelectItem
                                    key={category.slug}
                                    value={category.slug}
                                >
                                    {category.title}
                                    {category.isEmpty ? ' (empty)' : ''}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </>
                )}
                {formats.length > 0 && (
                    <>
                        <SelectSeparator />
                        <SelectGroup>
                            <SelectLabel>Resource formats</SelectLabel>
                            {formats.map((category) => (
                                <SelectItem
                                    key={category.slug}
                                    value={category.slug}
                                >
                                    {category.title}
                                    {category.isEmpty ? ' (empty)' : ''}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </>
                )}
            </SelectContent>
        </Select>
    );
}

export function ContentLibraryManager({
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
    const [typeFilter, setTypeFilter] = useState(ALL);
    const [categoryFilter, setCategoryFilter] = useState(ALL);
    const [serviceFilter, setServiceFilter] = useState(ALL);
    const [statusFilter, setStatusFilter] = useState(ALL);

    const filtered = useMemo(
        () =>
            items.filter((item) => {
                if (typeFilter !== ALL && item.type !== typeFilter)
                    return false;
                if (
                    categoryFilter !== ALL &&
                    item.categoryKey !== categoryFilter
                )
                    return false;
                if (statusFilter !== ALL && item.status !== statusFilter)
                    return false;
                if (serviceFilter === NO_SERVICE && item.serviceId)
                    return false;
                if (
                    serviceFilter !== ALL &&
                    serviceFilter !== NO_SERVICE &&
                    item.serviceId !== serviceFilter
                )
                    return false;
                return true;
            }),
        [items, typeFilter, categoryFilter, serviceFilter, statusFilter],
    );

    const table = useTable({
        features,
        columns,
        data: filtered,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort() && columnLabels[column.id]);

    const hasAnyAccess = canViewBlog || canViewResources;

    return (
        <AdminWorkspaceLayout
            title="Content Library"
            headerAction={
                hasAnyAccess ? (
                    <>
                        <Input
                            placeholder="Search"
                            value={table.state.globalFilter ?? ''}
                            onChange={(event) =>
                                table.setGlobalFilter(event.target.value)
                            }
                            className="h-8 w-96"
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="secondary">Sort</Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="end"
                                sideOffset={8}
                                className="w-56"
                            >
                                {sortableColumns.map((column) => {
                                    const sorted = column.getIsSorted();
                                    return (
                                        <button
                                            key={column.id}
                                            onClick={column.getToggleSortingHandler()}
                                            className="hover:bg-accent hover:text-accent-foreground relative flex w-full items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-left text-sm select-none"
                                        >
                                            {columnLabels[column.id] ??
                                                column.id}
                                            <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                                                {sorted === 'asc' && (
                                                    <ArrowUp className="size-3.5" />
                                                )}
                                                {sorted === 'desc' && (
                                                    <ArrowDown className="size-3.5" />
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </PopoverContent>
                        </Popover>
                    </>
                ) : undefined
            }
        >
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Content Library
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Every article and resource in one place. Edit opens each
                        row&apos;s own editor — articles save through Insights,
                        resources save through their category&apos;s Resources
                        editor.
                    </p>
                </div>

                {!hasAnyAccess && (
                    <p className="text-muted-foreground text-sm">
                        No content sections are available for your role.
                    </p>
                )}

                {hasAnyAccess && (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <FilterSelect
                                label="Type"
                                value={typeFilter}
                                onChange={setTypeFilter}
                                options={[
                                    { value: ALL, label: 'All types' },
                                    ...(canViewBlog
                                        ? [
                                              {
                                                  value: 'article',
                                                  label: 'Article',
                                              },
                                          ]
                                        : []),
                                    ...(canViewResources
                                        ? [
                                              {
                                                  value: 'resource',
                                                  label: 'Resource',
                                              },
                                          ]
                                        : []),
                                ]}
                            />
                            <CategoryFilterSelect
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                                articleCategories={
                                    canViewBlog ? articleCategories : []
                                }
                                resourceCategories={
                                    canViewResources ? resourceCategories : []
                                }
                            />
                            <FilterSelect
                                label="Service"
                                value={serviceFilter}
                                onChange={setServiceFilter}
                                options={[
                                    { value: ALL, label: 'All services' },
                                    {
                                        value: NO_SERVICE,
                                        label: 'No service',
                                    },
                                    ...services.map((service) => ({
                                        value: service.id,
                                        label: service.name,
                                    })),
                                ]}
                            />
                            <FilterSelect
                                label="Status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { value: ALL, label: 'All statuses' },
                                    { value: 'Draft', label: 'Draft' },
                                    {
                                        value: 'Live',
                                        label: 'Live',
                                    },
                                ]}
                            />
                        </div>

                        <DataTable table={table} />
                    </>
                )}
            </div>
        </AdminWorkspaceLayout>
    );
}
