import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    LayoutGrid,
    Table as TableIcon,
} from 'lucide-react';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Heading from '@/components/heading';
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
const PAGE_DESCRIPTION =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

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
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
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
        setErrors({});
        setEditingId(null);
        setDraft(emptyDraft);
        setIsFormOpen(true);
    }

    function openEdit(item: ResourceItemAdminRecord) {
        setErrors({});
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
        setProcessing(true);
        setErrors({});
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

        const options = {
            preserveScroll: true,
            onSuccess: () => setIsFormOpen(false),
            onError: (validationErrors: Record<string, string>) =>
                setErrors(validationErrors),
            onFinish: () => setProcessing(false),
        };
        if (editingId)
            router.patch(
                `/admin/resources/${category}/${editingId}`,
                payload,
                options,
            );
        else router.post(`/admin/resources/${category}`, payload, options);
    }

    return (
        <AdminWorkspaceLayout
            title="Resources"
            headerAction={
                <>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        value={viewMode}
                        onValueChange={(value) => {
                            if (value) setViewMode(value as 'table' | 'cards');
                        }}
                    >
                        <ToggleGroupItem value="table" aria-label="Table view">
                            <TableIcon className="size-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="cards" aria-label="Card view">
                            <LayoutGrid className="size-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
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
                                        {columnLabels[column.id] ?? column.id}
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
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={openCreate}
                    >
                        New Item
                    </Button>
                </>
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
                        <div className="grid gap-2">
                            <Label>Related Services</Label>
                            <ToggleGroup
                                type="multiple"
                                variant="outline"
                                value={draft.serviceIds}
                                onValueChange={(value) =>
                                    updateDraft('serviceIds', value)
                                }
                                className="flex-wrap justify-start gap-1.5"
                            >
                                {services.map((service) => (
                                    <ToggleGroupItem
                                        key={service.id}
                                        value={service.id}
                                        className="data-[state=on]:bg-accent rounded-md border px-3 text-sm"
                                    >
                                        {service.name}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <p className="text-muted-foreground text-sm">
                                Select one or more services related to this
                                item.
                            </p>
                        </div>
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

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1">
            <span className="text-muted-foreground">{label}</span>
            <span className="whitespace-pre-wrap">{value || '—'}</span>
        </div>
    );
}

function Field({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}
