import { useMemo, useState } from 'react';
import {
    createColumnHelper,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { ResourceItemAdminRecord } from '@/types/resource';

export type FeaturedService = {
    name: string;
    description: string;
    resource_ids?: number[];
};

type FeaturedServiceRow = FeaturedService & { resourceCount: number };

const featuredServiceTableFeatures = tableFeatures({});
const featuredServiceColumnHelper = createColumnHelper<
    typeof featuredServiceTableFeatures,
    FeaturedServiceRow
>();
const featuredServiceColumns = featuredServiceColumnHelper.columns([
    featuredServiceColumnHelper.accessor('name', {
        header: 'Featured Service',
    }),
    featuredServiceColumnHelper.accessor('description', {
        header: 'Description',
        cell: (info) => info.getValue() || '—',
    }),
    featuredServiceColumnHelper.accessor('resourceCount', {
        header: 'Related Resources',
        cell: (info) => {
            const count = info.getValue();
            return count === 0 ? 'None linked' : `${count} linked`;
        },
    }),
]);
const resourceTableFeatures = tableFeatures({});
const resourceColumnHelper = createColumnHelper<
    typeof resourceTableFeatures,
    ResourceItemAdminRecord
>();

function titleCase(value: string): string {
    return value
        .replace(/[-_]+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const emptyDraft: FeaturedService = { name: '', description: '' };

/**
 * Data-table editor for a service's featured sub-services. Selecting a row
 * opens the same dialog used for creating a featured service, while the
 * related-resource picker is a second data table with highlighted selection.
 */
export function FeaturedServicesEditor({
    value,
    onChange,
    resourceOptions,
}: {
    value: FeaturedService[];
    onChange: (value: FeaturedService[]) => void;
    resourceOptions: ResourceItemAdminRecord[];
}) {
    const [dialogIndex, setDialogIndex] = useState<number | 'new' | null>(null);
    const [draft, setDraft] = useState<FeaturedService>(emptyDraft);

    const featuredServiceRows = useMemo<FeaturedServiceRow[]>(
        () =>
            value.map((service) => ({
                ...service,
                resourceCount: (service.resource_ids ?? []).filter((id) =>
                    resourceOptions.some(
                        (resource) => Number(resource.id) === id,
                    ),
                ).length,
            })),
        [resourceOptions, value],
    );
    const featuredServiceTable = useTable({
        features: featuredServiceTableFeatures,
        columns: featuredServiceColumns,
        data: featuredServiceRows,
    });
    const resourceColumns = useMemo(
        () =>
            resourceColumnHelper.columns([
                resourceColumnHelper.display({
                    id: 'selected',
                    header: '',
                    cell: ({ row }) => {
                        const selected = (draft.resource_ids ?? []).includes(
                            Number(row.original.id),
                        );
                        return (
                            <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) =>
                                    setDraft((current) => ({
                                        ...current,
                                        resource_ids: checked
                                            ? [
                                                  ...(current.resource_ids ??
                                                      []),
                                                  Number(row.original.id),
                                              ]
                                            : (
                                                  current.resource_ids ?? []
                                              ).filter(
                                                  (id) =>
                                                      id !==
                                                      Number(row.original.id),
                                              ),
                                    }))
                                }
                                aria-label={`Select ${titleCase(row.original.title)}`}
                            />
                        );
                    },
                }),
                resourceColumnHelper.display({
                    id: 'image',
                    header: '',
                    cell: ({ row }) =>
                        row.original.image ? (
                            <img
                                src={row.original.image.url}
                                alt=""
                                className="size-10 rounded object-cover"
                            />
                        ) : (
                            <div
                                className="bg-muted size-10 rounded"
                                aria-hidden="true"
                            />
                        ),
                }),
                resourceColumnHelper.accessor('title', {
                    header: 'Title',
                    cell: (info) => titleCase(info.getValue()),
                }),
                resourceColumnHelper.accessor('categoryTitle', {
                    header: 'Type',
                    cell: (info) =>
                        titleCase(info.getValue() || 'Uncategorised'),
                }),
            ]),
        [draft.resource_ids],
    );
    const resourceTable = useTable({
        features: resourceTableFeatures,
        columns: resourceColumns,
        data: resourceOptions,
    });

    function openEdit(index: number) {
        setDraft({ resource_ids: [], ...value[index] });
        setDialogIndex(index);
    }

    function openNew() {
        setDraft({ ...emptyDraft, resource_ids: [] });
        setDialogIndex('new');
    }

    function close() {
        setDialogIndex(null);
    }

    function save() {
        if (dialogIndex === null) return;

        onChange(
            dialogIndex === 'new'
                ? [...value, draft]
                : value.map((service, index) =>
                      index === dialogIndex ? draft : service,
                  ),
        );
        close();
    }

    function remove() {
        if (typeof dialogIndex !== 'number') return;

        onChange(value.filter((_, index) => index !== dialogIndex));
        close();
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={openNew}>
                    New Service
                </Button>
            </div>
            <DataTable
                table={featuredServiceTable}
                onRowClick={(row) => openEdit(featuredServiceRows.indexOf(row))}
            />
            <Dialog
                open={dialogIndex !== null}
                onOpenChange={(open) => {
                    if (!open) close();
                }}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={
                            dialogIndex === 'new'
                                ? 'New Service'
                                : draft.name || 'Service'
                        }
                    />
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="featured-service-name">Name</Label>
                            <Input
                                id="featured-service-name"
                                value={draft.name}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <Label>Related resources</Label>
                            </div>
                            {resourceOptions.length > 0 ? (
                                <DataTable
                                    table={resourceTable}
                                    rowClassName={(resource) =>
                                        (draft.resource_ids ?? []).includes(
                                            Number(resource.id),
                                        )
                                            ? 'bg-accent/60'
                                            : 'hover:bg-accent/30'
                                    }
                                />
                            ) : (
                                <p className="text-muted-foreground rounded-md border p-3 text-sm">
                                    No resources are available in the Content
                                    Library yet.
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="featured-service-description">
                                Description
                            </Label>
                            <Textarea
                                id="featured-service-description"
                                value={draft.description}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        description: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <AdminDialogFooter>
                        {typeof dialogIndex === 'number' && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="mr-auto"
                                onClick={remove}
                            >
                                Delete
                            </Button>
                        )}
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={save}
                        >
                            Save
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
        </div>
    );
}
