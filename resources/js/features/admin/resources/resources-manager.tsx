import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';
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
import { Button } from '@/components/ui/button';
import { AdminDetail as Detail } from '@/components/admin/admin-detail';
import { AdminField as Field } from '@/components/admin/admin-field';
import { AdminTableToolbar } from '@/components/admin/admin-table-toolbar';
import { useAdminMutation } from '@/hooks/use-admin-mutation';
import { Badge } from '@/components/ui/badge';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import Heading from '@/components/heading';
import { RelatedServicesField } from '@/components/admin/related-services-field';
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { AssetPicker } from '@/components/admin/asset-picker';
import { MediaPicker } from '@/components/admin/media-picker';
import {
    resourceAccessLabels,
    type ResourceAccessType,
    type ResourceItemAdminRecord,
    type ResourceLayout,
    type ResourceMediaRef,
} from '@/types/resource';
import { formatAdminDate } from '@/lib/format-admin-date';

type ServiceOption = { id: string; name: string };
const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

type Draft = {
    title: string;
    description: string;
    actionLabel: string;
    externalUrl: string;
    status: 'draft' | 'published';
    sortOrder: number;
    file: ResourceMediaRef;
    image: ResourceMediaRef;
    accessType: ResourceAccessType;
    price: string;
    serviceIds: string[];
};

const emptyDraft: Draft = {
    title: '',
    description: '',
    actionLabel: '',
    externalUrl: '',
    status: 'draft',
    sortOrder: 0,
    file: null,
    image: null,
    accessType: 'open',
    price: '',
    serviceIds: [],
};

const columnLabels: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    status: 'Status',
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

const helper = createColumnHelper<typeof features, ResourceItemAdminRecord>();
const columns = helper.columns([
    helper.accessor('title', { header: 'Title' }),
    helper.accessor('description', {
        header: 'Description',
        cell: (info) => (
            <span className="line-clamp-1 max-w-md truncate whitespace-normal">
                {info.getValue() || '—'}
            </span>
        ),
    }),
    helper.accessor('status', {
        header: 'Status',
        cell: (info) => (
            <Badge
                variant={info.getValue() === 'Live' ? 'secondary' : 'outline'}
            >
                {info.getValue()}
            </Badge>
        ),
    }),
    helper.accessor('updatedAt', {
        header: 'Date',
        cell: (info) => formatAdminDate(info.getValue()),
    }),
]);

