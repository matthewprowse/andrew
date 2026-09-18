import { router } from '@inertiajs/react';
import { useImperativeHandle, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

// CMS-04: draft/published/archived, explicit rather than implicit — see
// docs/PHASE0_BASELINE.md (Location previously had no status field at all).
export type LocationStatus = 'Draft' | 'Published' | 'Archived';

export type Location = {
    id: string;
    officeName: string;
    address: string;
    phone: string;
    email: string;
    sortOrder: number;
    status: LocationStatus;
    // CMS-04: explicit, admin-set flag rather than an implicit consequence
    // of row order. At most one office can be true at a time, enforced
    // server-side (LocationsController atomically unsets the previous
    // primary in the same transaction as the new save).
    isPrimary: boolean;
};

const STATUS_FILTER_VALUES = ['all', 'Draft', 'Published', 'Archived'] as const;
type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

const emptyDraft = {
    officeName: '',
    address: '',
    phone: '',
    email: '',
    sortOrder: '1',
    status: 'Published' as LocationStatus,
    isPrimary: false,
};

const columnLabels: Record<string, string> = {
    officeName: 'Office Name',
    phone: 'Phone',
    email: 'Email',
    sortOrder: 'Sort Order',
    status: 'Status',
};

function statusBadgeVariant(
    status: LocationStatus,
): 'default' | 'secondary' | 'outline' {
    if (status === 'Published') return 'default';
    if (status === 'Draft') return 'secondary';
    return 'outline';
}

const features = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    globalFilteringFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: { includesString: filterFn_includesString },
});

const helper = createColumnHelper<typeof features, Location>();
const columns = helper.columns([
    helper.accessor('officeName', { header: 'Office Name' }),
    helper.accessor('phone', { header: 'Phone' }),
    helper.accessor('email', { header: 'Email' }),
    helper.accessor('sortOrder', { header: 'Sort Order' }),
    helper.accessor('status', {
        header: 'Status',
        cell: (info) => (
            <Badge variant={statusBadgeVariant(info.getValue())}>
                {info.getValue()}
            </Badge>
        ),
    }),
    helper.accessor('isPrimary', {
        header: 'Primary',
        cell: (info) =>
            info.getValue() ? <Badge variant="outline">Primary</Badge> : null,
    }),
]);

export type LocationsManagerHandle = { openCreate: () => void };

