import { router } from '@inertiajs/react';
import { useImperativeHandle, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
    EstimatorServiceCategory,
    EstimatorServiceRecord,
} from '@/types/estimator';

const columnLabels: Record<string, string> = {
    name: 'Name',
    selectedByDefault: 'Default',
    active: 'Active',
    sortOrder: 'Order',
};

const features = tableFeatures({
    rowSortingFeature,
    columnFilteringFeature,
    globalFilteringFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: { includesString: filterFn_includesString },
});

const helper = createColumnHelper<typeof features, EstimatorServiceRecord>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('selectedByDefault', {
        header: 'Default',
        cell: (info) => (info.getValue() ? 'Yes' : 'No'),
    }),
    helper.accessor('active', {
        header: 'Active',
        cell: (info) => (info.getValue() ? 'Yes' : 'No'),
    }),
    helper.accessor('sortOrder', { header: 'Order' }),
]);

const emptyDraft = {
    category: 'Costs' as EstimatorServiceCategory,
    name: '',
    description: '',
    selectedByDefault: false,
    active: true,
    tieredPricing: false,
    firstThreshold: '0',
    adjustmentAboveThreshold: '0',
    nextThreshold: '0',
    adjustmentAboveNextThreshold: '0',
    sortOrder: '0',
};

function ServiceCatalog({
    category,
    services,
    onRowClick,
}: {
    category: EstimatorServiceCategory;
    services: EstimatorServiceRecord[];
    onRowClick: (service: EstimatorServiceRecord) => void;
}) {
    const items = services.filter((s) => s.category === category);
    const table = useTable({
        features,
        columns,
        data: items,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    return (
        <div className="flex flex-col gap-4">
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
            <DataTable table={table} onRowClick={onRowClick} />
        </div>
    );
}

export type ServicesPricingManagerHandle = { openCreate: () => void };

export function ServicesPricingManager({
    services,
    ref,
}: {
    services: EstimatorServiceRecord[];
    ref?: React.Ref<ServicesPricingManagerHandle>;
}) {
    const [tab, setTab] = useState<'costs' | 'services'>('costs');
    const [selectedService, setSelectedService] =
        useState<EstimatorServiceRecord | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState(emptyDraft);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function openCreate(category: EstimatorServiceCategory) {
        setErrors({});
        setEditingId(null);
        setDraft({ ...emptyDraft, category });
        setIsFormOpen(true);
    }

    useImperativeHandle(ref, () => ({
        openCreate: () => openCreate(tab === 'costs' ? 'Costs' : 'Services'),
    }));

    function openEdit(service: EstimatorServiceRecord) {
        setErrors({});
        setEditingId(service.id);
        setDraft({
            category: service.category,
            name: service.name,
            description: service.description,
            selectedByDefault: service.selectedByDefault,
            active: service.active,
            tieredPricing: service.tieredPricing,
            firstThreshold: String(service.firstThreshold),
            adjustmentAboveThreshold: String(service.adjustmentAboveThreshold),
            nextThreshold: String(service.nextThreshold),
            adjustmentAboveNextThreshold: String(
                service.adjustmentAboveNextThreshold,
            ),
            sortOrder: String(service.sortOrder),
        });
        setSelectedService(null);
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
        const showTiers = draft.category === 'Services';
        const payload = {
            category: draft.category,
            name: draft.name,
            description: draft.description,
            selectedByDefault: draft.selectedByDefault,
            active: draft.active,
            tieredPricing: showTiers && draft.tieredPricing,
            firstThreshold: showTiers ? Number(draft.firstThreshold) || 0 : 0,
            adjustmentAboveThreshold: showTiers
                ? Number(draft.adjustmentAboveThreshold) || 0
                : 0,
            nextThreshold: showTiers ? Number(draft.nextThreshold) || 0 : 0,
            adjustmentAboveNextThreshold: showTiers
                ? Number(draft.adjustmentAboveNextThreshold) || 0
                : 0,
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
                `/admin/estimator/services-pricing/${editingId}`,
                payload,
                options,
            );
        else router.post('/admin/estimator/services-pricing', payload, options);
    }

    return (
        <>
            <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as 'costs' | 'services')}
            >
                <TabsList>
                    <TabsTrigger value="costs">Costs</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                </TabsList>
                <TabsContent value="costs" className="flex flex-col gap-4">
                    <ServiceCatalog
                        category="Costs"
                        services={services}
                        onRowClick={setSelectedService}
                    />
                </TabsContent>
                <TabsContent value="services" className="flex flex-col gap-4">
                    <ServiceCatalog
                        category="Services"
                        services={services}
                        onRowClick={setSelectedService}
                    />
                </TabsContent>
            </Tabs>

            <Dialog
                open={selectedService !== null}
                onOpenChange={(open) => !open && setSelectedService(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedService?.name}</DialogTitle>
                    </DialogHeader>

                    {selectedService && (
                        <div className="grid gap-4 text-sm">
                            <dl className="grid grid-cols-2 gap-2">
                                <dt className="text-muted-foreground">
                                    Category
                                </dt>
                                <dd>{selectedService.category}</dd>
                                <dt className="text-muted-foreground">
                                    Default
                                </dt>
                                <dd>
                                    {selectedService.selectedByDefault
                                        ? 'Yes'
                                        : 'No'}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Active
                                </dt>
                                <dd>{selectedService.active ? 'Yes' : 'No'}</dd>
                            </dl>
                            <div className="grid gap-1">
                                <span className="text-muted-foreground">
                                    Description
                                </span>
                                <span>
                                    {selectedService.description || '—'}
                                </span>
                            </div>
                            {selectedService.category === 'Services' &&
                                selectedService.tieredPricing && (
                                    <>
                                        <Separator />
                                        <dl className="grid grid-cols-2 gap-2">
                                            <dt className="text-muted-foreground">
                                                First People Threshold
                                            </dt>
                                            <dd>
                                                {selectedService.firstThreshold}
                                            </dd>
                                            <dt className="text-muted-foreground">
                                                Adjustment Above Threshold %
                                            </dt>
                                            <dd>
                                                {
                                                    selectedService.adjustmentAboveThreshold
                                                }
                                            </dd>
                                            <dt className="text-muted-foreground">
                                                Next People Threshold
                                            </dt>
                                            <dd>
                                                {selectedService.nextThreshold}
                                            </dd>
                                            <dt className="text-muted-foreground">
                                                Adjustment Above Next Threshold
                                                %
                                            </dt>
                                            <dd>
                                                {
                                                    selectedService.adjustmentAboveNextThreshold
                                                }
                                            </dd>
                                        </dl>
                                    </>
                                )}
                        </div>
                    )}

                    <DialogFooter className="border-t-0 bg-transparent pt-0">
                        <Button
                            onClick={() =>
                                selectedService && openEdit(selectedService)
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
                            {editingId ? 'Edit Service' : 'New Service'}
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
                            <Label>Category</Label>
                            <Select
                                value={draft.category}
                                onValueChange={(value) =>
                                    updateDraft(
                                        'category',
                                        value as EstimatorServiceCategory,
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Costs">Costs</SelectItem>
                                    <SelectItem value="Services">
                                        Services
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="field-name">Service Name</Label>
                            <Input
                                id="field-name"
                                value={draft.name}
                                onChange={(event) =>
                                    updateDraft('name', event.target.value)
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="field-description">
                                Description
                            </Label>
                            <Input
                                id="field-description"
                                value={draft.description}
                                onChange={(event) =>
                                    updateDraft(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="field-selected-by-default"
                                checked={draft.selectedByDefault}
                                onCheckedChange={(checked) =>
                                    updateDraft(
                                        'selectedByDefault',
                                        checked === true,
                                    )
                                }
                            />
                            <Label htmlFor="field-selected-by-default">
                                Default
                            </Label>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="field-active"
                                checked={draft.active}
                                onCheckedChange={(checked) =>
                                    updateDraft('active', checked === true)
                                }
                            />
                            <Label htmlFor="field-active">Active</Label>
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

                        {draft.category === 'Services' && (
                            <>
                                <Separator />

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="field-tiered-pricing"
                                        checked={draft.tieredPricing}
                                        onCheckedChange={(checked) =>
                                            updateDraft(
                                                'tieredPricing',
                                                checked === true,
                                            )
                                        }
                                    />
                                    <Label htmlFor="field-tiered-pricing">
                                        Changes Depending On People
                                    </Label>
                                </div>

                                {draft.tieredPricing && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="field-first-threshold">
                                                First People Threshold
                                            </Label>
                                            <Input
                                                id="field-first-threshold"
                                                type="number"
                                                value={draft.firstThreshold}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        'firstThreshold',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="field-adjustment-threshold">
                                                Adjustment Above Threshold %
                                            </Label>
                                            <Input
                                                id="field-adjustment-threshold"
                                                type="number"
                                                value={
                                                    draft.adjustmentAboveThreshold
                                                }
                                                onChange={(event) =>
                                                    updateDraft(
                                                        'adjustmentAboveThreshold',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="field-next-threshold">
                                                Next People Threshold
                                            </Label>
                                            <Input
                                                id="field-next-threshold"
                                                type="number"
                                                value={draft.nextThreshold}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        'nextThreshold',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="field-adjustment-next-threshold">
                                                Adjustment Above Next Threshold
                                                %
                                            </Label>
                                            <Input
                                                id="field-adjustment-next-threshold"
                                                type="number"
                                                value={
                                                    draft.adjustmentAboveNextThreshold
                                                }
                                                onChange={(event) =>
                                                    updateDraft(
                                                        'adjustmentAboveNextThreshold',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <DialogFooter className="border-t-0 bg-transparent pt-0">
                        <Button disabled={processing} onClick={handleSave}>
                            {processing ? 'Saving…' : 'Save Service'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
