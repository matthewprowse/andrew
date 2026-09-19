import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
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
import Heading from '@/components/heading';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { formatAdminDateTime as formatDate } from '@/lib/format-admin-date';
import { useAdminMutation } from '@/hooks/use-admin-mutation';

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

export type OrderStatus =
    | 'pending'
    | 'paid'
    | 'refunded'
    | 'cancelled'
    | 'request';

export type OrderTransaction = {
    id: string;
    type: 'capture' | 'refund';
    status: 'completed' | 'failed';
    amount: string;
    gatewayTransactionId: string;
    reason: string;
    actorName: string | null;
    date: string;
};

export type Order = {
    id: string;
    reference: string;
    resourceTitle: string;
    buyerName: string;
    email: string;
    company: string;
    payerName: string;
    payerEmail: string;
    amountCents: number;
    amount: string;
    status: OrderStatus;
    gateway: string;
    gatewayOrderId: string;
    date: string;
    paidAt: string | null;
    refundedAt: string | null;
    anonymized: boolean;
    transactions: OrderTransaction[];
    demo?: boolean;
};

export type OrdersProps = {
    orders: Order[];
    resourceRequests?: ResourceRequest[];
};

type ResourceRequest = {
    id: string;
    resourceTitle: string;
    name: string | null;
    email: string;
    company: string;
    date: string;
    verified: boolean;
    demo?: boolean;
};

type ResourceRequestRow = ResourceRequest & {
    kind: 'resource-request';
    rowKey: string;
    reference: string;
    buyerName: string;
    amountCents: null;
    amount: null;
    status: 'request';
    gateway: null;
};

type OrderRow =
    | (Order & { kind: 'order'; rowKey: string })
    | ResourceRequestRow;

function toOrderRow(order: Order): OrderRow {
    return { ...order, kind: 'order', rowKey: `order:${order.id}` };
}

function toResourceRequestRow(request: ResourceRequest): ResourceRequestRow {
    return {
        ...request,
        kind: 'resource-request',
        rowKey: `resource-request:${request.id}`,
        reference: `Request #${request.id}`,
        buyerName: request.name || '',
        amountCents: null,
        amount: null,
        status: 'request',
        gateway: null,
    };
}

const demoResourceRequests: ResourceRequest[] = [
    {
        id: 'demo-resource-request-1',
        resourceTitle: 'Relocation Guide',
        name: 'Matthew Prowse',
        email: 'matthew.prowse@example.com',
        company: 'Andrew',
        date: '2026-09-17T08:30:00+02:00',
        verified: true,
        demo: true,
    },
    {
        id: 'demo-resource-request-2',
        resourceTitle: 'Moving Checklist',
        name: 'Matthew Prowse',
        email: 'matthew.prowse@example.com',
        company: 'Andrew',
        date: '2026-09-16T14:15:00+02:00',
        verified: false,
        demo: true,
    },
    {
        id: 'demo-resource-request-3',
        resourceTitle: 'Destination Handbook',
        name: 'Matthew Prowse',
        email: 'matthew.prowse@example.com',
        company: 'Andrew',
        date: '2026-09-15T10:00:00+02:00',
        verified: true,
        demo: true,
    },
];

