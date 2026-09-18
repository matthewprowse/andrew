import { useState, type ReactNode } from 'react';
import { useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    LayoutGrid,
    Table as TableIcon,
} from 'lucide-react';
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
import {
    MediaPicker,
    type MediaPickerValue,
} from '@/components/admin/media-picker';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FeaturedServicesEditor } from '@/features/admin/services/featured-services-editor';
import type { ServiceRecord } from '@/types/service';
import type { ResourceItemAdminRecord } from '@/types/resource';

const PAGE_DESCRIPTION =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

const empty = {
    name: '',
    headline: '',
    slug: '',
    intro: '',
    banner_media_id: '' as number | '',
    cta_text: '',
    cta_description: '',
    cta_button_label: 'Request Consultation',
    cta_link: '/contact',
    sort_order: 0,
    status: 'Draft' as ServiceRecord['status'],
    rich_content: '',
    featured_services: [] as ServiceRecord['featured_services'],
    meta_title: '',
    meta_description: '',
};

const serviceColumnLabels: Record<string, string> = {
    name: 'Name',
    slug: 'Public URL',
    status: 'Status',
    updatedAt: 'Date',
};

const serviceTableFeatures = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
});

const serviceColumnHelper = createColumnHelper<
    typeof serviceTableFeatures,
    ServiceRecord
>();

const serviceColumns = serviceColumnHelper.columns([
    serviceColumnHelper.accessor('name', { header: 'Name' }),
    serviceColumnHelper.accessor('slug', { header: 'Public URL' }),
    serviceColumnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => (
            <Badge
                variant={info.getValue() === 'Live' ? 'secondary' : 'outline'}
            >
                {info.getValue()}
            </Badge>
        ),
    }),
    serviceColumnHelper.accessor('updatedAt', {
        header: 'Date',
        cell: (info) => formatDate(info.getValue()),
    }),
]);

