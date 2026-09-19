import { useEffect, useRef, useState, type ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    createColumnHelper,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical,
    LayoutTemplate,
    List,
    Megaphone,
    Trash2,
    UsersRound,
    type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { ConfirmationDialog } from '@/components/admin/confirmation-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { BlockEditor } from '@/features/admin/pages/block-editors';
import { SaveStatus } from '@/features/admin/shared/nonservice-editor';
import {
    BLOCK_LABELS,
    type BlockCatalogueEntry,
    type BlockType,
    type PageBlock,
} from '@/types/blocks';
import type {
    BlockPageContentAdmin,
    BlockPageDraftConflictResponse,
    BlockPageDraftSaveResponse,
    BlockPagePublishResponse,
    BlockPageRestoreResponse,
} from '@/types/block-page';
import type { PageRevisionSummary } from '@/types/page-revision';
import type { Auth } from '@/types/auth';
import { getCsrfToken } from '@/lib/csrf';
import { formatDateTime } from '@/lib/format-date-time';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

const revisionTableFeatures = tableFeatures({});
const revisionColumnHelper = createColumnHelper<
    typeof revisionTableFeatures,
    PageRevisionSummary
>();

const SECTION_PICKER_GROUPS: {
    title: string;
    icon: LucideIcon;
    keys: BlockType[];
}[] = [
    {
        title: 'Page Content',
        icon: LayoutTemplate,
        keys: ['hero', 'text', 'image_text', 'cards'],
    },
    {
        title: 'Call To Action',
        icon: Megaphone,
        keys: ['cta', 'services_grid', 'resources_promo'],
    },
    {
        title: 'FAQ & Lists',
        icon: List,
        keys: ['faq', 'text_with_list', 'stats', 'testimonials'],
    },
    {
        title: 'People & Careers',
        icon: UsersRound,
        keys: ['team', 'open_positions', 'standards'],
    },
];

type PendingConfirmation = {
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
};

function titleCase(value: string): string {
    return value
        .toLowerCase()
        .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function sectionPickerLabel(entry: BlockCatalogueEntry): string {
    if (entry.key === 'cta') return 'CTA';
    if (entry.key === 'faq') return 'FAQ';
    return titleCase(entry.label);
}

function PageEditorSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-5 py-8">
            <div className="grid gap-1">
                <h2 className="text-xl font-semibold">{title}</h2>
                {description && (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                )}
            </div>
            <div className="grid gap-4">{children}</div>
        </section>
    );
}

function SortableBlock({
    block,
    children,
    onRemove,
}: {
    block: PageBlock;
    children: ReactNode;
    onRemove: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });
    return (
        <section
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`relative rounded-lg border p-4 ${isDragging ? 'bg-background z-10 opacity-70 shadow-lg' : ''}`}
        >
            <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => setExpanded((current) => !current)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpanded((current) => !current);
                    }
                }}
                className="flex cursor-pointer items-center justify-between gap-2"
            >
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="text-muted-foreground cursor-grab touch-none"
                        aria-label={`Drag ${BLOCK_LABELS[block.type]}`}
                        onClick={(event) => event.stopPropagation()}
                        {...listeners}
                        {...attributes}
                    >
                        <GripVertical className="size-4" />
                    </button>
                    <h3 className="text-base font-medium">
                        {titleCase(BLOCK_LABELS[block.type])}
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove block"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemove();
                        }}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>
            {expanded && <div className="mt-5 border-t pt-5">{children}</div>}
        </section>
    );
}

