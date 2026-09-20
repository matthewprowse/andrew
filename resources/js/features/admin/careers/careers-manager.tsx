import { router } from '@inertiajs/react';
import { useImperativeHandle, useState } from 'react';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { DatePicker } from '@/components/admin/date-picker';
import { useAdminMutation } from '@/hooks/use-admin-mutation';
import { formatAdminDate } from '@/lib/format-admin-date';
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
import { DataTable } from '@/components/ui/data-table';
import { AdminSortMenu } from '@/components/admin/admin-table-toolbar';
import { Dialog, DialogClose } from '@/components/ui/dialog';
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

export type Career = {
    id: string;
    jobTitle: string;
    description: string;
    location: string;
    status: 'Draft' | 'Live';
    postedDate: string;
};

const emptyDraft = {
    jobTitle: '',
    description: '',
    location: '',
    status: 'Draft' as Career['status'],
    postedDate: todayIso(),
};

const columnLabels: Record<string, string> = {
    jobTitle: 'Job Title',
    location: 'Location',
    status: 'Status',
    postedDate: 'Posted Date',
};

function todayIso() {
    return new Date().toISOString().slice(0, 10);
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

const helper = createColumnHelper<typeof features, Career>();
const columns = helper.columns([
    helper.accessor('jobTitle', { header: 'Job Title' }),
    helper.accessor('location', { header: 'Location' }),
    helper.accessor('status', { header: 'Status' }),
    helper.accessor('postedDate', {
        header: 'Posted Date',
        cell: (info) => formatAdminDate(info.getValue()),
    }),
]);

export type CareersManagerHandle = { openCreate: () => void };

export function CareersManager({
    careers,
    ref,
    hideToolbar = false,
}: {
    careers: Career[];
    ref?: React.Ref<CareersManagerHandle>;
    hideToolbar?: boolean;
}) {
    const {
        processing,
        errors,
        clearErrors,
        run: runMutation,
    } = useAdminMutation();
    const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState(emptyDraft);
    const table = useTable({
        features,
        columns,
        data: careers,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    function openCreate() {
        clearErrors();
        setEditingId(null);
        setDraft({ ...emptyDraft, postedDate: todayIso() });
        setIsFormOpen(true);
    }

    useImperativeHandle(ref, () => ({ openCreate }));

    function openEdit(career: Career) {
        clearErrors();
        setEditingId(career.id);
        setDraft({
            jobTitle: career.jobTitle,
            description: career.description,
            location: career.location,
            status: career.status,
            postedDate: career.postedDate,
        });
        setSelectedCareer(null);
        setIsFormOpen(true);
    }

    function updateDraft<K extends keyof typeof emptyDraft>(
        key: K,
        value: (typeof emptyDraft)[K],
    ) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function handleSave() {
        const payload = {
            ...draft,
            status: draft.status === 'Live' ? 'Open' : 'Closed',
        };
        runMutation(
            (options) =>
                editingId
                    ? router.patch(
                          `/admin/careers/${editingId}`,
                          payload,
                          options,
                      )
                    : router.post('/admin/careers', payload, options),
            { onSuccess: () => setIsFormOpen(false) },
        );
    }

    return (
        <>
            {!hideToolbar && (
                <header className="flex items-center justify-between gap-4">
                    <Input
                        placeholder="Search"
                        value={table.state.globalFilter ?? ''}
                        onChange={(event) =>
                            table.setGlobalFilter(event.target.value)
                        }
                        className="max-w-sm"
                    />
                    <AdminSortMenu
                        columns={sortableColumns}
                        labels={columnLabels}
                        align="start"
                        variant="ghost"
                    />
                </header>
            )}

            <DataTable
                table={table}
                onRowClick={setSelectedCareer}
                showHeader={!hideToolbar}
            />

            <Dialog
                open={selectedCareer !== null}
                onOpenChange={(open) => !open && setSelectedCareer(null)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader title={selectedCareer?.jobTitle} />
                    {selectedCareer && (
                        <div className="grid gap-4 text-sm">
                            <dl className="grid grid-cols-2 gap-2">
                                <dt className="text-muted-foreground">
                                    Location
                                </dt>
                                <dd>{selectedCareer.location || '—'}</dd>
                                <dt className="text-muted-foreground">
                                    Status
                                </dt>
                                <dd>{selectedCareer.status}</dd>
                                <dt className="text-muted-foreground">
                                    Posted Date
                                </dt>
                                <dd>
                                    {formatAdminDate(selectedCareer.postedDate)}
                                </dd>
                            </dl>
                            <Detail
                                label="Description"
                                value={selectedCareer.description}
                            />
                        </div>
                    )}
                    <AdminDialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                selectedCareer && openEdit(selectedCareer)
                            }
                        >
                            Edit
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>

            <Dialog
                open={isFormOpen}
                onOpenChange={(open) => {
                    if (!processing) setIsFormOpen(open);
                }}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={
                            editingId
                                ? draft.jobTitle || 'Position'
                                : 'New Position'
                        }
                        closeDisabled={processing}
                    />
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleSave();
                        }}
                        className="space-y-4"
                    >
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
                        <Field label="Job Title" htmlFor="career-job-title">
                            <Input
                                id="career-job-title"
                                value={draft.jobTitle}
                                onChange={(event) =>
                                    updateDraft('jobTitle', event.target.value)
                                }
                            />
                        </Field>
                        <Field label="Description" htmlFor="career-description">
                            <Textarea
                                id="career-description"
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
                        <Field label="Location" htmlFor="career-location">
                            <Input
                                id="career-location"
                                value={draft.location}
                                onChange={(event) =>
                                    updateDraft('location', event.target.value)
                                }
                            />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Posted Date"
                                htmlFor="career-posted-date"
                            >
                                <DatePicker
                                    id="career-posted-date"
                                    value={draft.postedDate}
                                    onChange={(value) =>
                                        updateDraft('postedDate', value)
                                    }
                                    placeholder="Pick a Date"
                                />
                            </Field>
                            <div className="grid gap-2">
                                <Label>Publication Status</Label>
                                <Select
                                    value={draft.status}
                                    onValueChange={(value) =>
                                        updateDraft(
                                            'status',
                                            value as Career['status'],
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
                                        <SelectItem value="Live">
                                            Live
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
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
                                type="submit"
                                variant="secondary"
                                disabled={processing}
                            >
                                {processing ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
        </>
    );
}
