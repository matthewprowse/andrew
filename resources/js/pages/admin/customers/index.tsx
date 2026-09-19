import { Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    createColumnHelper,
    createSortedRowModel,
    rowSortingFeature,
    sortFn_alphanumeric,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { AdminTableToolbar } from '@/components/admin/admin-table-toolbar';

type Activity = { type: string; label: string; date: string | null };
type RelatedRecord = {
    id: string;
    label: string;
    detail: string | null;
    date: string | null;
    status: string;
    href: string;
};
type Customer = {
    id: string;
    name: string | null;
    email: string;
    company: string | null;
    notes: string | null;
    inquiries: number;
    orders: number;
    lastActivity: string | null;
    activities: Activity[];
    inquiryRecords: RelatedRecord[];
    orderRecords: RelatedRecord[];
};

const columnLabels: Record<string, string> = {
    name: 'Customer',
    company: 'Company',
    inquiries: 'Inquiries',
    orders: 'Orders',
    lastActivity: 'Last activity',
};
const features = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
});
const columnHelper = createColumnHelper<typeof features, Customer>();
const columns = columnHelper.columns([
    columnHelper.accessor('name', {
        header: 'Customer',
        cell: (info) => (
            <div>
                <div className="font-medium">
                    {info.getValue() || 'Unnamed customer'}
                </div>
                <div className="text-muted-foreground text-xs">
                    {info.row.original.email}
                </div>
            </div>
        ),
    }),
    columnHelper.accessor('company', {
        header: 'Company',
        cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('inquiries', { header: 'Inquiries' }),
    columnHelper.accessor('orders', { header: 'Orders' }),
    columnHelper.accessor('lastActivity', {
        header: 'Last activity',
        cell: (info) => formatDate(info.getValue()),
    }),
]);

function formatDate(iso: string | null) {
    if (!iso) return '—';
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('en-ZA', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          });
}

export default function CustomersIndex({
    customers,
}: {
    customers: Customer[];
}) {
    const form = useForm({ name: '', email: '', company: '', notes: '' });
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<Customer | null>(null);
    const filteredCustomers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return customers;
        return customers.filter((customer) =>
            [customer.name, customer.email, customer.company]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(query)),
        );
    }, [customers, search]);
    const table = useTable({ features, columns, data: filteredCustomers });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort() && columnLabels[column.id]);
    function openCreate() {
        form.reset();
        form.clearErrors();
        setCreateOpen(true);
    }
    function save() {
        form.post('/admin/customers', {
            onSuccess: () => setCreateOpen(false),
        });
    }
    const headerAction = (
        <AdminTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchClassName="h-8 w-64"
            sortColumns={sortableColumns}
            sortLabels={columnLabels}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
        >
            <Button variant="secondary" onClick={openCreate}>
                New Customer
            </Button>
        </AdminTableToolbar>
    );
    const description =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    return (
        <AdminWorkspaceLayout
            title="Customers"
            description={description}
            headerAction={headerAction}
        >
            <Heading
                title="Customers"
                description={description}
                variant="large"
            />
            {table.getRowModel().rows.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {customers.length === 0
                        ? 'No customers yet. Add one to get started.'
                        : 'No customers match your search.'}
                </p>
            ) : viewMode === 'table' ? (
                <DataTable table={table} onRowClick={setSelected} />
            ) : (
                <div className="grid gap-3 lg:grid-cols-4">
                    {table.getRowModel().rows.map(({ original: customer }) => (
                        <Card
                            key={customer.id}
                            size="sm"
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer"
                            onClick={() => setSelected(customer)}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    setSelected(customer);
                                }
                            }}
                        >
                            <CardHeader>
                                <CardTitle>
                                    {customer.name || 'Unnamed customer'}
                                </CardTitle>
                                <CardDescription>
                                    {customer.email}
                                </CardDescription>
                                <CardAction>
                                    <Badge variant="secondary">
                                        {customer.orders} orders
                                    </Badge>
                                </CardAction>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
            <Dialog
                open={createOpen}
                onOpenChange={(open) => !form.processing && setCreateOpen(open)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title="New Customer"
                        closeDisabled={form.processing}
                    />
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-name">Name</Label>
                            <Input
                                id="customer-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-email">Email</Label>
                            <Input
                                id="customer-email"
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-company">Company</Label>
                            <Input
                                id="customer-company"
                                value={form.data.company}
                                onChange={(event) =>
                                    form.setData('company', event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-notes">Notes</Label>
                            <Textarea
                                id="customer-notes"
                                value={form.data.notes}
                                onChange={(event) =>
                                    form.setData('notes', event.target.value)
                                }
                            />
                        </div>
                    </div>
                    <AdminDialogFooter>
                        <Button
                            type="button"
                            onClick={save}
                            disabled={form.processing}
                        >
                            Create Customer
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
            <Dialog
                open={selected !== null}
                onOpenChange={(open) => !open && setSelected(null)}
            >
                {selected && (
                    <AdminDialogContent className="sm:max-w-xl">
                        <AdminDialogHeader
                            title={selected.name || 'Customer'}
                        />
                        <div className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <p className="text-muted-foreground text-xs">
                                        Email
                                    </p>
                                    <p className="text-sm">{selected.email}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">
                                        Company
                                    </p>
                                    <p className="text-sm">
                                        {selected.company || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">
                                        Last activity
                                    </p>
                                    <p className="text-sm">
                                        {formatDate(selected.lastActivity)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="outline">
                                    {selected.inquiries} inquiries
                                </Badge>
                                <Badge variant="outline">
                                    {selected.orders} orders
                                </Badge>
                            </div>
                            {selected.notes && (
                                <div>
                                    <p className="text-muted-foreground text-xs">
                                        Notes
                                    </p>
                                    <p className="text-sm whitespace-pre-wrap">
                                        {selected.notes}
                                    </p>
                                </div>
                            )}
                            <CustomerRecords
                                title="Inquiries"
                                records={selected.inquiryRecords}
                                empty="No inquiries recorded."
                            />
                            <CustomerRecords
                                title="Orders"
                                records={selected.orderRecords}
                                empty="No orders recorded."
                            />
                        </div>
                    </AdminDialogContent>
                )}
            </Dialog>
        </AdminWorkspaceLayout>
    );
}

function CustomerRecords({
    title,
    records,
    empty,
}: {
    title: string;
    records: RelatedRecord[];
    empty: string;
}) {
    return (
        <Collapsible defaultOpen className="rounded-md border">
            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium">
                <span>
                    {title} ({records.length})
                </span>
                <span className="text-muted-foreground text-xs">Toggle</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-3 py-2">
                <div className="space-y-2">
                    {records.length ? (
                        records.map((record) => (
                            <div
                                key={record.id}
                                className="flex items-center justify-between gap-3 rounded-md px-1 py-2 text-sm"
                            >
                                <div className="min-w-0">
                                    <div className="font-medium">
                                        {record.label}
                                    </div>
                                    <div className="text-muted-foreground truncate">
                                        {record.detail ||
                                            formatDate(record.date)}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Badge variant="outline">
                                        {record.status}
                                    </Badge>
                                    <Link
                                        className="text-primary text-xs hover:underline"
                                        href={record.href}
                                    >
                                        View
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground py-2 text-sm">
                            {empty}
                        </p>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
