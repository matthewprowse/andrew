import { router } from '@inertiajs/react';
import { useImperativeHandle, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
    columnFilteringFeature,
    createColumnHelper,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    filterFn_includesString,
    globalFilteringFeature,
    rowPaginationFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
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
import type { EstimatorCityRecord } from '@/types/estimator';

const columnLabels: Record<string, string> = {
    city: 'City',
    country: 'Country',
    continent: 'Continent',
    status: 'Status',
    sortOrder: 'Order',
};

const features = tableFeatures({
    rowSortingFeature,
    columnFilteringFeature,
    globalFilteringFeature,
    rowPaginationFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: { includesString: filterFn_includesString },
});

const CONTINENT_OPTIONS = [
    'Africa',
    'Asia',
    'Europe',
    'North America',
    'South America',
    'Oceania',
];

const helper = createColumnHelper<typeof features, EstimatorCityRecord>();
const columns = helper.columns([
    helper.accessor('city', { header: 'City' }),
    helper.accessor('country', { header: 'Country' }),
    helper.accessor('continent', { header: 'Continent' }),
    helper.accessor('status', { header: 'Status' }),
]);

const emptyDraft = {
    city: '',
    country: '',
    continent: 'Africa',
    status: 'Inactive' as EstimatorCityRecord['status'],
    sortOrder: '0',
};

export type CitiesManagerHandle = { openCreate: () => void };

export function CitiesManager({
    cities,
    ref,
}: {
    cities: EstimatorCityRecord[];
    ref?: React.Ref<CitiesManagerHandle>;
}) {
    const [selectedCity, setSelectedCity] =
        useState<EstimatorCityRecord | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState(emptyDraft);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const table = useTable({
        features,
        columns,
        data: cities,
        globalFilterFn: 'includesString',
        initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
    });

    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    function openCreate() {
        setErrors({});
        setEditingId(null);
        setDraft({ ...emptyDraft, sortOrder: String(cities.length + 1) });
        setIsFormOpen(true);
    }

    useImperativeHandle(ref, () => ({ openCreate }));

    function openEdit(city: EstimatorCityRecord) {
        setErrors({});
        setEditingId(city.id);
        setDraft({
            city: city.city,
            country: city.country,
            continent: city.continent,
            status: city.status,
            sortOrder: String(city.sortOrder),
        });
        setSelectedCity(null);
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
            city: draft.city,
            country: draft.country,
            continent: draft.continent,
            status: draft.status,
            sortOrder: Number(draft.sortOrder) || 0,
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
                `/admin/estimator/cities/${editingId}`,
                payload,
                options,
            );
        else router.post('/admin/estimator/cities', payload, options);
    }

    return (
        <>
            <div className="flex items-center justify-between gap-4">
                <Input
                    placeholder="Search"
                    value={table.state.globalFilter ?? ''}
                    onChange={(event) =>
                        table.setGlobalFilter(event.target.value)
                    }
                    className="max-w-sm"
                />
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
            </div>

            <DataTable table={table} onRowClick={setSelectedCity} />

            <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                    Page {table.state.pagination.pageIndex + 1} of{' '}
                    {Math.max(table.getPageCount(), 1)}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        disabled={!table.getCanPreviousPage()}
                        onClick={() => table.previousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!table.getCanNextPage()}
                        onClick={() => table.nextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>

            <Dialog
                open={selectedCity !== null}
                onOpenChange={(open) => !open && setSelectedCity(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedCity?.city}</DialogTitle>
                    </DialogHeader>

                    {selectedCity && (
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                            <dt className="text-muted-foreground">Country</dt>
                            <dd>{selectedCity.country}</dd>
                            <dt className="text-muted-foreground">Continent</dt>
                            <dd>{selectedCity.continent}</dd>
                            <dt className="text-muted-foreground">Status</dt>
                            <dd>{selectedCity.status}</dd>
                        </dl>
                    )}

                    <DialogFooter className="border-t-0 bg-transparent pt-0">
                        <Button
                            onClick={() =>
                                selectedCity && openEdit(selectedCity)
                            }
                        >
                            Edit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Edit City' : 'Add City'}
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
                        <div className="grid gap-2">
                            <Label htmlFor="field-city">City</Label>
                            <Input
                                id="field-city"
                                value={draft.city}
                                onChange={(event) =>
                                    updateDraft('city', event.target.value)
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="field-country">Country</Label>
                            <Input
                                id="field-country"
                                value={draft.country}
                                onChange={(event) =>
                                    updateDraft('country', event.target.value)
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Continent</Label>
                            <Select
                                value={draft.continent}
                                onValueChange={(value) =>
                                    updateDraft('continent', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONTINENT_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select
                                value={draft.status}
                                onValueChange={(value) =>
                                    updateDraft(
                                        'status',
                                        value as EstimatorCityRecord['status'],
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="Inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="field-sort-order">
                                Display Order
                            </Label>
                            <Input
                                id="field-sort-order"
                                type="number"
                                min={0}
                                value={draft.sortOrder}
                                onChange={(event) =>
                                    updateDraft('sortOrder', event.target.value)
                                }
                            />
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
