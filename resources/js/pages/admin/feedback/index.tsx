import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    columnFilteringFeature,
    createColumnHelper,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    filterFn_equalsString,
    filterFn_includesString,
    globalFilteringFeature,
    rowPaginationFeature,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { AdminSortMenu } from '@/components/admin/admin-table-toolbar';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

type FeedbackAttachment = {
    id: string;
    fileName: string;
    url: string;
};

type FeedbackEntry = {
    id: string;
    type: string;
    status: 'open' | 'resolved';
    message: string;
    pageUrl: string;
    userAgent: string;
    userName: string;
    userEmail: string;
    createdAt: string;
    attachments: FeedbackAttachment[];
};

const TYPE_LABELS: Record<string, string> = {
    bug: 'Bug',
    feature: 'Feature Request',
    content_change: 'Content Change',
    other: 'Other',
};

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

const columnLabels: Record<string, string> = {
    userName: 'From',
    type: 'Type',
    message: 'Message',
    createdAt: 'Date',
    status: 'Status',
};

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

function formatDate(iso: string): string {
    const date = new Date(iso);
    const day = String(date.getDate()).padStart(2, '0');
    return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const features = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    rowPaginationFeature,
    globalFilteringFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: {
        includesString: filterFn_includesString,
        equalsString: filterFn_equalsString,
    },
});

export default function FeedbackIndex({
    feedback,
}: {
    feedback: FeedbackEntry[];
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = feedback.find((entry) => entry.id === selectedId) ?? null;
    const [processing, setProcessing] = useState(false);

    function setStatus(entry: FeedbackEntry, status: FeedbackEntry['status']) {
        setProcessing(true);
        router.patch(
            `/admin/feedback/${entry.id}`,
            { status },
            { preserveScroll: true, onFinish: () => setProcessing(false) },
        );
    }

    const helper = createColumnHelper<typeof features, FeedbackEntry>();
    const columns = helper.columns([
        helper.accessor('userName', {
            header: 'From',
            cell: (info) => (
                <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                        <AvatarFallback className="bg-secondary" />
                    </Avatar>
                    <span>{info.getValue()}</span>
                </div>
            ),
        }),
        helper.accessor('type', {
            header: 'Type',
            filterFn: 'equalsString',
            cell: (info) => (
                <Badge variant="secondary">
                    {TYPE_LABELS[info.getValue()] ?? info.getValue()}
                </Badge>
            ),
        }),
        helper.accessor('message', {
            header: 'Message',
            cell: (info) => (
                <span className="line-clamp-1 max-w-md whitespace-normal">
                    {info.getValue()}
                </span>
            ),
        }),
        helper.accessor('createdAt', {
            header: 'Date',
            cell: (info) => formatDate(info.getValue()),
        }),
        helper.accessor('status', {
            header: 'Status',
            filterFn: 'equalsString',
            cell: (info) => (
                <Badge
                    variant={
                        info.getValue() === 'resolved' ? 'secondary' : 'outline'
                    }
                >
                    {info.getValue() === 'resolved' ? 'Resolved' : 'Open'}
                </Badge>
            ),
        }),
    ]);

    const table = useTable({
        features,
        columns,
        data: feedback,
        getRowId: (row) => row.id,
        globalFilterFn: 'includesString',
        initialState: {
            pagination: { pageIndex: 0, pageSize: 25 },
        },
    });

    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort() && columnLabels[column.id]);

    return (
        <AdminWorkspaceLayout
            title="Feedback"
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
                    <AdminSortMenu
                        columns={sortableColumns}
                        labels={columnLabels}
                        align="end"
                        variant="secondary"
                    />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="secondary">Filter</Button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="end"
                            sideOffset={8}
                            className="grid w-56 gap-3 p-3"
                        >
                            <div className="grid gap-1.5">
                                <span className="text-muted-foreground text-xs font-medium">
                                    Type
                                </span>
                                <Select
                                    value={
                                        (table
                                            .getColumn('type')
                                            ?.getFilterValue() as string) ??
                                        'all'
                                    }
                                    onValueChange={(value) =>
                                        table
                                            .getColumn('type')
                                            ?.setFilterValue(
                                                value === 'all'
                                                    ? undefined
                                                    : value,
                                            )
                                    }
                                >
                                    <SelectTrigger className="h-8 w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {Object.entries(TYPE_LABELS).map(
                                            ([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <span className="text-muted-foreground text-xs font-medium">
                                    Status
                                </span>
                                <Select
                                    value={
                                        (table
                                            .getColumn('status')
                                            ?.getFilterValue() as string) ??
                                        'all'
                                    }
                                    onValueChange={(value) =>
                                        table
                                            .getColumn('status')
                                            ?.setFilterValue(
                                                value === 'all'
                                                    ? undefined
                                                    : value,
                                            )
                                    }
                                >
                                    <SelectTrigger className="h-8 w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="open">
                                            Open
                                        </SelectItem>
                                        <SelectItem value="resolved">
                                            Resolved
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {table.state.columnFilters.length > 0 && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="justify-self-start"
                                    onClick={() =>
                                        table.resetColumnFilters(true)
                                    }
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </PopoverContent>
                    </Popover>
                </>
            }
        >
            <Heading title="Feedback" description={PAGE_DESCRIPTION} />

            <DataTable
                table={table}
                showHeader={false}
                onRowClick={(entry) => setSelectedId(entry.id)}
            />

            <div className="mt-3 flex items-center justify-between gap-4">
                <Select
                    value={String(table.state.pagination.pageSize)}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                >
                    <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size} Rows
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm">
                        {table.getRowModel().rows.length} of{' '}
                        {table.getFilteredRowModel().rows.length}
                    </span>
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
            </div>

            <Dialog
                open={selected !== null}
                onOpenChange={(open) => !open && setSelectedId(null)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={selected?.userName ?? 'Feedback'}
                    />

                    {selected && (
                        <div className="grid gap-4 text-sm">
                            <dl className="grid grid-cols-2 gap-2">
                                <dt className="text-muted-foreground">Type</dt>
                                <dd>
                                    {TYPE_LABELS[selected.type] ??
                                        selected.type}
                                </dd>
                                <dt className="text-muted-foreground">Email</dt>
                                <dd className="truncate">
                                    {selected.userEmail || '—'}
                                </dd>
                                <dt className="text-muted-foreground">Date</dt>
                                <dd>{formatDate(selected.createdAt)}</dd>
                            </dl>

                            <div className="grid gap-1">
                                <span className="text-muted-foreground">
                                    Message
                                </span>
                                <span className="whitespace-pre-wrap">
                                    {selected.message}
                                </span>
                            </div>

                            {selected.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selected.attachments.map((attachment) => (
                                        <a
                                            key={attachment.id}
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <img
                                                src={attachment.url}
                                                alt={attachment.fileName}
                                                className="size-20 rounded-md border object-cover"
                                            />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <AdminDialogFooter>
                        <Button
                            variant="outline"
                            disabled={processing}
                            onClick={() =>
                                selected &&
                                setStatus(
                                    selected,
                                    selected.status === 'resolved'
                                        ? 'open'
                                        : 'resolved',
                                )
                            }
                        >
                            {selected?.status === 'resolved'
                                ? 'Reopen'
                                : 'Mark Resolved'}
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}
