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
// docs/PHASE0_BASELINE.md (Country previously had no status field at all).
export type CountryStatus = 'Draft' | 'Published' | 'Archived';

export type Country = {
    id: string;
    name: string;
    slug: string;
    region: string;
    description: string;
    sortOrder: number;
    status: CountryStatus;
};

const STATUS_FILTER_VALUES = ['all', 'Draft', 'Published', 'Archived'] as const;
type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

const emptyDraft = {
    name: '',
    slug: '',
    region: '',
    description: '',
    sortOrder: '1',
    status: 'Published' as CountryStatus,
};

const columnLabels: Record<string, string> = {
    name: 'Name',
    slug: 'Slug',
    region: 'Region',
    sortOrder: 'Sort Order',
    status: 'Status',
};

function statusBadgeVariant(
    status: CountryStatus,
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

const helper = createColumnHelper<typeof features, Country>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('slug', { header: 'Slug' }),
    helper.accessor('region', { header: 'Region' }),
    helper.accessor('sortOrder', { header: 'Sort Order' }),
    helper.accessor('status', {
        header: 'Status',
        cell: (info) => (
            <Badge variant={statusBadgeVariant(info.getValue())}>
                {info.getValue()}
            </Badge>
        ),
    }),
]);

export type CountriesManagerHandle = { openCreate: () => void };

export function CountriesManager({
    countries,
    ref,
}: {
    countries: Country[];
    ref?: React.Ref<CountriesManagerHandle>;
}) {
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(
        null,
    );
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState(emptyDraft);
    // CMS-04: "surface a review list rather than silently unpublishing" —
    // this filter is what lets an admin actually find draft/archived
    // countries instead of them just disappearing from view once status
    // existed.
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const visibleCountries = useMemo(
        () =>
            statusFilter === 'all'
                ? countries
                : countries.filter(
                      (country) => country.status === statusFilter,
                  ),
        [countries, statusFilter],
    );
    const table = useTable({
        features,
        columns,
        data: visibleCountries,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    function openCreate() {
        setErrors({});
        setEditingId(null);
        setDraft({ ...emptyDraft, sortOrder: String(countries.length + 1) });
        setIsFormOpen(true);
    }

    useImperativeHandle(ref, () => ({ openCreate }));

    function openEdit(country: Country) {
        setErrors({});
        setEditingId(country.id);
        setDraft({
            name: country.name,
            slug: country.slug,
            region: country.region,
            description: country.description,
            sortOrder: String(country.sortOrder),
            status: country.status,
        });
        setSelectedCountry(null);
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
            name: draft.name,
            slug: draft.slug,
            region: draft.region,
            description: draft.description,
            sortOrder: draft.sortOrder,
            status: draft.status.toLowerCase(),
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => setIsFormOpen(false),
            onError: (validationErrors: Record<string, string>) =>
                setErrors(validationErrors),
            onFinish: () => setProcessing(false),
        };
        if (editingId)
            router.patch(`/admin/countries/${editingId}`, payload, options);
        else router.post('/admin/countries', payload, options);
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

            <DataTable table={table} onRowClick={setSelectedCountry} />

            <Dialog
                open={selectedCountry !== null}
                onOpenChange={(open) => !open && setSelectedCountry(null)}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedCountry?.name}</DialogTitle>
                    </DialogHeader>
                    {selectedCountry && (
                        <div className="grid gap-4 text-sm">
                            <Detail label="Slug" value={selectedCountry.slug} />
                            <Detail
                                label="Region"
                                value={selectedCountry.region}
                            />
                            <Detail
                                label="Description"
                                value={selectedCountry.description}
                                multiline
                            />
                            <Detail
                                label="Sort Order"
                                value={String(selectedCountry.sortOrder)}
                            />
                            <Detail
                                label="Status"
                                value={selectedCountry.status}
                            />
                        </div>
                    )}
                    <DialogFooter className="border-t-0 bg-transparent pt-0">
                        <Button
                            onClick={() =>
                                selectedCountry && openEdit(selectedCountry)
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
                            {editingId ? 'Edit Country' : 'New Country'}
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
                        <Field label="Name" htmlFor="country-name">
                            <Input
                                id="country-name"
                                value={draft.name}
                                onChange={(event) =>
                                    updateDraft('name', event.target.value)
                                }
                            />
                        </Field>
                        <Field label="Slug" htmlFor="country-slug">
                            <Input
                                id="country-slug"
                                placeholder="e.g. kenya"
                                value={draft.slug}
                                onChange={(event) =>
                                    updateDraft('slug', event.target.value)
                                }
                            />
                        </Field>
                        <Field label="Region" htmlFor="country-region">
                            <Input
                                id="country-region"
                                placeholder="e.g. East Africa"
                                value={draft.region}
                                onChange={(event) =>
                                    updateDraft('region', event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Description"
                            htmlFor="country-description"
                        >
                            <Textarea
                                id="country-description"
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
                        <div className="grid grid-cols-2 gap-4">
                            <Field
                                label="Sort Order"
                                htmlFor="country-sort-order"
                            >
                                <Input
                                    id="country-sort-order"
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
                                            value as CountryStatus,
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