export function ResourcesManager({
    category,
    layout,
    items,
    services = [],
}: {
    category: string;
    layout: ResourceLayout;
    items: ResourceItemAdminRecord[];
    services?: ServiceOption[];
}) {
    const {
        processing,
        errors,
        clearErrors,
        run: runMutation,
    } = useAdminMutation();
    const [selectedItem, setSelectedItem] =
        useState<ResourceItemAdminRecord | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft>(emptyDraft);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

    const table = useTable({
        features,
        columns,
        data: items,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    function openCreate() {
        clearErrors();
        setEditingId(null);
        setDraft(emptyDraft);
        setIsFormOpen(true);
    }

    function openEdit(item: ResourceItemAdminRecord) {
        clearErrors();
        setEditingId(item.id);
        setDraft({
            title: item.title,
            description: item.description,
            actionLabel: item.actionLabel,
            externalUrl: item.externalUrl,
            status: item.status === 'Live' ? 'published' : 'draft',
            sortOrder: item.sortOrder,
            file: item.file,
            image: item.image,
            accessType: item.accessType,
            price: item.price,
            serviceIds:
                item.serviceIds ?? (item.serviceId ? [item.serviceId] : []),
        });
        setSelectedItem(null);
        setIsFormOpen(true);
    }

    // Lets the unified Content Library listing (LIB-01,
    // docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4) deep-link straight into this
    // page's own existing edit dialog via
    // /admin/resources/{category}?edit={id}, instead of duplicating this
    // form on a second page. Reads the query param directly rather than
    // threading it through the controller, so ResourceController and its
    // route stay untouched.
    useEffect(() => {
        const editId = new URLSearchParams(window.location.search).get('edit');
        if (!editId) return;
        const item = items.find((candidate) => candidate.id === editId);
        if (item) openEdit(item);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function handleSave() {
        const payload = {
            title: draft.title,
            description: draft.description,
            action_label: draft.actionLabel,
            external_url: draft.externalUrl,
            status: draft.status,
            sort_order: draft.sortOrder,
            file_media_id: draft.file?.id ?? '',
            image_media_id: draft.image?.id ?? '',
            access_type: draft.accessType,
            price: draft.accessType === 'paid' ? draft.price : '',
            service_ids: draft.serviceIds,
            service_id: draft.serviceIds[0] ?? '',
        };

        runMutation(
            (options) =>
                editingId
                    ? router.patch(
                          `/admin/resources/${category}/${editingId}`,
                          payload,
                          options,
                      )
                    : router.post(
                          `/admin/resources/${category}`,
                          payload,
                          options,
                      ),
            { onSuccess: () => setIsFormOpen(false) },
        );
    }

    return (
        <AdminWorkspaceLayout
            title="Resources"
            headerAction={
                <AdminTableToolbar
                    search={table.state.globalFilter ?? ''}
                    onSearchChange={(value) => table.setGlobalFilter(value)}
                    sortColumns={sortableColumns}
                    sortLabels={columnLabels}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                >
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={openCreate}
                    >
                        New Item
                    </Button>
                </AdminTableToolbar>
            }
        >
            <Heading
                title="Resources"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            {table.getRowModel().rows.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {items.length === 0
                        ? 'No resources yet. Add one to get started.'
                        : 'No resources match your search.'}
                </p>
            ) : viewMode === 'table' ? (
                <DataTable
                    table={table}
                    onRowClick={setSelectedItem}
                    showHeader={false}
                />
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {table.getRowModel().rows.map(({ original: item }) => (
                        <Card
                            key={item.id}
                            size="sm"
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer"
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
                            <CardHeader>
                                <CardTitle>{item.title}</CardTitle>
                                <CardDescription className="col-span-full row-start-2 line-clamp-2">
                                    {item.description || 'No description'}
                                </CardDescription>
                                <CardAction className="row-span-1 row-start-1">
                                    <Badge
                                        variant={
                                            item.status === 'Live'
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                    >
                                        {item.status}
                                    </Badge>
                                </CardAction>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog
                open={selectedItem !== null}
                onOpenChange={(open) => !open && setSelectedItem(null)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader title={selectedItem?.title} />
                    {selectedItem && (
                        <div className="grid gap-4 text-sm">
                            <dl className="grid grid-cols-2 gap-2">
                                <dt className="text-muted-foreground">
                                    Status
                                </dt>
                                <dd>{selectedItem.status}</dd>
                                <dt className="text-muted-foreground">
                                    Action label
                                </dt>
                                <dd>{selectedItem.actionLabel || '—'}</dd>
                                <dt className="text-muted-foreground">File</dt>
                                <dd>{selectedItem.file?.fileName || '—'}</dd>
                                <dt className="text-muted-foreground">
                                    External link
                                </dt>
                                <dd className="truncate">
                                    {selectedItem.externalUrl || '—'}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Access
                                </dt>
                                <dd>
                                    {resourceAccessLabels[
                                        selectedItem.accessType
                                    ] ?? '—'}
                                    {selectedItem.accessType === 'paid' &&
                                        selectedItem.formattedPrice &&
                                        ` · ${selectedItem.formattedPrice}`}
                                </dd>
                            </dl>
                            <Detail
                                label="Description"
                                value={selectedItem.description}
                            />
                        </div>
                    )}
                    <AdminDialogFooter>
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

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={editingId ? 'Edit Item' : 'New Item'}
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
                        <Field label="Title" htmlFor="resource-title">
                            <Input
                                id="resource-title"
                                value={draft.title}
                                onChange={(event) =>
                                    updateDraft('title', event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Description"
                            htmlFor="resource-description"
                        >
                            <Textarea
                                id="resource-description"
                                className="field-sizing-fixed"
                                value={draft.description}
                                onChange={(event) =>
                                    updateDraft(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field
                            label="Action Label"
                            htmlFor="resource-action-label"
                        >
                            <Input
                                id="resource-action-label"
                                placeholder="e.g. Download PDF, Watch Webinar"
                                value={draft.actionLabel}
                                onChange={(event) =>
                                    updateDraft(
                                        'actionLabel',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <AssetPicker
                            label="File (PDF)"
                            accept="document"
                            value={draft.file}
                            onChange={(value) => updateDraft('file', value)}
                        />
                        <Field
                            label="External Link"
                            htmlFor="resource-external-url"
                        >
                            <Input
                                id="resource-external-url"
                                type="url"
                                placeholder="https://…"
                                value={draft.externalUrl}
                                onChange={(event) =>
                                    updateDraft(
                                        'externalUrl',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        {layout === 'cards' && (
                            <MediaPicker
                                label="Cover Image"
                                accept="image"
                                value={draft.image}
                                onChange={(value) =>
                                    updateDraft('image', value)
                                }
                            />
                        )}
                        <RelatedServicesField
                            services={services}
                            value={draft.serviceIds}
                            onChange={(value) =>
                                updateDraft('serviceIds', value)
                            }
                            description="Select one or more services related to this item."
                            error={errors.serviceIds}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="resource-access">Access</Label>
                            <Select
                                value={draft.accessType}
                                onValueChange={(value) =>
                                    updateDraft(
                                        'accessType',
                                        value as ResourceAccessType,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="resource-access"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">
                                        Open: anyone can download
                                    </SelectItem>
                                    <SelectItem value="email">
                                        Email required: link sent by email
                                    </SelectItem>
                                    <SelectItem value="paid">
                                        Paid: buy with PayPal
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {draft.accessType === 'paid' && (
                            <Field label="Price (USD)" htmlFor="resource-price">
                                <CurrencyInput
                                    id="resource-price"
                                    inputMode="decimal"
                                    placeholder="25.00"
                                    value={draft.price}
                                    onChange={(event) =>
                                        updateDraft('price', event.target.value)
                                    }
                                />
                                <p className="text-muted-foreground text-sm">
                                    Buyers pay once and keep access. The file is
                                    stored privately and only sent to buyers.
                                </p>
                            </Field>
                        )}
                        <div className="grid gap-2">
                            <Label>Publication</Label>
                            <Select
                                value={draft.status}
                                onValueChange={(value) =>
                                    updateDraft(
                                        'status',
                                        value as Draft['status'],
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="published">
                                        Live
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Field
                            label="Display Order"
                            htmlFor="resource-sort-order"
                        >
                            <Input
                                id="resource-sort-order"
                                type="number"
                                min={0}
                                value={draft.sortOrder}
                                onChange={(event) =>
                                    updateDraft(
                                        'sortOrder',
                                        Number(event.target.value),
                                    )
                                }
                            />
                        </Field>
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
                        <Button disabled={processing} onClick={handleSave}>
                            {processing ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}