export function LocationsManager({
    locations,
    ref,
}: {
    locations: Location[];
    ref?: React.Ref<LocationsManagerHandle>;
}) {
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(
        null,
    );
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState(emptyDraft);
    // CMS-04: "surface a review list rather than silently unpublishing" —
    // this filter is what lets an admin actually find draft/archived offices
    // instead of them just disappearing from view once status existed.
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const visibleLocations = useMemo(
        () =>
            statusFilter === 'all'
                ? locations
                : locations.filter(
                      (location) => location.status === statusFilter,
                  ),
        [locations, statusFilter],
    );
    const table = useTable({
        features,
        columns,
        data: visibleLocations,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    function openCreate() {
        setErrors({});
        setEditingId(null);
        setDraft({ ...emptyDraft, sortOrder: String(locations.length + 1) });
        setIsFormOpen(true);
    }

    useImperativeHandle(ref, () => ({ openCreate }));

    function openEdit(location: Location) {
        setErrors({});
        setEditingId(location.id);
        setDraft({
            officeName: location.officeName,
            address: location.address,
            phone: location.phone,
            email: location.email,
            sortOrder: String(location.sortOrder),
            status: location.status,
            isPrimary: location.isPrimary,
        });
        setSelectedLocation(null);
        setIsFormOpen(true);
    }

    function updateDraft<K extends keyof typeof emptyDraft>(
        key: K,
        value: (typeof emptyDraft)[K],
    ) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function handleSave() {
        setProcessing(true);
        setErrors({});
        const payload = {
            officeName: draft.officeName,
            address: draft.address,
            phone: draft.phone,
            email: draft.email,
            sortOrder: draft.sortOrder,
            status: draft.status.toLowerCase(),
            isPrimary: draft.isPrimary,
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => setIsFormOpen(false),
            onError: (validationErrors: Record<string, string>) =>
                setErrors(validationErrors),
            onFinish: () => setProcessing(false),
        };
        if (editingId)
            router.patch(`/admin/locations/${editingId}`, payload, options);
        else router.post('/admin/locations', payload, options);
    }

    return (
        <>
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Input
                        placeholder="Search"
                        value={table.state.globalFilter ?? ''}
                        onChange={(event) =>
                            table.setGlobalFilter(event.target.value)
                        }
                        className="max-w-sm"
                    />
                    <Select
                        value={statusFilter}
                        onValueChange={(value) =>
                            setStatusFilter(value as StatusFilter)
                        }
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Published">Published</SelectItem>
                            <SelectItem value="Archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost">Sort</Button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
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
            </header>

            <DataTable table={table} onRowClick={setSelectedLocation} />

            <Dialog
                open={selectedLocation !== null}
                onOpenChange={(open) => !open && setSelectedLocation(null)}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedLocation?.officeName}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedLocation && (
                        <div className="grid gap-4 text-sm">
                            <Detail
                                label="Address"
                                value={selectedLocation.address}
                                multiline
                            />
                            <Detail
                                label="Phone"
                                value={selectedLocation.phone}
                            />
                            <Detail
                                label="Email"
                                value={selectedLocation.email}
                            />
                            <Detail
                                label="Sort Order"
                                value={String(selectedLocation.sortOrder)}
                            />
                            <Detail
                                label="Status"
                                value={selectedLocation.status}
                            />
                            <Detail
                                label="Primary office"
                                value={
                                    selectedLocation.isPrimary ? 'Yes' : 'No'
                                }
                            />
                        </div>
                    )}
                    <DialogFooter className="border-t-0 bg-transparent pt-0">
                        <Button
                            onClick={() =>
                                selectedLocation && openEdit(selectedLocation)
                            }
                        >
                            Edit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Edit Location' : 'New Location'}
                        </DialogTitle>
                    </DialogHeader>
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
                        <Field
                            label="Office Name"
                            htmlFor="location-office-name"
                        >
                            <Input
                                id="location-office-name"
                                value={draft.officeName}
                                onChange={(event) =>
                                    updateDraft(
                                        'officeName',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field label="Address" htmlFor="location-address">
                            <Textarea
                                id="location-address"
                                className="field-sizing-fixed"
                                value={draft.address}
                                onChange={(event) =>
                                    updateDraft('address', event.target.value)
                                }
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Phone" htmlFor="location-phone">
                                <Input
                                    id="location-phone"
                                    type="tel"
                                    value={draft.phone}
                                    onChange={(event) =>
                                        updateDraft('phone', event.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Email" htmlFor="location-email">
                                <Input
                                    id="location-email"
                                    type="email"
                                    value={draft.email}
                                    onChange={(event) =>
                                        updateDraft('email', event.target.value)
                                    }
                                />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field
                                label="Sort Order"
                                htmlFor="location-sort-order"
                            >
                                <Input
                                    id="location-sort-order"
                                    type="number"
                                    min="0"
                                    value={draft.sortOrder}
                                    onChange={(event) =>
                                        updateDraft(
                                            'sortOrder',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={draft.status}
                                    onValueChange={(value) =>
                                        updateDraft(
                                            'status',
                                            value as LocationStatus,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Draft">
                                            Draft
                                        </SelectItem>
                                        <SelectItem value="Published">
                                            Published
                                        </SelectItem>
                                        <SelectItem value="Archived">
                                            Archived
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={draft.isPrimary}
                                onCheckedChange={(checked) =>
                                    updateDraft('isPrimary', checked === true)
                                }
                            />
                            Primary office
                        </label>
                        {draft.isPrimary && (
                            <p className="text-muted-foreground text-sm">
                                Saving this will replace any other office
                                currently marked primary — only one office can
                                be primary at a time.
                            </p>
                        )}
                    </div>
                    <DialogFooter className="border-t-0 bg-transparent pt-0">
                        <Button disabled={processing} onClick={handleSave}>
                            {processing ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function Detail({
    label,
    value,
    multiline = false,
}: {
    label: string;
    value: string;
    multiline?: boolean;
}) {
    return (
        <div className="grid gap-1">
            <span className="text-muted-foreground">{label}</span>
            <span className={multiline ? 'whitespace-pre-wrap' : undefined}>
                {value || '—'}
            </span>
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
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}
