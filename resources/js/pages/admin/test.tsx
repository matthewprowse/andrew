import { useEffect, useRef, useState } from 'react';
import {
    createColumnHelper,
    createSortedRowModel,
    rowSortingFeature,
    sortFn_alphanumeric,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import { XIcon } from 'lucide-react';
import AdminTestLayout from '@/layouts/admin-test-layout';
import {
    MediaPicker,
    type MediaPickerValue,
} from '@/components/admin/media-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ServiceRecord } from '@/types/service';

type FeaturedService = {
    name: string;
    description: string;
};

const featuredServiceTableFeatures = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
});
const featuredServiceColumnHelper = createColumnHelper<
    typeof featuredServiceTableFeatures,
    FeaturedService
>();

function RichTextEditor({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [blockType, setBlockType] = useState('paragraph');

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    function format(command: string, commandValue?: string) {
        editorRef.current?.focus();
        document.execCommand(command, false, commandValue);
        onChange(editorRef.current?.innerHTML ?? '');
    }

    function applyBlockType(type: string) {
        const wasList = ['bulleted-list', 'numbered-list'].includes(blockType);

        editorRef.current?.focus();

        if (wasList && type !== 'bulleted-list' && type !== 'numbered-list') {
            document.execCommand(
                blockType === 'bulleted-list'
                    ? 'insertUnorderedList'
                    : 'insertOrderedList',
            );
        }

        switch (type) {
            case 'heading-1':
                format('formatBlock', '<h1>');
                break;
            case 'heading-2':
                format('formatBlock', '<h2>');
                break;
            case 'heading-3':
                format('formatBlock', '<h3>');
                break;
            case 'bulleted-list':
                format('insertUnorderedList');
                break;
            case 'numbered-list':
                format('insertOrderedList');
                break;
            default:
                format('formatBlock', '<p>');
        }

        setBlockType(type);
    }

    return (
        <div className="space-y-1">
            <div className="flex min-h-10 w-full items-center py-1">
                <Select value={blockType} onValueChange={applyBlockType}>
                    <SelectTrigger aria-label="Text style" className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectSeparator />
                        <SelectItem value="heading-1">Heading 1</SelectItem>
                        <SelectItem value="heading-2">Heading 2</SelectItem>
                        <SelectItem value="heading-3">Heading 3</SelectItem>
                        <SelectSeparator />
                        <SelectItem
                            value="bulleted-list"
                            disabled={[
                                'heading-1',
                                'heading-2',
                                'heading-3',
                            ].includes(blockType)}
                        >
                            Bulleted List
                        </SelectItem>
                        <SelectItem
                            value="numbered-list"
                            disabled={[
                                'heading-1',
                                'heading-2',
                                'heading-3',
                            ].includes(blockType)}
                        >
                            Numbered List
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label="Rich content"
                className="[&_a]:text-primary [&_blockquote]:border-primary [&_blockquote]:text-muted-foreground rounded-md border px-3 py-2 outline-none [&_a]:underline [&_b]:font-medium [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h1]:mt-5 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-medium [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_strong]:font-medium [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
                onInput={(event) => onChange(event.currentTarget.innerHTML)}
            />
        </div>
    );
}

export default function AdminTest({ services }: { services: ServiceRecord[] }) {
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [bannerImage, setBannerImage] = useState<MediaPickerValue>(null);
    const [richContent, setRichContent] = useState('');
    const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>(
        [],
    );
    const [featuredServiceDialog, setFeaturedServiceDialog] = useState<{
        index: number | null;
        service: FeaturedService;
    } | null>(null);
    const selectedServiceRecord = services.find(
        (service) => service.slug === selectedService,
    );
    const selectedServiceName = selectedServiceRecord?.name;

    function selectService(service: ServiceRecord) {
        setSelectedService(service.slug);
        setBannerImage(service.bannerImage ?? null);
        setRichContent(
            (service.scope ?? [])
                .map((section) =>
                    [section.heading, section.intro, ...(section.items ?? [])]
                        .filter(Boolean)
                        .join('\n\n'),
                )
                .join('\n\n'),
        );
        setFeaturedServices(
            (service.featured_primary ?? []).map((name) => ({
                name,
                description: '',
            })),
        );
    }

    function openFeaturedServiceDialog(
        index: number | null,
        service: FeaturedService = { name: '', description: '' },
    ) {
        setFeaturedServiceDialog({ index, service });
    }

    function saveFeaturedService() {
        if (!featuredServiceDialog) return;

        setFeaturedServices((services) =>
            featuredServiceDialog.index === null
                ? [...services, featuredServiceDialog.service]
                : services.map((service, index) =>
                      index === featuredServiceDialog.index
                          ? featuredServiceDialog.service
                          : service,
                  ),
        );
        setFeaturedServiceDialog(null);
    }

    const featuredServiceTable = useTable({
        features: featuredServiceTableFeatures,
        columns: featuredServiceColumnHelper.columns([
            featuredServiceColumnHelper.accessor('name', {
                header: 'Name',
                cell: ({ getValue, row }) => (
                    <div className="min-w-0 break-words whitespace-normal">
                        <p className="font-medium break-words">
                            {getValue() || 'Untitled service'}
                        </p>
                        {row.original.description && (
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs break-words">
                                {row.original.description}
                            </p>
                        )}
                    </div>
                ),
            }),
            featuredServiceColumnHelper.display({
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const index = featuredServices.indexOf(row.original);

                    return (
                        <div className="flex justify-end gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                    openFeaturedServiceDialog(
                                        index,
                                        row.original,
                                    )
                                }
                            >
                                Edit
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    setFeaturedServices((services) =>
                                        services.filter((_, i) => i !== index),
                                    )
                                }
                            >
                                Delete
                            </Button>
                        </div>
                    );
                },
            }),
        ]),
        data: featuredServices,
    });

    return (
        <AdminTestLayout title="Services">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4 sm:px-6 sm:pt-1 sm:pb-6 lg:pt-1 lg:pb-8">
                <div className="grid gap-3 lg:grid-cols-4">
                    {services.map((service) => (
                        <Card
                            key={service.slug}
                            size="sm"
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer"
                            onClick={() => selectService(service)}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    selectService(service);
                                }
                            }}
                        >
                            <CardHeader>
                                <CardTitle>{service.name}</CardTitle>
                                <CardDescription className="font-mono text-xs">
                                    {service.slug}
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
            </div>
            <Dialog
                open={selectedService !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedService(null);
                }}
            >
                <DialogContent
                    className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
                    showCloseButton={false}
                >
                    <DialogHeader className="relative min-h-7 justify-center pr-8">
                        <DialogTitle>
                            {selectedServiceName ?? 'Service'}
                        </DialogTitle>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 -right-2 -translate-y-1/2 active:!-translate-y-1/2"
                            >
                                <XIcon />
                                <span className="sr-only">Close</span>
                            </Button>
                        </DialogClose>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="service-name">Name</Label>
                                <Input
                                    id="service-name"
                                    defaultValue={selectedServiceRecord?.name}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service-url">Public URL</Label>
                                <Input
                                    id="service-url"
                                    defaultValue={selectedServiceRecord?.slug}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-headline">
                                Page Heading
                            </Label>
                            <Input
                                id="service-headline"
                                defaultValue={selectedServiceRecord?.headline}
                                aria-describedby="service-headline-description"
                            />
                            <p
                                id="service-headline-description"
                                className="text-muted-foreground text-xs"
                            >
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-intro">Description</Label>
                            <Textarea
                                id="service-intro"
                                defaultValue={selectedServiceRecord?.intro}
                            />
                        </div>
                        <MediaPicker
                            label="Banner Image"
                            accept="image"
                            value={bannerImage}
                            onChange={setBannerImage}
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
                                    defaultValue={
                                        selectedServiceRecord?.sort_order
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service-status">Status</Label>
                                <Select
                                    defaultValue={
                                        selectedServiceRecord?.status ?? 'Draft'
                                    }
                                >
                                    <SelectTrigger
                                        id="service-status"
                                        className="w-full"
                                    >
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
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="service-cta-text">
                                CTA Heading
                            </Label>
                            <Input
                                id="service-cta-text"
                                defaultValue={selectedServiceRecord?.cta_text}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-cta-description">
                                CTA Description
                            </Label>
                            <Textarea
                                id="service-cta-description"
                                defaultValue={
                                    selectedServiceRecord?.cta_description
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
                                    defaultValue={
                                        selectedServiceRecord?.cta_button_label
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service-cta-link">
                                    Button Destination
                                </Label>
                                <Input
                                    id="service-cta-link"
                                    defaultValue={
                                        selectedServiceRecord?.cta_link
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label>Rich Content</Label>
                            <p className="text-muted-foreground text-xs">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit.
                            </p>
                        </div>
                        <RichTextEditor
                            value={richContent}
                            onChange={setRichContent}
                        />
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <Label>Featured Services</Label>
                                <p className="text-muted-foreground text-xs">
                                    Lorem ipsum dolor sit amet, consectetur
                                    adipiscing elit.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => openFeaturedServiceDialog(null)}
                            >
                                New Service
                            </Button>
                        </div>
                        {featuredServices.length > 0 && (
                            <DataTable
                                table={featuredServiceTable}
                                showHeader={false}
                                rowClassName="border-b-0 hover:bg-transparent"
                                cellClassName="px-0"
                            />
                        )}
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="service-meta-title">
                                Meta Title
                            </Label>
                            <Input
                                id="service-meta-title"
                                defaultValue={selectedServiceRecord?.metaTitle}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-meta-description">
                                Meta Description
                            </Label>
                            <Textarea
                                id="service-meta-description"
                                defaultValue={
                                    selectedServiceRecord?.metaDescription
                                }
                            />
                        </div>
                    </div>
                    <Dialog
                        open={featuredServiceDialog !== null}
                        onOpenChange={(open) => {
                            if (!open) setFeaturedServiceDialog(null);
                        }}
                    >
                        <DialogContent
                            className="sm:max-w-lg"
                            showCloseButton={false}
                        >
                            <DialogHeader className="relative min-h-7 justify-center pr-8">
                                <DialogTitle>
                                    {featuredServiceDialog?.index === null
                                        ? 'New Service'
                                        : 'Edit Featured Service'}
                                </DialogTitle>
                                <DialogClose asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1/2 -right-2 -translate-y-1/2 active:!-translate-y-1/2"
                                    >
                                        <XIcon />
                                        <span className="sr-only">Close</span>
                                    </Button>
                                </DialogClose>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="featured-service-name">
                                        Name
                                    </Label>
                                    <Input
                                        id="featured-service-name"
                                        value={
                                            featuredServiceDialog?.service
                                                .name ?? ''
                                        }
                                        onChange={(event) =>
                                            setFeaturedServiceDialog(
                                                (dialog) =>
                                                    dialog
                                                        ? {
                                                              ...dialog,
                                                              service: {
                                                                  ...dialog.service,
                                                                  name: event
                                                                      .target
                                                                      .value,
                                                              },
                                                          }
                                                        : dialog,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="featured-service-description">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="featured-service-description"
                                        value={
                                            featuredServiceDialog?.service
                                                .description ?? ''
                                        }
                                        onChange={(event) =>
                                            setFeaturedServiceDialog(
                                                (dialog) =>
                                                    dialog
                                                        ? {
                                                              ...dialog,
                                                              service: {
                                                                  ...dialog.service,
                                                                  description:
                                                                      event
                                                                          .target
                                                                          .value,
                                                              },
                                                          }
                                                        : dialog,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <DialogFooter className="border-t-0 bg-transparent pt-0">
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={saveFeaturedService}
                                >
                                    Save
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <DialogFooter className="!mx-0 !mb-0 !border-0 !bg-transparent !p-0">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="button" variant="secondary">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminTestLayout>
    );
}
