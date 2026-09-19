import { router } from '@inertiajs/react';
import { useState } from 'react';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { formatAdminDateTime } from '@/lib/format-admin-date';
import { useAdminMutation } from '@/hooks/use-admin-mutation';

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

export type Lead = {
    id: string;
    type: 'contact' | 'quote';
    name: string | null;
    email: string;
    subject: string | null;
    message: string | null;
    date: string;
    handled: boolean;
};

const leadColumnLabels: Record<string, string> = {
    type: 'Type',
    name: 'Name',
    email: 'Email',
    date: 'Date',
    handled: 'Status',
};

const leadFeatures = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    globalFilteringFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: { includesString: filterFn_includesString },
});

function LeadStatus({ handled }: { handled: boolean }) {
    return (
        <Badge variant={handled ? 'secondary' : 'outline'}>
            {handled ? 'Handled' : 'Open'}
        </Badge>
    );
}

const leadColumnHelper = createColumnHelper<typeof leadFeatures, Lead>();
const leadColumns = leadColumnHelper.columns([
    leadColumnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => <span className="capitalize">{info.getValue()}</span>,
    }),
    leadColumnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
            <span className="line-clamp-1 max-w-48 whitespace-normal">
                {info.getValue() || '—'}
            </span>
        ),
    }),
    leadColumnHelper.accessor('email', { header: 'Email' }),
    leadColumnHelper.accessor('message', {
        header: 'Message',
        cell: (info) => (
            <span className="line-clamp-1 max-w-xs whitespace-normal">
                {info.getValue() || '—'}
            </span>
        ),
    }),
    leadColumnHelper.accessor('date', {
        header: 'Date',
        cell: (info) => formatAdminDateTime(info.getValue()),
    }),
    leadColumnHelper.accessor('handled', {
        header: 'Status',
        cell: (info) => <LeadStatus handled={info.getValue()} />,
    }),
]);

export type InquiriesProps = {
    leads: Lead[];
};

export function InquiriesManager({ leads }: InquiriesProps) {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { processing, run: runMutation } = useAdminMutation();

    const leadsTable = useTable({
        features: leadFeatures,
        columns: leadColumns,
        data: leads,
        globalFilterFn: 'includesString',
    });
    const selectedLead =
        leads.find((lead) => lead.id === selectedLeadId) ?? null;
    const sortableColumns = leadsTable
        .getAllColumns()
        .filter((column) => column.getCanSort() && leadColumnLabels[column.id]);

    function markHandled() {
        if (!selectedLead) return;

        setError(null);
        runMutation(
            (options) =>
                router.patch(
                    `/admin/inquiries/${selectedLead.id}`,
                    { handled: true },
                    options,
                ),
            {
                onError: () =>
                    setError(
                        'Could not update this inquiry. Please try again.',
                    ),
            },
        );
    }

    return (
        <AdminWorkspaceLayout
            title="Inquiries"
            description={PAGE_DESCRIPTION}
            headerAction={
                <>
                    <Input
                        placeholder="Search"
                        value={leadsTable.state.globalFilter ?? ''}
                        onChange={(event) =>
                            leadsTable.setGlobalFilter(event.target.value)
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
                                        {leadColumnLabels[column.id]}
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
                </>
            }
        >
            <Heading
                title="Inquiries"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            <DataTable
                table={leadsTable}
                onRowClick={(lead) => {
                    setSelectedLeadId(lead.id);
                    setError(null);
                }}
                showHeader={false}
            />

            <Dialog
                open={selectedLead !== null}
                onOpenChange={(open) => !open && setSelectedLeadId(null)}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedLead?.name || selectedLead?.email}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLead && (
                        <div className="grid gap-4 text-sm">
                            <dl className="grid grid-cols-2 gap-2">
                                <dt className="text-muted-foreground">Type</dt>
                                <dd className="capitalize">
                                    {selectedLead.type}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Subject
                                </dt>
                                <dd>{selectedLead.subject || '—'}</dd>
                                <dt className="text-muted-foreground">Email</dt>
                                <dd className="truncate">
                                    {selectedLead.email}
                                </dd>
                                <dt className="text-muted-foreground">Date</dt>
                                <dd>
                                    {formatAdminDateTime(selectedLead.date)}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Status
                                </dt>
                                <dd>
                                    <LeadStatus
                                        handled={selectedLead.handled}
                                    />
                                </dd>
                            </dl>

                            <div className="grid gap-1">
                                <span className="text-muted-foreground">
                                    Message
                                </span>
                                <span className="whitespace-pre-wrap">
                                    {selectedLead.message ||
                                        'No message provided.'}
                                </span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p role="alert" className="text-destructive text-sm">
                            {error}
                        </p>
                    )}
                    <DialogFooter className="border-t-0 bg-transparent pt-0">
                        <Button
                            variant="secondary"
                            disabled={processing || selectedLead?.handled}
                            onClick={markHandled}
                        >
                            {processing
                                ? 'Saving…'
                                : selectedLead?.handled
                                  ? 'Handled'
                                  : 'Mark Handled'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}