const demoOrders: Order[] = [
    {
        id: 'demo-order-1',
        reference: 'DEMO-0001',
        resourceTitle: 'Relocation Guide',
        buyerName: 'Matthew Prowse',
        email: 'matthew.prowse@example.com',
        company: 'Andrew',
        payerName: 'Matthew Prowse',
        payerEmail: 'matthew.prowse@example.com',
        amountCents: 4900,
        amount: 'US$49.00',
        status: 'paid',
        gateway: 'fake',
        gatewayOrderId: 'demo-paypal-order-1',
        date: '2026-09-17T09:00:00+02:00',
        paidAt: '2026-09-17T09:01:00+02:00',
        refundedAt: null,
        anonymized: false,
        demo: true,
        transactions: [
            {
                id: 'demo-transaction-1',
                type: 'capture',
                status: 'completed',
                amount: 'US$49.00',
                gatewayTransactionId: 'demo-capture-1',
                reason: '',
                actorName: null,
                date: '2026-09-17T09:01:00+02:00',
            },
        ],
    },
    {
        id: 'demo-order-2',
        reference: 'DEMO-0002',
        resourceTitle: 'Moving Checklist',
        buyerName: 'Matthew Prowse',
        email: 'matthew.prowse@example.com',
        company: 'Andrew',
        payerName: 'Matthew Prowse',
        payerEmail: 'matthew.prowse@example.com',
        amountCents: 1900,
        amount: 'US$19.00',
        status: 'pending',
        gateway: 'fake',
        gatewayOrderId: 'demo-paypal-order-2',
        date: '2026-09-16T15:30:00+02:00',
        paidAt: null,
        refundedAt: null,
        anonymized: false,
        demo: true,
        transactions: [],
    },
    {
        id: 'demo-order-3',
        reference: 'DEMO-0003',
        resourceTitle: 'Destination Handbook',
        buyerName: 'Matthew Prowse',
        email: 'matthew.prowse@example.com',
        company: 'Andrew',
        payerName: 'Matthew Prowse',
        payerEmail: 'matthew.prowse@example.com',
        amountCents: 2900,
        amount: 'US$29.00',
        status: 'refunded',
        gateway: 'fake',
        gatewayOrderId: 'demo-paypal-order-3',
        date: '2026-09-15T11:15:00+02:00',
        paidAt: '2026-09-15T11:16:00+02:00',
        refundedAt: '2026-09-16T08:45:00+02:00',
        anonymized: false,
        demo: true,
        transactions: [
            {
                id: 'demo-transaction-3-capture',
                type: 'capture',
                status: 'completed',
                amount: 'US$29.00',
                gatewayTransactionId: 'demo-capture-3',
                reason: '',
                actorName: null,
                date: '2026-09-15T11:16:00+02:00',
            },
            {
                id: 'demo-transaction-3-refund',
                type: 'refund',
                status: 'completed',
                amount: 'US$29.00',
                gatewayTransactionId: 'demo-refund-3',
                reason: 'Demo refund',
                actorName: 'Matthew Prowse',
                date: '2026-09-16T08:45:00+02:00',
            },
        ],
    },
];

