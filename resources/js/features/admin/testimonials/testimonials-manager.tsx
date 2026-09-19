import { useForm } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';
import { AdminTableToolbar } from '@/components/admin/admin-table-toolbar';
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
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { formatAdminDate } from '@/lib/format-admin-date';

export type TestimonialRecord = {
    id: string;
    quote: string;
    author: string;
    company: string;
    serviceId: string | null;
    sortOrder: number;
    status: 'Draft' | 'Live';
    updatedAt: string;
};
type ServiceOption = { id: string; name: string };
type TestimonialForm = Omit<TestimonialRecord, 'id' | 'updatedAt'>;
const blank: TestimonialForm = {
    quote: '',
    author: '',
    company: '',
    serviceId: null,
    sortOrder: 0,
    status: 'Draft',
};

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

const testimonialTableFeatures = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    globalFilteringFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: { includesString: filterFn_includesString },
});
const testimonialColumnHelper = createColumnHelper<
    typeof testimonialTableFeatures,
    TestimonialRecord
>();
const testimonialColumns = testimonialColumnHelper.columns([
    testimonialColumnHelper.accessor('author', { header: 'Author' }),
    testimonialColumnHelper.accessor('company', {
        header: 'Company',
        cell: (info) => info.getValue() || '—',
    }),
    testimonialColumnHelper.accessor('serviceId', {
        header: 'Display Area',
        cell: (info) => (info.getValue() ? 'Service' : 'Home'),
    }),
    testimonialColumnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => (
            <Badge
                variant={info.getValue() === 'Live' ? 'secondary' : 'outline'}
            >
                {info.getValue()}
            </Badge>
        ),
    }),
    testimonialColumnHelper.accessor('updatedAt', {
        header: 'Date',
        cell: (info) => formatAdminDate(info.getValue()),
    }),
]);

/**
 * The manager renders the Testimonials listing and dialog using the same
 * content-library treatment as Articles and Resources.
 */