function formatDate(iso: string) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function ServicesManager({
    services,
    resourceOptions,
}: {
    services: ServiceRecord[];
    resourceOptions: ResourceItemAdminRecord[];
}) {
    const form = useForm(empty);
    const [editing, setEditing] = useState<number | null>(null);
    const [open, setOpen] = useState(false);
    const [bannerImage, setBannerImage] = useState<MediaPickerValue>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

    const filteredServices = services.filter((service) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
            service.name.toLowerCase().includes(query) ||
            service.slug.toLowerCase().includes(query)
        );
    });

    const serviceTable = useTable({
        features: serviceTableFeatures,
        columns: serviceColumns,
        data: filteredServices,
    });
    const sortableColumns = serviceTable
        .getAllColumns()
        .filter(
            (column) => column.getCanSort() && serviceColumnLabels[column.id],
        );

    function edit(service?: ServiceRecord) {
        setEditing(service?.id ?? null);
        form.clearErrors();
        setBannerImage(service?.bannerImage ?? null);
        form.setData(
            service
                ? {
                      ...empty,
                      ...service,
                      banner_media_id: service.banner_media_id ?? '',
                      featured_services: service.featured_services ?? [],
                      meta_title: service.metaTitle ?? '',
                      meta_description: service.metaDescription ?? '',
                  }
                : { ...empty },
        );
        setOpen(true);
    }

    function save() {
        const options = { onSuccess: () => setOpen(false) };
        if (editing) form.patch(`/admin/services/${editing}`, options);
        else form.post('/admin/services', options);
    }

    const sections: {
        key: string;
        label?: string;
        description?: string;
        content: ReactNode;
    }[] = [
        {
            key: 'basics',
            label: 'Basics',
            content: (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="service-name">Name</Label>
                            <Input
                                id="service-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-url">Public URL</Label>
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground shrink-0 text-sm">
                                    /services/
                                </span>
                                <Input
                                    id="service-url"
                                    value={form.data.slug}
                                    onChange={(event) =>
                                        form.setData('slug', event.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="service-headline">Page Heading</Label>
                        <Input
                            id="service-headline"
                            value={form.data.headline}
                            onChange={(event) =>
                                form.setData('headline', event.target.value)
                            }
                            aria-describedby="service-headline-description"
                        />
                        <p
                            id="service-headline-description"
                            className="text-muted-foreground text-xs"
                        >
                            Lorem ipsum dolor sit amet, consectetur adipiscing
                            elit.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="service-intro">Description</Label>
                        <Textarea
                            id="service-intro"
                            value={form.data.intro}
                            onChange={(event) =>
                                form.setData('intro', event.target.value)
                            }
                        />
                    </div>
                    <MediaPicker
                        label="Banner Image"
                        accept="image"
                        value={bannerImage}
                        onChange={(media) => {
                            setBannerImage(media);
                            form.setData(
                                'banner_media_id',
                                media ? Number(media.id) : '',
                            );
                        }}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="service-sort-order">
                                Display Order
                            </Label>
                            <Input
                                id="service-sort-order"
                                type="number"
                                min="0"
                                value={form.data.sort_order}
                                onChange={(event) =>
                                    form.setData(
                                        'sort_order',
                                        Number(event.target.value),
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-status">Status</Label>
                            <Select
                                value={form.data.status}
                                onValueChange={(value) =>
                                    form.setData(
                                        'status',
                                        value as ServiceRecord['status'],
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="service-status"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Draft">Draft</SelectItem>
                                    <SelectItem value="Live">Live</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </>
            ),
        },
        {
            key: 'cta',
            content: (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="service-cta-text">CTA Heading</Label>
                        <Input
                            id="service-cta-text"
                            value={form.data.cta_text}
                            onChange={(event) =>
                                form.setData('cta_text', event.target.value)
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="service-cta-description">
                            CTA Description
                        </Label>
                        <Textarea
                            id="service-cta-description"
                            value={form.data.cta_description}
                            onChange={(event) =>
                                form.setData(
                                    'cta_description',
                                    event.target.value,
                                )
                            }
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="service-cta-button-label">
                                Button Label
                            </Label>
                            <Input
                                id="service-cta-button-label"
                                value={form.data.cta_button_label}
                                onChange={(event) =>
                                    form.setData(
                                        'cta_button_label',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-cta-link">
                                Button Destination
                            </Label>
                            <Input
                                id="service-cta-link"
                                value={form.data.cta_link}
                                onChange={(event) =>
                                    form.setData('cta_link', event.target.value)
                                }
                            />
                        </div>
                    </div>
                </>
            ),
        },
        {
            key: 'rich-content',
            label: 'Rich Content',
            description: PAGE_DESCRIPTION,
            content: (
                <RichTextEditor
                    value={form.data.rich_content}
                    onChange={(value) => form.setData('rich_content', value)}
                />
            ),
        },
        {
            key: 'featured-services',
            label: 'Featured Services',
            description: PAGE_DESCRIPTION,
            content: (
                <FeaturedServicesEditor
                    value={form.data.featured_services}
                    resourceOptions={resourceOptions}
                    onChange={(value) =>
                        form.setData('featured_services', value)
                    }
                />
            ),
        },
        {
            key: 'seo',
            content: (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="service-meta-title">Meta Title</Label>
                        <Input
                            id="service-meta-title"
                            maxLength={255}
                            value={form.data.meta_title}
                            onChange={(event) =>
                                form.setData('meta_title', event.target.value)
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="service-meta-description">
                            Meta Description
                        </Label>
                        <Textarea
                            id="service-meta-description"
                            maxLength={320}
                            value={form.data.meta_description}
                            onChange={(event) =>
                                form.setData(
                                    'meta_description',
                                    event.target.value,
                                )
                            }
                        />
                    </div>
                </>
            ),
        },
    ];

    return (
        <AdminWorkspaceLayout
            title="Services"
            description={PAGE_DESCRIPTION}
            headerAction={
                <>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        value={viewMode}
                        onValueChange={(value) => {
                            if (value) setViewMode(value as 'table' | 'cards');
                        }}
                    >
                        <ToggleGroupItem value="table" aria-label="Table view">
                            <TableIcon className="size-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="cards" aria-label="Card view">
                            <LayoutGrid className="size-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Input
                        placeholder="Search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
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
                                        {serviceColumnLabels[column.id]}
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
                        onClick={() => edit()}
                    >
                        New Service
                    </Button>
                </>
            }
        >
            <Heading
                title="Services"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            {serviceTable.getRowModel().rows.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {services.length === 0
                        ? 'No services yet. Add one to get started.'
                        : 'No services match your search.'}
                </p>
            ) : viewMode === 'table' ? (
                <DataTable
                    table={serviceTable}
                    onRowClick={edit}
                    showHeader={false}
                />
            ) : (
                <div className="grid gap-3 lg:grid-cols-4">
                    {serviceTable
                        .getRowModel()
                        .rows.map(({ original: service }) => (
                            <Card
                                key={service.slug}
                                size="sm"
                                role="button"
                                tabIndex={0}
                                className="cursor-pointer"
                                onClick={() => edit(service)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.preventDefault();
                                        edit(service);
                                    }
                                }}
                            >
                                <CardHeader>
                                    <CardTitle>{service.name}</CardTitle>
                                    <CardDescription className="font-mono text-xs">
                                        /services/{service.slug}
                                    </CardDescription>
                                    <CardAction>
                                        <Badge variant="secondary">
                                            {service.status}
                                        </Badge>
                                    </CardAction>
                                </CardHeader>
                            </Card>
                        ))}
                </div>
            )}
            <Dialog
                open={open}
                onOpenChange={(value) => {
                    if (!form.processing) setOpen(value);
                }}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={
                            editing
                                ? form.data.name || 'Service'
                                : 'New Service'
                        }
                        closeDisabled={form.processing}
                    />
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            save();
                        }}
                        className="space-y-4"
                    >
                        {sections[0].content}
                        {sections.slice(1).map((section) => (
                            <div key={section.key} className="space-y-4">
                                <Separator />
                                {(section.label || section.description) && (
                                    <div className="space-y-0.5">
                                        {section.label && (
                                            <p className="text-sm font-medium">
                                                {section.label}
                                            </p>
                                        )}
                                        {section.description && (
                                            <p className="text-muted-foreground text-xs">
                                                {section.description}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {section.content}
                            </div>
                        ))}
                        {Object.keys(form.errors).length > 0 && (
                            <div
                                role="alert"
                                className="text-destructive text-sm"
                            >
                                {Object.entries(form.errors).map(
                                    ([key, message]) => (
                                        <p key={key}>{message}</p>
                                    ),
                                )}
                            </div>
                        )}
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
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={form.processing}
                            >
                                {form.processing ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}
