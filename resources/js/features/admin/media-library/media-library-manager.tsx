import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    createColumnHelper,
    createSortedRowModel,
    rowSortingFeature,
    sortFn_alphanumeric,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminTableToolbar } from '@/components/admin/admin-table-toolbar';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import Heading from '@/components/heading';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatAdminDate } from '@/lib/format-admin-date';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';

export type MediaUsage = {
    confirmed: string[];
    unconfirmed: string[];
};

export type MediaItem = {
    id: string;
    fileName: string;
    altText: string;
    url: string;
    mimeType: string;
    size: number;
    kind: 'image' | 'document';
    uploadedAt: string;
    usage: MediaUsage;
};

type TypeFilter = 'all' | 'image' | 'document';

const columnLabels: Record<string, string> = {
    fileName: 'File name',
    kind: 'Type',
    size: 'Size',
    uploadedAt: 'Date uploaded',
};

const PAGE_DESCRIPTION =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

const mediaTableFeatures = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
});

const mediaColumnHelper = createColumnHelper<
    typeof mediaTableFeatures,
    MediaItem
>();
function mediaColumns() {
    return mediaColumnHelper.columns([
        mediaColumnHelper.accessor('fileName', {
            header: 'File name',
            cell: (info) => {
                const item = info.row.original;

                return (
                    <div className="flex min-w-0 items-center gap-3">
                        {item.kind === 'image' ? (
                            <img
                                src={item.url}
                                alt=""
                                className="size-10 rounded-md object-cover"
                            />
                        ) : (
                            <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md text-[10px]">
                                FILE
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate font-medium">
                                {item.fileName}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                                {item.altText || '—'}
                            </p>
                        </div>
                    </div>
                );
            },
        }),
        mediaColumnHelper.accessor('kind', {
            header: 'Type',
            cell: (info) => (
                <Badge variant="outline" className="capitalize">
                    {info.getValue()}
                </Badge>
            ),
        }),
        mediaColumnHelper.accessor('size', {
            header: 'Size',
            cell: (info) => formatSize(info.getValue()),
        }),
        mediaColumnHelper.accessor('uploadedAt', {
            header: 'Date uploaded',
            cell: (info) => formatAdminDate(info.getValue()),
        }),
    ]);
}

function formatSize(size: number) {
    return `${Math.round(size / 1024)} KB`;
}

export function MediaLibraryManager({
    media,
    hasMorePages,
}: {
    media: MediaItem[];
    hasMorePages: boolean;
}) {
    const [items, setItems] = useState(media);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(hasMorePages);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [type, setType] = useState<TypeFilter>('all');
    const [searching, setSearching] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

    const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [altText, setAltText] = useState('');
    const [fileName, setFileName] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const table = useTable({
        features: mediaTableFeatures,
        columns: mediaColumns(),
        data: items,
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort() && columnLabels[column.id]);

    // Real server-side search + pagination (MED-02) — the Media workspace
    // previously received a single fixed page of 24 items and only ever
    // filtered that in-memory client-side, so records beyond the first page
    // were never reachable. MediaController::index() already paginated
    // server-side; this now actually consumes that instead of ignoring it.
    useEffect(() => {
        setSearching(true);
        const timeout = setTimeout(async () => {
            const params = new URLSearchParams({ page: '1' });
            if (search) params.set('search', search);
            if (type !== 'all') params.set('type', type);

            const response = await fetch(`/admin/media?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            const json = await response.json();
            setItems(json.data);
            setHasMore(json.nextPage !== null);
            setPage(1);
            setSearching(false);
        }, 300);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, type]);

    async function loadMore() {
        setLoadingMore(true);
        const params = new URLSearchParams({ page: String(page + 1) });
        if (search) params.set('search', search);
        if (type !== 'all') params.set('type', type);

        const response = await fetch(`/admin/media?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        const json = await response.json();
        setItems((current) => [...current, ...json.data]);
        setHasMore(json.nextPage !== null);
        setPage((current) => current + 1);
        setLoadingMore(false);
    }

    function openUpload() {
        setErrors({});
        setFile(null);
        setFileName('');
        setAltText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploadOpen(true);
    }

    function openEdit(item: MediaItem) {
        setErrors({});
        setFileName(item.fileName);
        setAltText(item.altText);
        setSelectedItem(null);
        setIsEditOpen(true);
    }

    function handleUpload() {
        if (!file) return;
        setProcessing(true);
        setErrors({});
        router.post(
            '/admin/media',
            { file, file_name: fileName, alt_text: altText },
            {
                forceFormData: true,
                onSuccess: () => {
                    setIsUploadOpen(false);
                    setSearch('');
                    setType('all');
                },
                onError: (validationErrors: Record<string, string>) =>
                    setErrors(validationErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function handleEditSave() {
        if (!selectedItem) return;
        setProcessing(true);
        setErrors({});
        router.patch(
            `/admin/media/${selectedItem.id}`,
            { file_name: fileName, alt_text: altText },
            {
                onSuccess: () => setIsEditOpen(false),
                onError: (validationErrors: Record<string, string>) =>
                    setErrors(validationErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function handleDelete(item: MediaItem) {
        router.delete(`/admin/media/${item.id}`, {
            onSuccess: () => setSelectedItem(null),
            onError: (validationErrors: Record<string, string>) =>
                setErrors(validationErrors),
        });
    }

    return (
        <AdminWorkspaceLayout
            title="Media Library"
            description={PAGE_DESCRIPTION}
            headerAction={
                <AdminTableToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchClassName="h-8 w-72"
                    sortColumns={sortableColumns}
                    sortLabels={columnLabels}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                >
                    <Select
                        value={type}
                        onValueChange={(value) => setType(value as TypeFilter)}
                    >
                        <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="image">Images</SelectItem>
                            <SelectItem value="document">Documents</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={openUpload}
                    >
                        New Media
                    </Button>
                </AdminTableToolbar>
            }
        >
            <Heading
                title="Media Library"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            {table.getRowModel().rows.length === 0 && !searching ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {items.length === 0 && !search
                        ? 'No media yet. Upload a file to get started.'
                        : 'No media matches your filters.'}
                </p>
            ) : viewMode === 'table' ? (
                <DataTable
                    table={table}
                    onRowClick={setSelectedItem}
                    showHeader={false}
                />
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {table.getRowModel().rows.map(({ original: item }) => (
                        <Card
                            key={item.id}
                            size="sm"
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer gap-2 p-2"
                            onClick={() => setSelectedItem(item)}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    setSelectedItem(item);
                                }
                            }}
                        >
                            <div className="bg-muted overflow-hidden rounded-lg">
                                {item.kind === 'image' ? (
                                    <img
                                        src={item.url}
                                        alt={item.altText}
                                        className="aspect-video w-full rounded-md object-cover"
                                    />
                                ) : (
                                    <div className="text-muted-foreground flex aspect-video items-center justify-center rounded-md text-xs">
                                        FILE
                                    </div>
                                )}
                            </div>
                            <div className="p-2">
                                <div className="flex items-start justify-between gap-3">
                                    <CardTitle className="truncate">
                                        {item.fileName}
                                    </CardTitle>
                                    <Badge
                                        variant="outline"
                                        className="shrink-0 capitalize"
                                    >
                                        {item.kind}
                                    </Badge>
                                </div>
                                <CardDescription className="mt-1 truncate">
                                    {item.altText || '—'}
                                </CardDescription>
                                <div className="text-muted-foreground mt-3 flex items-center justify-between gap-2 text-xs">
                                    <span>{formatSize(item.size)}</span>
                                    <span>
                                        {formatAdminDate(item.uploadedAt)}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loadingMore}
                        onClick={loadMore}
                    >
                        {loadingMore ? 'Loading…' : 'Load More'}
                    </Button>
                </div>
            )}

            <Dialog
                open={selectedItem !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedItem(null);
                        setErrors({});
                    }
                }}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader title={selectedItem?.fileName} />
                    {selectedItem && (
                        <div className="grid gap-4">
                            <dl className="grid grid-cols-2 gap-2 text-sm">
                                <dt className="text-muted-foreground">
                                    Alt Text
                                </dt>
                                <dd>{selectedItem.altText || '—'}</dd>
                                <dt className="text-muted-foreground">Type</dt>
                                <dd>{selectedItem.mimeType}</dd>
                                <dt className="text-muted-foreground">Size</dt>
                                <dd>
                                    {Math.round(selectedItem.size / 1024)} KB
                                </dd>
                                <dt className="text-muted-foreground">
                                    Uploaded
                                </dt>
                                <dd>{selectedItem.uploadedAt}</dd>
                            </dl>
                            <div className="grid gap-1 text-sm">
                                <p className="text-muted-foreground">Usage</p>
                                {selectedItem.usage.confirmed.length === 0 &&
                                selectedItem.usage.unconfirmed.length === 0 ? (
                                    <p>Not currently referenced anywhere.</p>
                                ) : (
                                    <ul className="list-disc pl-4">
                                        {selectedItem.usage.confirmed.map(
                                            (label) => (
                                                <li key={label}>{label}</li>
                                            ),
                                        )}
                                        {selectedItem.usage.unconfirmed.map(
                                            (label) => (
                                                <li
                                                    key={label}
                                                    className="text-amber-600 dark:text-amber-500"
                                                >
                                                    {label}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            </div>
                            {errors.media && (
                                <p
                                    role="alert"
                                    className="text-destructive text-sm"
                                >
                                    {errors.media}
                                </p>
                            )}
                        </div>
                    )}
                    <AdminDialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() =>
                                selectedItem && handleDelete(selectedItem)
                            }
                        >
                            Delete
                        </Button>
                        <Button
                            onClick={() =>
                                selectedItem && openEdit(selectedItem)
                            }
                        >
                            Edit
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title="New Media"
                        closeDisabled={processing}
                    />
                    <div className="grid gap-4">
                        {Object.keys(errors).length > 0 && (
                            <div
                                role="alert"
                                className="text-destructive text-sm"
                            >
                                {Object.entries(errors).map(
                                    ([field, message]) => (
                                        <p key={field}>{message}</p>
                                    ),
                                )}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="field-file">File</Label>
                            <Input
                                ref={fileInputRef}
                                id="field-file"
                                type="file"
                                accept="application/pdf,image/png,image/jpeg,image/webp"
                                onChange={(event) => {
                                    const selectedFile =
                                        event.target.files?.[0] ?? null;
                                    setFile(selectedFile);
                                    setFileName(selectedFile?.name ?? '');
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="field-upload-file-name">
                                File Name
                            </Label>
                            <Input
                                id="field-upload-file-name"
                                value={fileName}
                                disabled={!file}
                                onChange={(event) =>
                                    setFileName(event.target.value)
                                }
                            />
                            <p className="text-muted-foreground text-xs">
                                This is the saved file name used throughout the
                                library. It defaults to the uploaded file name.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="field-alt-text">
                                Alt Text (Images)
                            </Label>
                            <Input
                                id="field-alt-text"
                                value={altText}
                                onChange={(event) =>
                                    setAltText(event.target.value)
                                }
                            />
                        </div>
                    </div>
                    <AdminDialogFooter>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            disabled={!file || !fileName.trim() || processing}
                            onClick={handleUpload}
                        >
                            {processing ? 'Creating…' : 'Create Media'}
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title="Edit Media"
                        closeDisabled={processing}
                    />
                    <div className="grid gap-4">
                        {Object.keys(errors).length > 0 && (
                            <div
                                role="alert"
                                className="text-destructive text-sm"
                            >
                                {Object.entries(errors).map(
                                    ([field, message]) => (
                                        <p key={field}>{message}</p>
                                    ),
                                )}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="field-edit-file-name">
                                File Name
                            </Label>
                            <Input
                                id="field-edit-file-name"
                                value={fileName}
                                onChange={(event) =>
                                    setFileName(event.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="field-edit-alt-text">
                                Alt Text
                            </Label>
                            <Input
                                id="field-edit-alt-text"
                                value={altText}
                                onChange={(event) =>
                                    setAltText(event.target.value)
                                }
                            />
                        </div>
                    </div>
                    <AdminDialogFooter>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button disabled={processing} onClick={handleEditSave}>
                            {processing ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}
