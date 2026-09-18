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
import { MediaPicker } from '@/components/admin/media-picker';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
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
import type { TeamMemberAdminRecord } from '@/types/team';
import type { ResourceMediaRef } from '@/types/resource';

type Draft = {
    name: string;
    role: string;
    bio: string;
    photo: ResourceMediaRef;
    status: 'Draft' | 'Live';
    sortOrder: number;
};

const emptyDraft: Draft = {
    name: '',
    role: '',
    bio: '',
    photo: null,
    status: 'Draft',
    sortOrder: 0,
};

const columnLabels: Record<string, string> = {
    name: 'Name',
    role: 'Job title',
    status: 'Status',
    sortOrder: 'Display order',
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

const helper = createColumnHelper<typeof features, TeamMemberAdminRecord>();
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('role', { header: 'Job title' }),
    helper.accessor('status', { header: 'Status' }),
    helper.accessor('sortOrder', { header: 'Display order' }),
]);

export type TeamManagerHandle = { openCreate: () => void };

export function TeamManager({
    members,
    ref,
    hideToolbar = false,
}: {
    members: TeamMemberAdminRecord[];
    ref?: React.Ref<TeamManagerHandle>;
    hideToolbar?: boolean;
}) {
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedMember, setSelectedMember] =
        useState<TeamMemberAdminRecord | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft>(emptyDraft);

    const table = useTable({
        features,
        columns,
        data: members,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    function openCreate() {
        setErrors({});
        setEditingId(null);
        setDraft({ ...emptyDraft, sortOrder: members.length + 1 });
        setIsFormOpen(true);
    }

    useImperativeHandle(ref, () => ({ openCreate }));

    function openEdit(member: TeamMemberAdminRecord) {
        setErrors({});
        setEditingId(member.id);
        setDraft({
            name: member.name,
            role: member.role,
            bio: member.bio,
            photo: member.photo,
            status: member.status === 'Published' ? 'Live' : 'Draft',
            sortOrder: member.sortOrder,
        });
        setSelectedMember(null);
        setIsFormOpen(true);
    }

    function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function handleSave() {
        setProcessing(true);
        setErrors({});
        const payload = {
            name: draft.name,
            role: draft.role,
            bio: draft.bio,
            photo_media_id: draft.photo?.id ?? '',
            status: draft.status === 'Live' ? 'published' : 'draft',
            sort_order: draft.sortOrder,
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => setIsFormOpen(false),
            onError: (validationErrors: Record<string, string>) =>
                setErrors(validationErrors),
            onFinish: () => setProcessing(false),
        };
        if (editingId)
            router.patch(`/admin/team/${editingId}`, payload, options);
        else router.post('/admin/team', payload, options);
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
            )}

            <DataTable
                table={table}
                onRowClick={setSelectedMember}
                showHeader={!hideToolbar}
            />

            <Dialog
                open={selectedMember !== null}
                onOpenChange={(open) => !open && setSelectedMember(null)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader title={selectedMember?.name} />
                    {selectedMember && (
                        <div className="grid gap-4 text-sm">
                            <dl className="grid grid-cols-2 gap-2">
                                <dt className="text-muted-foreground">
                                    Job Title
                                </dt>
                                <dd>{selectedMember.role}</dd>
                                <dt className="text-muted-foreground">
                                    Status
                                </dt>
                                <dd>
                                    {selectedMember.status === 'Published'
                                        ? 'Live'
                                        : 'Draft'}
                                </dd>
                            </dl>
                            <div className="grid gap-1">
                                <span className="text-muted-foreground">
                                    Bio
                                </span>
                                <span className="whitespace-pre-wrap">
                                    {selectedMember.bio || '—'}
                                </span>
                            </div>
                        </div>
                    )}
                    <AdminDialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                selectedMember && openEdit(selectedMember)
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
                                ? draft.name || 'Team Member'
                                : 'New Team Member'
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
                        <div className="grid gap-2">
                            <Label htmlFor="team-name">Name</Label>
                            <Input
                                id="team-name"
                                value={draft.name}
                                onChange={(event) =>
                                    updateDraft('name', event.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="team-role">Job Title</Label>
                            <Input
                                id="team-role"
                                value={draft.role}
                                onChange={(event) =>
                                    updateDraft('role', event.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="team-bio">Bio</Label>
                            <Textarea
                                id="team-bio"
                                className="field-sizing-fixed"
                                value={draft.bio}
                                onChange={(event) =>
                                    updateDraft('bio', event.target.value)
                                }
                            />
                        </div>
                        <MediaPicker
                            label="Photo"
                            accept="image"
                            value={draft.photo}
                            onChange={(value) => updateDraft('photo', value)}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Publication Status</Label>
                                <Select
                                    value={draft.status}
                                    onValueChange={(value) =>
                                        updateDraft(
                                            'status',
                                            value as Draft['status'],
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
                            <div className="grid gap-2">
                                <Label htmlFor="team-sort-order">
                                    Display Order
                                </Label>
                                <Input
                                    id="team-sort-order"
                                    type="number"
                                    min={0}
                                    value={draft.sortOrder}
                                    onChange={(event) =>
                                        updateDraft(
                                            'sortOrder',
                                            Number(event.target.value),
                                        )
                                    }
                                />
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