export function TestimonialsManager({
    testimonials,
    services,
}: {
    testimonials: TestimonialRecord[];
    services: ServiceOption[];
}) {
    const [editing, setEditing] = useState<TestimonialRecord | null>(null);
    const [viewing, setViewing] = useState<TestimonialRecord | null>(null);
    const [open, setOpen] = useState(false);
    const form = useForm(blank);
    const openCreate = () => {
        form.setData({ ...blank, sortOrder: testimonials.length + 1 });
        form.clearErrors();
        setEditing(null);
        setOpen(true);
    };
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const table = useTable({
        features: testimonialTableFeatures,
        columns: testimonialColumns,
        data: testimonials,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());
    const openEdit = (testimonial: TestimonialRecord) => {
        setViewing(null);
        form.setData({
            quote: testimonial.quote,
            author: testimonial.author,
            company: testimonial.company,
            serviceId: testimonial.serviceId,
            sortOrder: testimonial.sortOrder,
            status: testimonial.status,
        });
        form.clearErrors();
        setEditing(testimonial);
        setOpen(true);
    };
    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        };
        if (editing) {
            form.patch(`/admin/testimonials/${editing.id}`, options);
        } else {
            form.post('/admin/testimonials', options);
        }
    };

    return (
        <AdminWorkspaceLayout
            title="Testimonials"
            description={PAGE_DESCRIPTION}
            headerAction={
                <AdminTableToolbar
                    search={table.state.globalFilter ?? ''}
                    onSearchChange={(value) => table.setGlobalFilter(value)}
                    sortColumns={sortableColumns}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                >
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={openCreate}
                    >
                        New Testimonial
                    </Button>
                </AdminTableToolbar>
            }
        >
            <Heading
                title="Testimonials"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            {table.getRowModel().rows.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {testimonials.length === 0
                        ? 'No testimonials yet.'
                        : 'No testimonials match your search.'}
                </p>
            ) : viewMode === 'table' ? (
                <DataTable
                    table={table}
                    onRowClick={setViewing}
                    showHeader={false}
                />
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {table
                        .getRowModel()
                        .rows.map(({ original: testimonial }) => (
                            <Card
                                key={testimonial.id}
                                size="sm"
                                role="button"
                                tabIndex={0}
                                className="cursor-pointer"
                                onClick={() => setViewing(testimonial)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.preventDefault();
                                        setViewing(testimonial);
                                    }
                                }}
                            >
                                <CardHeader>
                                    <CardTitle>{testimonial.author}</CardTitle>
                                    <CardDescription className="col-span-full row-start-2 line-clamp-3">
                                        {testimonial.quote}
                                    </CardDescription>
                                    <CardAction className="row-span-1 row-start-1">
                                        <Badge
                                            variant={
                                                testimonial.status === 'Live'
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                        >
                                            {testimonial.status}
                                        </Badge>
                                    </CardAction>
                                </CardHeader>
                            </Card>
                        ))}
                </div>
            )}
            <Dialog
                open={viewing !== null}
                onOpenChange={(value) => !value && setViewing(null)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader title="Testimonial" />
                    {viewing && (
                        <div className="grid gap-4 text-sm">
                            <FieldValue label="Quote" value={viewing.quote} />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FieldValue
                                    label="Author"
                                    value={viewing.author}
                                />
                                <FieldValue
                                    label="Company"
                                    value={viewing.company}
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FieldValue
                                    label="Display Area"
                                    value={
                                        viewing.serviceId
                                            ? (services.find(
                                                  (service) =>
                                                      service.id ===
                                                      viewing.serviceId,
                                              )?.name ?? 'Service')
                                            : 'General (Home)'
                                    }
                                />
                                <FieldValue
                                    label="Status"
                                    value={viewing.status}
                                />
                            </div>
                            <FieldValue
                                label="Sort Order"
                                value={String(viewing.sortOrder)}
                            />
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
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={editing ? 'Edit Testimonial' : 'New Testimonial'}
                        closeDisabled={form.processing}
                    />
                    <div className="grid gap-4">
                        <Field label="Quote">
                            <Textarea
                                value={form.data.quote}
                                onChange={(event) =>
                                    form.setData('quote', event.target.value)
                                }
                            />
                            <Error value={form.errors.quote} />
                        </Field>
                        <Field label="Author">
                            <Input
                                value={form.data.author}
                                onChange={(event) =>
                                    form.setData('author', event.target.value)
                                }
                            />
                            <Error value={form.errors.author} />
                        </Field>
                        <Field label="Company">
                            <Input
                                value={form.data.company}
                                onChange={(event) =>
                                    form.setData('company', event.target.value)
                                }
                            />
                            <Error value={form.errors.company} />
                        </Field>
                        <Field label="Display Area">
                            <Select
                                value={form.data.serviceId ?? 'homepage'}
                                onValueChange={(value) =>
                                    form.setData(
                                        'serviceId',
                                        value === 'homepage' ? null : value,
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="homepage">
                                        General (shown on Home)
                                    </SelectItem>
                                    {services.map((service) => (
                                        <SelectItem
                                            key={service.id}
                                            value={service.id}
                                        >
                                            {service.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Sort Order">
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.data.sortOrder}
                                    onChange={(event) =>
                                        form.setData(
                                            'sortOrder',
                                            Number(event.target.value),
                                        )
                                    }
                                />
                                <Error value={form.errors.sortOrder} />
                            </Field>
                            <Field label="Status">
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'status',
                                            value as 'Draft' | 'Live',
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
                            </Field>
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
function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-2">
            <Label>{label}</Label>
            {children}
        </label>
    );
}
function Error({ value }: { value?: string }) {
    return value ? <p className="text-destructive text-sm">{value}</p> : null;
}

function FieldValue({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1">
            <span className="text-muted-foreground">{label}</span>
            <span className="whitespace-pre-wrap">{value || '—'}</span>
        </div>
    );
}