export function BlockPageEditor({
    slug,
    isSystem,
    content,
    blockCatalogue,
    hasUnpublishedChanges: initialHasUnpublishedChanges,
    baseRevisionId: initialBaseRevisionId,
    revisions: initialRevisions,
    previewUrl,
}: {
    slug: string;
    isSystem: boolean;
    content: BlockPageContentAdmin;
    blockCatalogue: BlockCatalogueEntry[];
    hasUnpublishedChanges: boolean;
    baseRevisionId: number | null;
    revisions: PageRevisionSummary[];
    previewUrl: string;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const canPublish = auth.adminPermissions.pages?.publish === true;
    const [title, setTitle] = useState(content.title);
    const [blocks, setBlocks] = useState<PageBlock[]>(content.blocks);
    const [metaTitle, setMetaTitle] = useState(content.metaTitle);
    const [metaDescription, setMetaDescription] = useState(
        content.metaDescription,
    );
    const [dirty, setDirty] = useState(false);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [restoringId, setRestoringId] = useState<number | null>(null);
    const [baseRevisionId, setBaseRevisionId] = useState(initialBaseRevisionId);
    const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(
        initialHasUnpublishedChanges,
    );
    const [revisions, setRevisions] =
        useState<PageRevisionSummary[]>(initialRevisions);
    const [conflict, setConflict] =
        useState<BlockPageDraftConflictResponse | null>(null);
    const [slugValue, setSlugValue] = useState(slug);
    const [renaming, setRenaming] = useState(false);
    const [slugError, setSlugError] = useState('');
    const [addSectionOpen, setAddSectionOpen] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<URL | null>(
        null,
    );
    const [confirmation, setConfirmation] =
        useState<PendingConfirmation | null>(null);
    const allowNavigationRef = useRef(false);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    useEffect(() => {
        function handleBeforeUnload(event: BeforeUnloadEvent) {
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = '';
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        const removeNavigationGuard = router.on('before', (event) => {
            const visit = event.detail.visit;
            if (
                !dirty ||
                allowNavigationRef.current ||
                visit.method !== 'get'
            ) {
                return;
            }

            setPendingNavigation(visit.url);
            return false;
        });

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            removeNavigationGuard();
        };
    }, [dirty]);

    function applyContent(next: BlockPageContentAdmin) {
        setTitle(next.title);
        setBlocks(next.blocks);
        setMetaTitle(next.metaTitle);
        setMetaDescription(next.metaDescription);
    }

    function mutate<T>(setter: (value: T) => void) {
        return (value: T) => {
            setter(value);
            setDirty(true);
        };
    }

    function updateBlockData(id: string, data: PageBlock['data']) {
        setBlocks((current) =>
            current.map((block) =>
                block.id === id ? ({ ...block, data } as PageBlock) : block,
            ),
        );
        setDirty(true);
    }

    function addBlock(entry: BlockCatalogueEntry) {
        const id =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setBlocks((current) => [
            ...current,
            {
                id,
                type: entry.key,
                data: structuredClone(entry.defaultData),
            } as PageBlock,
        ]);
        setAddSectionOpen(false);
        setDirty(true);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        if (active.id === over.id) return;
        const oldIndex = blocks.findIndex((block) => block.id === active.id);
        const newIndex = blocks.findIndex((block) => block.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        setBlocks((current) => {
            const next = [...current];
            const [moved] = next.splice(oldIndex, 1);
            next.splice(newIndex, 0, moved);
            return next;
        });
        setDirty(true);
    }

    function removeBlock(id: string) {
        setBlocks((current) => current.filter((block) => block.id !== id));
        setDirty(true);
    }

    function requestRemoveBlock(id: string) {
        setConfirmation({
            title: 'Remove Section',
            description:
                'This Section Will Be Removed From The Page. This Action Cannot Be Undone.',
            confirmLabel: 'Remove Section',
            onConfirm: () => removeBlock(id),
        });
    }

    async function save() {
        setMessage('');
        setConflict(null);
        setErrors({});
        setSaving(true);
        try {
            const response = await fetch(`/admin/blocks/${slug}`, {
                method: 'PUT',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    title,
                    blocks,
                    meta_title: metaTitle,
                    meta_description: metaDescription,
                    og_image_media_id: null,
                    base_revision_id: baseRevisionId,
                }),
            });
            const json = await response.json();

            if (response.status === 409) {
                setConflict(json as BlockPageDraftConflictResponse);
                return;
            }
            if (response.status === 422) {
                const validationErrors = json.errors as Record<
                    string,
                    string[]
                >;
                setErrors(
                    Object.fromEntries(
                        Object.entries(validationErrors).map(
                            ([field, messages]) => [field, messages[0]],
                        ),
                    ),
                );
                return;
            }
            if (!response.ok) {
                setMessage('Something went wrong. Please try again.');
                return;
            }

            const saved = json as BlockPageDraftSaveResponse;
            setBaseRevisionId(saved.baseRevisionId);
            setHasUnpublishedChanges(saved.hasUnpublishedChanges);
            setRevisions(saved.revisions);
            setDirty(false);
            setMessage('Draft saved.');
        } finally {
            setSaving(false);
        }
    }

    async function publishNow() {
        setMessage('');
        setConflict(null);
        setPublishing(true);
        try {
            const response = await fetch(`/admin/blocks/${slug}/publish`, {
                method: 'PUT',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
            });
            const json = await response.json();

            if (!response.ok) {
                setMessage(
                    (json.message as string | undefined) ??
                        'There is no draft to publish.',
                );
                return;
            }

            const published = json as BlockPagePublishResponse;
            setHasUnpublishedChanges(published.hasUnpublishedChanges);
            setRevisions(published.revisions);
            setMessage('Published.');
        } finally {
            setPublishing(false);
        }
    }

    async function restoreAsDraft(revisionId: number) {
        setMessage('');
        setConflict(null);
        setRestoringId(revisionId);
        try {
            const response = await fetch(
                `/admin/blocks/${slug}/revisions/${revisionId}/restore`,
                {
                    method: 'PUT',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    credentials: 'same-origin',
                },
            );
            if (!response.ok) {
                setMessage('Could not restore this revision.');
                return;
            }
            const restored =
                (await response.json()) as BlockPageRestoreResponse;
            applyContent(restored.content);
            setBaseRevisionId(restored.baseRevisionId);
            setHasUnpublishedChanges(restored.hasUnpublishedChanges);
            setRevisions(restored.revisions);
            setDirty(false);
            setMessage('Restored as the current draft.');
        } finally {
            setRestoringId(null);
        }
    }

    function requestRestoreAsDraft(revisionId: number) {
        if (!hasUnpublishedChanges && !dirty) {
            void restoreAsDraft(revisionId);
            return;
        }

        setConfirmation({
            title: 'Restore Draft',
            description:
                'Restoring Will Replace The Current Draft With This Older Version. Any Changes Not Yet Saved As A Draft Will Be Lost.',
            confirmLabel: 'Restore Draft',
            onConfirm: () => void restoreAsDraft(revisionId),
        });
    }

    function loadConflictingVersion() {
        if (!conflict?.current) return;
        applyContent(conflict.current.content);
        setBaseRevisionId(conflict.current.revisionId);
        setHasUnpublishedChanges(conflict.current.status === 'draft');
        setConflict(null);
        setDirty(true);
        setMessage(
            'Loaded the other version. Your prior edits in this form were replaced. Review before saving again.',
        );
    }

    function renameSlug() {
        if (slugValue === slug || renaming) return;
        setSlugError('');
        setRenaming(true);
        router.put(
            `/admin/blocks/${slug}/rename`,
            { slug: slugValue },
            {
                onError: (renameErrors) =>
                    setSlugError(
                        renameErrors.slug ?? 'Could not update the URL.',
                    ),
                onFinish: () => setRenaming(false),
            },
        );
    }

    function leaveWithoutSaving() {
        if (!pendingNavigation) return;
        allowNavigationRef.current = true;
        router.visit(pendingNavigation, {
            onFinish: () => {
                allowNavigationRef.current = false;
            },
        });
        setPendingNavigation(null);
    }

    const remainingErrors = Object.entries(errors).filter(
        ([field]) => field !== 'title',
    );
    const revisionTable = useTable({
        features: revisionTableFeatures,
        data: revisions,
        columns: revisionColumnHelper.columns([
            revisionColumnHelper.accessor('status', {
                header: 'Status',
                cell: (info) => (
                    <Badge
                        variant={
                            info.getValue() === 'published'
                                ? 'secondary'
                                : 'ghost'
                        }
                    >
                        {info.getValue() === 'published' ? 'Live' : 'Draft'}
                    </Badge>
                ),
            }),
            revisionColumnHelper.accessor('createdAt', {
                header: 'Updated',
                cell: (info) => (
                    <div className="grid gap-0.5">
                        <span>{formatDateTime(info.getValue())}</span>
                        <span className="text-muted-foreground text-xs">
                            {info.row.original.authorName}
                        </span>
                    </div>
                ),
            }),
            revisionColumnHelper.display({
                id: 'actions',
                header: 'Actions',
                cell: (info) => (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={restoringId !== null}
                        onClick={() =>
                            requestRestoreAsDraft(info.row.original.id)
                        }
                    >
                        {restoringId === info.row.original.id
                            ? 'Restoring…'
                            : 'Restore'}
                    </Button>
                ),
            }),
        ]),
    });

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid w-full items-start gap-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
                <aside className="min-w-0 lg:pr-3">
                    <div className="mb-8 grid gap-1">
                        <h1 className="text-2xl font-semibold">
                            {title || slug}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {PAGE_DESCRIPTION}
                        </p>
                    </div>
                    <div className="bg-background sticky top-6 z-10 -mx-1 mb-8 grid gap-3 border-y px-1 py-3">
                        <div
                            className={
                                canPublish
                                    ? 'grid grid-cols-2 gap-3'
                                    : 'grid gap-3'
                            }
                        >
                            <Button
                                variant="outline"
                                disabled={saving || publishing}
                                onClick={save}
                                className="w-full"
                            >
                                {saving ? 'Saving…' : 'Save Draft'}
                            </Button>
                            {canPublish && (
                                <Button
                                    disabled={
                                        saving ||
                                        publishing ||
                                        !hasUnpublishedChanges
                                    }
                                    onClick={publishNow}
                                    className="w-full"
                                >
                                    {publishing ? 'Publishing…' : 'Publish'}
                                </Button>
                            )}
                        </div>
                        <SaveStatus
                            processing={saving || publishing}
                            isDirty={dirty}
                            savedMessage={message}
                        />
                    </div>
                    <section className="grid gap-4 pb-8">
                        <div className="grid gap-2">
                            <Label htmlFor="page-title">Title</Label>
                            <Input
                                id="page-title"
                                value={title}
                                disabled={isSystem}
                                onChange={(e) =>
                                    mutate(setTitle)(e.target.value)
                                }
                            />
                            {errors.title && (
                                <p className="text-destructive text-sm">
                                    {errors.title}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="page-slug">URL</Label>
                            {isSystem ? (
                                <Input
                                    id="page-slug"
                                    value={`/${slugValue}`}
                                    disabled
                                />
                            ) : (
                                <>
                                    <Input
                                        id="page-slug"
                                        value={`/${slugValue}`}
                                        onChange={(e) =>
                                            setSlugValue(
                                                e.target.value.replace(
                                                    /^\/+/,
                                                    '',
                                                ),
                                            )
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            slugValue === slug || renaming
                                        }
                                        onClick={renameSlug}
                                    >
                                        {renaming ? 'Updating…' : 'Update URL'}
                                    </Button>
                                    {slugError && (
                                        <p className="text-destructive text-sm">
                                            {slugError}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                    <Separator />

                    <PageEditorSection
                        title="SEO"
                        description={PAGE_DESCRIPTION}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="meta-title">Meta Title</Label>
                            <Input
                                id="meta-title"
                                value={metaTitle}
                                onChange={(e) =>
                                    mutate(setMetaTitle)(e.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="meta-description">
                                Meta Description
                            </Label>
                            <Textarea
                                id="meta-description"
                                className="field-sizing-fixed"
                                maxLength={320}
                                value={metaDescription}
                                onChange={(e) =>
                                    mutate(setMetaDescription)(e.target.value)
                                }
                            />
                            <p className="text-muted-foreground text-xs">
                                {PAGE_DESCRIPTION}
                            </p>
                        </div>
                    </PageEditorSection>

                    <Separator />

                    <PageEditorSection
                        title="Publishing"
                        description={PAGE_DESCRIPTION}
                    >
                        <Button asChild variant="secondary" className="w-full">
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Preview Draft
                            </a>
                        </Button>

                        {revisions.length > 0 && (
                            <div className="grid gap-2">
                                <Label>Revision History</Label>
                                <DataTable
                                    table={revisionTable}
                                    showHeader={false}
                                    cellClassName="px-2 py-3 text-xs"
                                />
                            </div>
                        )}
                    </PageEditorSection>

                    {conflict && (
                        <div
                            role="alert"
                            className="grid gap-3 rounded-lg border border-amber-500 bg-amber-50 p-4 text-sm dark:bg-amber-950/40"
                        >
                            <p className="font-medium">{conflict.message}</p>
                            {conflict.current && (
                                <>
                                    <p className="text-muted-foreground">
                                        Current version (
                                        {conflict.current.status}) by{' '}
                                        {conflict.current.authorName},{' '}
                                        {formatDateTime(
                                            conflict.current.updatedAt,
                                        )}
                                        .
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={loadConflictingVersion}
                                        >
                                            Load their version into this form
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setConflict(null)}
                                        >
                                            Keep editing my version
                                        </Button>
                                    </div>
                                    <p className="text-muted-foreground">
                                        Your edits above are unchanged. Save
                                        again using their revision as the new
                                        base once you've reconciled the two.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {remainingErrors.length > 0 && (
                        <div role="alert" className="text-destructive text-sm">
                            {remainingErrors.map(([field, error]) => (
                                <p key={field}>{error}</p>
                            ))}
                        </div>
                    )}
                </aside>
                <main className="min-w-0">
                    <SortableContext
                        items={blocks.map((block) => block.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="grid gap-4">
                            {blocks.map((block) => (
                                <SortableBlock
                                    key={block.id}
                                    block={block}
                                    onRemove={() =>
                                        requestRemoveBlock(block.id)
                                    }
                                >
                                    <BlockEditor
                                        block={block}
                                        onChange={(data) =>
                                            updateBlockData(block.id, data)
                                        }
                                    />
                                </SortableBlock>
                            ))}
                        </div>
                    </SortableContext>
                    <footer className="mt-8 flex justify-center border-t pt-6">
                        <Popover
                            open={addSectionOpen}
                            onOpenChange={setAddSectionOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline">
                                    Add Section
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="center"
                                side="top"
                                className="w-[32rem] max-w-[calc(100vw-2rem)] gap-4 p-3"
                            >
                                <div className="grid gap-1 px-1">
                                    <h2 className="text-sm font-medium">
                                        Add Section
                                    </h2>
                                    <p className="text-muted-foreground text-xs">
                                        Choose a section to add to the bottom of
                                        this page.
                                    </p>
                                </div>
                                <div className="grid gap-4">
                                    {SECTION_PICKER_GROUPS.map((group) => {
                                        const entries = blockCatalogue.filter(
                                            (entry) =>
                                                group.keys.includes(entry.key),
                                        );
                                        if (entries.length === 0) return null;

                                        const Icon = group.icon;
                                        return (
                                            <section
                                                key={group.title}
                                                className="grid gap-2 border-t pt-4 first:border-t-0 first:pt-0"
                                            >
                                                <div className="text-muted-foreground flex items-center gap-2 px-1 text-xs font-medium tracking-wide uppercase">
                                                    <Icon className="size-3.5" />
                                                    <h3>{group.title}</h3>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {entries.map((entry) => (
                                                        <button
                                                            key={entry.key}
                                                            type="button"
                                                            onClick={() =>
                                                                addBlock(entry)
                                                            }
                                                            className="hover:bg-accent hover:text-accent-foreground flex rounded-md px-2 py-2 text-left text-sm"
                                                        >
                                                            {sectionPickerLabel(
                                                                entry,
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </footer>
                </main>
            </div>
            <Dialog
                open={pendingNavigation !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingNavigation(null);
                }}
            >
                <AdminDialogContent className="sm:max-w-md">
                    <AdminDialogHeader title="Unsaved Changes" />
                    <p className="text-muted-foreground text-sm">
                        You Have Changes That Have Not Been Saved. Stay On This
                        Page To Save Them, Or Leave And Discard Them.
                    </p>
                    <AdminDialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPendingNavigation(null)}
                        >
                            Stay
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={leaveWithoutSaving}
                        >
                            Leave Without Saving
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
            {confirmation && (
                <ConfirmationDialog
                    open
                    title={confirmation.title}
                    description={confirmation.description}
                    confirmLabel={confirmation.confirmLabel}
                    onOpenChange={(open) => {
                        if (!open) setConfirmation(null);
                    }}
                    onConfirm={() => {
                        confirmation.onConfirm();
                        setConfirmation(null);
                    }}
                />
            )}
        </DndContext>
    );
}