const statusLabels: Record<OrderStatus, string> = {
    pending: 'Pending',
    paid: 'Paid',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
    request: 'Request',
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

const helper = createColumnHelper<typeof features, OrderRow>();
const columns = helper.columns([
    helper.accessor('reference', {
        header: 'Order',
        cell: (info) => (
            <span className="font-medium tabular-nums">
                {info.row.original.kind === 'resource-request'
                    ? `Request #${info.row.original.id}`
                    : info.getValue()}
            </span>
        ),
    }),
    helper.accessor('date', {
        header: 'Date',
        cell: (info) => formatDate(info.getValue()),
    }),
    helper.accessor('email', {
        header: 'Buyer',
        cell: (info) => (
            <span className="block max-w-56 truncate">
                {info.row.original.buyerName || info.getValue()}
            </span>
        ),
    }),
    helper.accessor('resourceTitle', { header: 'Resource' }),
    helper.accessor('amountCents', {
        header: 'Amount',
        cell: (info) => (
            <span className="tabular-nums">
                {info.row.original.amount || '—'}
            </span>
        ),
    }),
    helper.accessor('status', {
        header: 'Status',
        cell: (info) => (
            <span className="flex items-center gap-1.5">
                <OrderStatusBadge status={info.getValue()} />
                {info.row.original.kind === 'order' &&
                    info.row.original.gateway === 'fake' && (
                        <Badge variant="outline">Test</Badge>
                    )}
            </span>
        ),
    }),
]);

function OrderStatusBadge({ status }: { status: OrderStatus }) {
    const variant =
        status === 'paid'
            ? 'default'
            : status === 'refunded'
              ? 'destructive'
              : status === 'pending'
                ? 'outline'
                : 'secondary';

    return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}

type Confirming = 'refund' | 'forget' | null;

export function OrdersManager({ orders, resourceRequests }: OrdersProps) {
    const { adminPermissions } = usePage().props.auth;
    const { url } = usePage();
    const canResend = Boolean(adminPermissions.orders?.edit);
    const canRefund = Boolean(adminPermissions.orders?.delete);

    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(
        'all',
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<Confirming>(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { processing, run: runMutation } = useAdminMutation();
    const allOrders = useMemo<OrderRow[]>(
        () => [
            ...demoOrders.map(toOrderRow),
            ...orders.map(toOrderRow),
            ...demoResourceRequests.map(toResourceRequestRow),
            ...(resourceRequests ?? []).map(toResourceRequestRow),
        ],
        [orders, resourceRequests],
    );

    const filteredOrders = useMemo(
        () =>
            statusFilter === 'all'
                ? allOrders
                : allOrders.filter((order) => order.status === statusFilter),
        [allOrders, statusFilter],
    );
    const table = useTable({
        features,
        columns,
        data: filteredOrders,
        getRowId: (row) => row.rowKey,
        globalFilterFn: 'includesString',
    });
    const selected =
        allOrders.find((order) => order.rowKey === selectedId) ?? null;

    useEffect(() => {
        const orderId = new URLSearchParams(url.split('?')[1] ?? '').get(
            'order',
        );
        if (
            orderId &&
            allOrders.some((order) => order.rowKey === `order:${orderId}`)
        ) {
            setSelectedId(`order:${orderId}`);
        }
    }, [orders, url]);
    function close() {
        setSelectedId(null);
        setConfirming(null);
        setReason('');
        setError(null);
    }

    function run(
        method: 'post' | 'patch',
        url: string,
        data: Record<string, string>,
        onSuccess?: () => void,
    ) {
        setError(null);
        runMutation((options) => router[method](url, data, options), {
            onSuccess: () => {
                setConfirming(null);
                setReason('');
                onSuccess?.();
            },
            onError: (errors) =>
                setError(
                    errors.order ??
                        errors.reason ??
                        'Something went wrong. Please try again.',
                ),
        });
    }

    return (
        <AdminWorkspaceLayout
            title="Orders"
            description={PAGE_DESCRIPTION}
            headerAction={
                <>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) =>
                            setStatusFilter(value as OrderStatus | 'all')
                        }
                    >
                        <SelectTrigger
                            className="h-8 w-40"
                            aria-label="Filter by status"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {(Object.keys(statusLabels) as OrderStatus[]).map(
                                (status) => (
                                    <SelectItem key={status} value={status}>
                                        {statusLabels[status]}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Search orders and requests"
                        value={table.state.globalFilter ?? ''}
                        onChange={(event) =>
                            table.setGlobalFilter(event.target.value)
                        }
                        className="h-8 w-72"
                    />
                </>
            }
        >
            <Heading
                title="Orders"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            <div className="mt-6">
                <DataTable
                    table={table}
                    onRowClick={(row) => {
                        setSelectedId(row.rowKey);
                        setConfirming(null);
                        setError(null);
                    }}
                />
            </div>

            <Dialog
                open={selected !== null}
                onOpenChange={(open) => !open && close()}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selected?.kind === 'resource-request'
                                ? `Resource Request #${selected.id}`
                                : `Order ${selected?.reference}`}
                        </DialogTitle>
                    </DialogHeader>

                    {selected &&
                        (selected.kind === 'resource-request' ? (
                            <div className="grid gap-5 text-sm">
                                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                                    <dt className="text-muted-foreground">
                                        Status
                                    </dt>
                                    <dd className="flex items-center gap-1.5">
                                        <OrderStatusBadge status="request" />
                                        {selected.verified
                                            ? 'Verified'
                                            : 'Pending Verification'}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        Resource
                                    </dt>
                                    <dd>{selected.resourceTitle}</dd>
                                    <dt className="text-muted-foreground">
                                        Customer
                                    </dt>
                                    <dd>{selected.name || '—'}</dd>
                                    <dt className="text-muted-foreground">
                                        Email
                                    </dt>
                                    <dd className="truncate">
                                        {selected.email}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        Company
                                    </dt>
                                    <dd>{selected.company || '—'}</dd>
                                    <dt className="text-muted-foreground">
                                        Submitted
                                    </dt>
                                    <dd>{formatDate(selected.date)}</dd>
                                </dl>
                                {selected.demo ? (
                                    <p className="text-muted-foreground">
                                        Demo Request Rendered From Code For UI
                                        Testing.
                                    </p>
                                ) : (
                                    <DialogFooter className="border-t-0 bg-transparent pt-0">
                                        <Button
                                            variant="ghost"
                                            disabled={processing || !canRefund}
                                            onClick={() =>
                                                run(
                                                    'patch',
                                                    `/admin/orders/resource-requests/${selected.id}/forget`,
                                                    {},
                                                )
                                            }
                                        >
                                            Forget Customer
                                        </Button>
                                    </DialogFooter>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-5 text-sm">
                                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                                    <dt className="text-muted-foreground">
                                        Status
                                    </dt>
                                    <dd className="flex items-center gap-1.5">
                                        <OrderStatusBadge
                                            status={selected.status}
                                        />
                                        {selected.gateway === 'fake' && (
                                            <Badge variant="outline">
                                                Test payment
                                            </Badge>
                                        )}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        Resource
                                    </dt>
                                    <dd>{selected.resourceTitle}</dd>
                                    <dt className="text-muted-foreground">
                                        Amount
                                    </dt>
                                    <dd className="tabular-nums">
                                        {selected.amount}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        Buyer
                                    </dt>
                                    <dd>
                                        {selected.anonymized
                                            ? 'Forgotten'
                                            : selected.buyerName || '—'}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        Email
                                    </dt>
                                    <dd className="truncate">
                                        {selected.email}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        Company
                                    </dt>
                                    <dd>{selected.company || '—'}</dd>
                                    {selected.payerEmail &&
                                        selected.payerEmail !==
                                            selected.email && (
                                            <>
                                                <dt className="text-muted-foreground">
                                                    Payer
                                                </dt>
                                                <dd className="truncate">
                                                    {selected.payerName}{' '}
                                                    {selected.payerEmail}
                                                </dd>
                                            </>
                                        )}
                                    <dt className="text-muted-foreground">
                                        Created
                                    </dt>
                                    <dd>{formatDate(selected.date)}</dd>
                                    <dt className="text-muted-foreground">
                                        Paid
                                    </dt>
                                    <dd>{formatDate(selected.paidAt)}</dd>
                                    {selected.refundedAt && (
                                        <>
                                            <dt className="text-muted-foreground">
                                                Refunded
                                            </dt>
                                            <dd>
                                                {formatDate(
                                                    selected.refundedAt,
                                                )}
                                            </dd>
                                        </>
                                    )}
                                    <dt className="text-muted-foreground">
                                        Provider ID
                                    </dt>
                                    <dd className="truncate tabular-nums">
                                        {selected.gatewayOrderId || '—'}
                                    </dd>
                                </dl>

                                <section className="grid gap-2">
                                    <h3 className="font-medium">
                                        Payment history
                                    </h3>
                                    {selected.transactions.length === 0 ? (
                                        <p className="text-muted-foreground">
                                            No payments recorded yet.
                                        </p>
                                    ) : (
                                        <ul className="divide-y rounded-md border">
                                            {selected.transactions.map(
                                                (entry) => (
                                                    <li
                                                        key={entry.id}
                                                        className="grid gap-0.5 px-3 py-2"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="capitalize">
                                                                {entry.type ===
                                                                'capture'
                                                                    ? 'Payment'
                                                                    : 'Refund'}
                                                                {entry.status ===
                                                                    'failed' &&
                                                                    ' (failed)'}
                                                            </span>
                                                            <span className="tabular-nums">
                                                                {entry.type ===
                                                                'refund'
                                                                    ? `−${entry.amount}`
                                                                    : entry.amount}
                                                            </span>
                                                        </div>
                                                        <span className="text-muted-foreground text-xs">
                                                            {formatDate(
                                                                entry.date,
                                                            )}
                                                            {entry.actorName &&
                                                                ` · by ${entry.actorName}`}
                                                            {entry.gatewayTransactionId &&
                                                                ` · ${entry.gatewayTransactionId}`}
                                                        </span>
                                                        {entry.reason && (
                                                            <span className="text-muted-foreground text-xs">
                                                                Reason:{' '}
                                                                {entry.reason}
                                                            </span>
                                                        )}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}
                                </section>

                                {confirming === 'refund' && (
                                    <section className="grid gap-2 rounded-md border p-3">
                                        <p className="font-medium">
                                            Refund {selected.amount} in full?
                                        </p>
                                        <p className="text-muted-foreground">
                                            The buyer loses access immediately
                                            and receives a refund email. This
                                            can't be undone.
                                        </p>
                                        <Label htmlFor="refund-reason">
                                            Reason (optional)
                                        </Label>
                                        <Textarea
                                            id="refund-reason"
                                            value={reason}
                                            maxLength={500}
                                            onChange={(event) =>
                                                setReason(event.target.value)
                                            }
                                        />
                                    </section>
                                )}

                                {confirming === 'forget' && (
                                    <section className="grid gap-1 rounded-md border p-3">
                                        <p className="font-medium">
                                            Forget this buyer?
                                        </p>
                                        <p className="text-muted-foreground">
                                            Their name and email are removed.
                                            The amount and payment history are
                                            kept for accounting.
                                        </p>
                                    </section>
                                )}
                            </div>
                        ))}

                    {error && (
                        <p role="alert" className="text-destructive text-sm">
                            {error}
                        </p>
                    )}

                    {selected?.kind === 'order' && (
                        <DialogFooter className="flex-wrap gap-2 border-t-0 bg-transparent pt-0">
                            {confirming === null && (
                                <>
                                    {canRefund &&
                                        !selected.anonymized &&
                                        !selected.demo && (
                                            <Button
                                                variant="ghost"
                                                disabled={processing}
                                                onClick={() =>
                                                    setConfirming('forget')
                                                }
                                            >
                                                Forget Buyer
                                            </Button>
                                        )}
                                    {canResend &&
                                        selected.status === 'paid' &&
                                        !selected.anonymized &&
                                        !selected.demo && (
                                            <Button
                                                variant="secondary"
                                                disabled={processing}
                                                onClick={() =>
                                                    run(
                                                        'post',
                                                        `/admin/orders/${selected.id}/resend`,
                                                        {},
                                                    )
                                                }
                                            >
                                                Resend Access Link
                                            </Button>
                                        )}
                                    {canRefund &&
                                        !selected.demo &&
                                        selected.status === 'paid' && (
                                            <Button
                                                variant="destructive"
                                                disabled={processing}
                                                onClick={() =>
                                                    setConfirming('refund')
                                                }
                                            >
                                                Refund
                                            </Button>
                                        )}
                                </>
                            )}
                            {confirming !== null && (
                                <>
                                    <Button
                                        variant="ghost"
                                        disabled={processing}
                                        onClick={() => {
                                            setConfirming(null);
                                            setError(null);
                                        }}
                                    >
                                        Keep Order
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        disabled={processing}
                                        onClick={() =>
                                            confirming === 'refund'
                                                ? run(
                                                      'post',
                                                      `/admin/orders/${selected.id}/refund`,
                                                      { reason },
                                                  )
                                                : run(
                                                      'patch',
                                                      `/admin/orders/${selected.id}/forget`,
                                                      {},
                                                  )
                                        }
                                    >
                                        {processing
                                            ? 'Working…'
                                            : confirming === 'refund'
                                              ? `Refund ${selected.amount}`
                                              : 'Forget Buyer'}
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}
