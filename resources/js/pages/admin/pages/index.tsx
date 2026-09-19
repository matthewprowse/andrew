import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    createColumnHelper,
    createSortedRowModel,
    rowSortingFeature,
    sortFn_alphanumeric,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminTableToolbar } from '@/components/admin/admin-table-toolbar';
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';
import type { BlockCatalogueEntry } from '@/types/blocks';

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

type PageRow = {
    slug: string;
    title: string;
    isSystem: boolean;
    published: boolean;
    updatedAt: string;
};

const pageColumnLabels: Record<string, string> = {
    title: 'Name',
    slug: 'Public URL',
    published: 'Status',
    updatedAt: 'Date',
};
const pageTableFeatures = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
});
const pageColumnHelper = createColumnHelper<
    typeof pageTableFeatures,
    PageRow
>();
const pageColumns = pageColumnHelper.columns([
    pageColumnHelper.accessor('title', {
        header: 'Name',
        cell: (info) => <span>{info.getValue()}</span>,
    }),
    pageColumnHelper.accessor('slug', {
        header: 'Public URL',
        cell: (info) => (
            <span className="text-muted-foreground font-mono text-xs">
                {info.getValue() === 'home' ? '/' : `/${info.getValue()}`}
            </span>
        ),
    }),
    pageColumnHelper.accessor('published', {
        header: 'Status',
        cell: (info) => (
            <Badge variant={info.getValue() ? 'secondary' : 'ghost'}>
                {info.getValue() ? 'Live' : 'Draft'}
            </Badge>
        ),
    }),
    pageColumnHelper.accessor('updatedAt', {
        header: 'Date',
        cell: (info) => formatDate(info.getValue()),
    }),
]);

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

export default function PagesIndex({
    pages,
}: {
    pages: PageRow[];
    blockCatalogue: BlockCatalogueEntry[];
}) {
    const [open, setOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [search, setSearch] = useState('');
    const form = useForm({ title: '', slug: '' });
    const filteredPages = pages.filter((page) => {
        const query = search.trim().toLowerCase();
        return (
            !query ||
            page.title.toLowerCase().includes(query) ||
            page.slug.toLowerCase().includes(query)
        );
    });
    const pageTable = useTable({
        features: pageTableFeatures,
        columns: pageColumns,
        data: filteredPages,
    });
    const sortableColumns = pageTable
        .getAllColumns()
        .filter((column) => column.getCanSort() && pageColumnLabels[column.id]);
    const edit = (page: PageRow) => router.visit(`/admin/blocks/${page.slug}`);
    function submit() {
        form.post('/admin/pages', {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        });
    }

    return (
        <AdminWorkspaceLayout
            title="Pages"
            description={PAGE_DESCRIPTION}
            headerAction={
                <AdminTableToolbar
                    search={search}
                    onSearchChange={setSearch}
                    sortColumns={sortableColumns}
                    sortLabels={pageColumnLabels}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                >
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setOpen(true)}
                    >
                        New Page
                    </Button>
                </AdminTableToolbar>
            }
        >
            <Heading
                title="Pages"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            {pageTable.getRowModel().rows.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {pages.length === 0
                        ? 'No pages yet. Add one to get started.'
                        : 'No pages match your search.'}
                </p>
            ) : viewMode === 'table' ? (
                <DataTable
                    table={pageTable}
                    onRowClick={edit}
                    showHeader={false}
                />
            ) : (
                <div className="grid gap-3 lg:grid-cols-4">
                    {pageTable.getRowModel().rows.map(({ original: page }) => (
                        <Card
                            key={page.slug}
                            size="sm"
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer"
                            onClick={() => edit(page)}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    edit(page);
                                }
                            }}
                        >
                            <CardHeader>
                                <CardTitle>{page.title}</CardTitle>
                                <CardDescription className="font-mono text-xs">
                                    {page.slug === 'home'
                                        ? '/'
                                        : `/${page.slug}`}
                                </CardDescription>
                                <CardAction>
                                    <Badge
                                        variant={
                                            page.published
                                                ? 'secondary'
                                                : 'ghost'
                                        }
                                    >
                                        {page.published ? 'Live' : 'Draft'}
                                    </Badge>
                                </CardAction>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
            <Dialog
                open={open}
                onOpenChange={(value) => !form.processing && setOpen(value)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title="New Page"
                        closeDisabled={form.processing}
                    />
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submit();
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="new-page-title">Page Title</Label>
                            <Input
                                id="new-page-title"
                                value={form.data.title}
                                onChange={(event) =>
                                    form.setData('title', event.target.value)
                                }
                                required
                            />
                            {form.errors.title && (
                                <p className="text-destructive text-sm">
                                    {form.errors.title}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-page-slug">URL</Label>
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">/</span>
                                <Input
                                    id="new-page-slug"
                                    value={form.data.slug}
                                    placeholder="relocation-guide"
                                    onChange={(event) =>
                                        form.setData('slug', event.target.value)
                                    }
                                    required
                                />
                            </div>
                            {form.errors.slug && (
                                <p className="text-destructive text-sm">
                                    {form.errors.slug}
                                </p>
                            )}
                        </div>
                        <AdminDialogFooter>
                            <DialogClose asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={form.processing}
                                >
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={form.processing}
                            >
                                {form.processing ? 'Creating…' : 'Create Page'}
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}
