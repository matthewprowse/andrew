import { useForm } from '@inertiajs/react';
import { useState } from 'react';
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
import Heading from '@/components/heading';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { DatePicker } from '@/components/admin/date-picker';
import { RelatedServicesField } from '@/components/admin/related-services-field';
import type { FaqRecord } from '@/types/faq';
import { formatAdminDate } from '@/lib/format-admin-date';

type ServiceOption = { id: string; name: string };
type FaqForm = {
    question: string;
    answer: string;
    serviceIds: string[];
    status: 'Draft' | 'Live';
    reviewDate: string;
};

const blank: FaqForm = {
    question: '',
    answer: '',
    serviceIds: [],
    status: 'Draft',
    reviewDate: '',
};

const PAGE_DESCRIPTION =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

const faqTableFeatures = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    globalFilteringFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: { includesString: filterFn_includesString },
});
const faqColumnHelper = createColumnHelper<
    typeof faqTableFeatures,
    FaqRecord
>();
const faqColumns = faqColumnHelper.columns([
    faqColumnHelper.accessor('question', { header: 'Question' }),
    faqColumnHelper.accessor('serviceName', {
        header: 'Service',
        cell: (info) => info.row.original.serviceNames?.join(', ') || '—',
    }),
    faqColumnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => (
            <Badge
                variant={info.getValue() === 'Live' ? 'secondary' : 'outline'}
            >
                {info.getValue()}
            </Badge>
        ),
    }),
    faqColumnHelper.accessor('updatedAt', {
        header: 'Date',
        cell: (info) => formatAdminDate(info.getValue()),
    }),
]);

/**
 * Table + dialog CRUD for the new FAQ store, mirroring
 * TestimonialsManager's shape (same tab-body pattern, same imperative
 * "New…" handle) with a compact, field-led dialog consistent with the
 * Services and Articles editors.
 */
export function FaqManager({
    faqs,
    services,
}: {
    faqs: FaqRecord[];
    services: ServiceOption[];
}) {
    const [editing, setEditing] = useState<FaqRecord | null>(null);
    const [viewing, setViewing] = useState<FaqRecord | null>(null);
    const [open, setOpen] = useState(false);
    const form = useForm<FaqForm>(blank);

    const openCreate = () => {
        form.setData(blank);
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    };
    const table = useTable({
        features: faqTableFeatures,
        columns: faqColumns,
        data: faqs,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    const openEdit = (faq: FaqRecord) => {
        setViewing(null);
        form.setData({
            question: faq.question,
            answer: faq.answer,
            serviceIds:
                faq.serviceIds ?? (faq.serviceId ? [faq.serviceId] : []),
            status: faq.status,
            reviewDate: faq.reviewDate ?? '',
        });
        form.clearErrors();
        setEditing(faq);
        setOpen(true);
    };

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        };
        if (editing) {
            form.patch(`/admin/faqs/${editing.id}`, options);
        } else {
            form.post('/admin/faqs', options);
        }
    };

    return (
        <AdminWorkspaceLayout
            title="Frequently Asked Questions"
            description={PAGE_DESCRIPTION}
            headerAction={
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
                                        {column.id}
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
                        New FAQ
                    </Button>
                </>
            }
        >
            <Heading
                title="Frequently Asked Questions"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            {table.getRowModel().rows.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    No FAQs yet.
                </p>
            ) : (
                <DataTable
                    table={table}
                    onRowClick={setViewing}
                    showHeader={false}
                />
            )}
            <Dialog
                open={viewing !== null}
                onOpenChange={(value) => !value && setViewing(null)}
            >
                <AdminDialogContent className="sm:max-w-xl">
                    <AdminDialogHeader title="FAQ" />
                    {viewing && (
                        <div className="grid gap-4 text-sm">
                            <Detail label="Question" value={viewing.question} />
                            <Detail label="Answer" value={viewing.answer} />
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Detail label="Status" value={viewing.status} />
                                <Detail
                                    label="Review Date"
                                    value={viewing.reviewDate ?? ''}
                                />
                            </div>
                            <div className="grid gap-2">
                                <span className="text-muted-foreground">
                                    Related Services
                                </span>
                                {viewing.serviceNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {viewing.serviceNames.map((service) => (
                                            <Badge
                                                key={service}
                                                variant="secondary"
                                            >
                                                {service}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <span>—</span>
                                )}
                            </div>
                        </div>
                    )}
                    <AdminDialogFooter>
                        <Button onClick={() => viewing && openEdit(viewing)}>
                            Edit
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
                <AdminDialogContent className="sm:max-w-xl">
                    <AdminDialogHeader
                        title={editing ? 'Edit FAQ' : 'New FAQ'}
                        closeDisabled={form.processing}
                    />
                    <div className="grid gap-4">
                        <label className="grid gap-2">
                            <Label>Question</Label>
                            <Textarea
                                value={form.data.question}
                                onChange={(event) =>
                                    form.setData('question', event.target.value)
                                }
                            />
                            <Error value={form.errors.question} />
                        </label>
                        <label className="grid gap-2">
                            <Label>Answer</Label>
                            <Textarea
                                className="field-sizing-fixed min-h-32"
                                value={form.data.answer}
                                onChange={(event) =>
                                    form.setData('answer', event.target.value)
                                }
                            />
                            <Error value={form.errors.answer} />
                        </label>
                        <RelatedServicesField
                            services={services}
                            value={form.data.serviceIds}
                            onChange={(value) =>
                                form.setData('serviceIds', value)
                            }
                            description="Select the services where this FAQ should appear."
                            error={form.errors.serviceIds}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'status',
                                            value as FaqForm['status'],
                                        )
                                    }
                                >
                                    <SelectTrigger>
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
                                <Error value={form.errors.status} />
                            </label>
                            <label className="grid gap-2">
                                <Label>Review Date</Label>
                                <DatePicker
                                    value={form.data.reviewDate}
                                    onChange={(value) =>
                                        form.setData('reviewDate', value)
                                    }
                                />
                                <Error value={form.errors.reviewDate} />
                            </label>
                        </div>
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
                        <Button onClick={submit} disabled={form.processing}>
                            Save Changes
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}

function Error({ value }: { value?: string }) {
    return value ? <p className="text-destructive text-sm">{value}</p> : null;
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1">
            <span className="text-muted-foreground">{label}</span>
            <span className="whitespace-pre-wrap">{value || '—'}</span>
        </div>
    );
}
