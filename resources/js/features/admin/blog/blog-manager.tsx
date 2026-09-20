import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';
import { formatAdminDate } from '@/lib/format-admin-date';
import { Newspaper } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AdminDetail as Detail } from '@/components/admin/admin-detail';
import { AdminField as Field } from '@/components/admin/admin-field';
import { useAdminMutation } from '@/hooks/use-admin-mutation';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminTableToolbar } from '@/components/admin/admin-table-toolbar';
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import Heading from '@/components/heading';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { Dialog, DialogClose, DialogDescription } from '@/components/ui/dialog';
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
import { DatePicker } from '@/components/admin/date-picker';
import { RelatedServicesField } from '@/components/admin/related-services-field';
import {
    MediaPicker,
    type MediaPickerValue,
} from '@/components/admin/media-picker';
import type { Auth } from '@/types/auth';

export type BlogPost = {
    excerpt: string;
    id: string;
    title: string;
    slug: string;
    body: string;
    bannerImage: MediaPickerValue;
    status: 'Live' | 'Draft';
    publishDate: string;
    metaTitle?: string;
    metaDescription?: string;
    serviceIds: string[];
    serviceNames: string[];
    authorName: string | null;
};

type ServiceOption = { id: string; name: string };

const emptyDraft = {
    excerpt: '',
    title: '',
    urlSlug: '',
    body: '',
    status: 'Draft' as BlogPost['status'],
    publishDate: todayIso(),
    metaTitle: '',
    metaDescription: '',
    serviceIds: [] as string[],
};

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

const columnLabels: Record<string, string> = {
    title: 'Title',
    status: 'Status',
    authorName: 'Author',
    publishDate: 'Date',
};

function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function StatusBadge({
    post,
}: {
    post: Pick<BlogPost, 'status' | 'publishDate'>;
}) {
    return (
        <Badge variant={post.status === 'Live' ? 'secondary' : 'outline'}>
            {post.status}
        </Badge>
    );
}

const features = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    globalFilteringFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric },
    filterFns: { includesString: filterFn_includesString },
});

const helper = createColumnHelper<typeof features, BlogPost>();
const columns = helper.columns([
    helper.accessor('title', { header: 'Title' }),
    helper.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge post={info.row.original} />,
    }),
    helper.accessor('authorName', {
        header: 'Author',
        cell: (info) => {
            const authorName = info.getValue();

            return (
                <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                        <AvatarFallback className="bg-secondary text-[10px]"></AvatarFallback>
                    </Avatar>
                    <span>{authorName ?? 'Unassigned'}</span>
                </div>
            );
        },
    }),
    helper.accessor('publishDate', {
        header: 'Date',
        cell: (info) => formatAdminDate(info.getValue()),
    }),
]);

export function BlogManager({
    posts,
    services = [],
}: {
    posts: BlogPost[];
    services?: ServiceOption[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const blogPermissions = auth.adminPermissions.blog ?? {};
    const canCreate = blogPermissions.create === true;
    const canEdit = blogPermissions.edit === true;
    const canPublish = blogPermissions.publish === true;
    const {
        processing,
        errors,
        clearErrors,
        run: runMutation,
    } = useAdminMutation();
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState(emptyDraft);
    const [bannerMedia, setBannerMedia] = useState<MediaPickerValue>(null);
    const [slugTouched, setSlugTouched] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const table = useTable({
        features,
        columns,
        data: posts,
        globalFilterFn: 'includesString',
    });
    const sortableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanSort());

    function openCreate() {
        clearErrors();
        setEditingId(null);
        setDraft({ ...emptyDraft, publishDate: todayIso() });
        setBannerMedia(null);
        setSlugTouched(false);
        setIsFormOpen(true);
    }

    function openEdit(post: BlogPost) {
        clearErrors();
        setEditingId(post.id);
        setDraft({
            excerpt: post.excerpt,
            title: post.title,
            urlSlug: post.slug.replace(/^\//, ''),
            body: post.body,
            status: post.status,
            publishDate: post.publishDate,
            metaTitle: post.metaTitle ?? '',
            metaDescription: post.metaDescription ?? '',
            serviceIds: post.serviceIds,
        });
        setBannerMedia(post.bannerImage);
        setSlugTouched(true);
        setSelectedPost(null);
        setIsFormOpen(true);
    }

    // Lets the unified Content Library listing (LIB-01,
    // docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4) deep-link straight into this
    // page's own existing edit dialog via /admin/blog?edit={id}, instead of
    // duplicating this form on a second page. Reads the query param directly
    // rather than threading it through the controller, so BlogController and
    // its route stay untouched.
    useEffect(() => {
        const editId = new URLSearchParams(window.location.search).get('edit');
        if (!editId) return;
        const post = posts.find((candidate) => candidate.id === editId);
        if (post) openEdit(post);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function updateDraft<K extends keyof typeof emptyDraft>(
        key: K,
        value: (typeof emptyDraft)[K],
    ) {
        setDraft((current) => {
            const next = { ...current, [key]: value };
            if (key === 'title' && !slugTouched)
                next.urlSlug = slugify(value as string);
            return next;
        });
    }

    function handleSave() {
        const payload = {
            ...draft,
            bannerMediaId: bannerMedia ? Number(bannerMedia.id) : null,
        };
        runMutation(
            (options) =>
                editingId
                    ? router.patch(`/admin/blog/${editingId}`, payload, options)
                    : router.post('/admin/blog', payload, options),
            { onSuccess: () => setIsFormOpen(false) },
        );
    }

    return (
        <AdminWorkspaceLayout
            title="Articles"
            description={PAGE_DESCRIPTION}
            headerAction={
                <AdminTableToolbar
                    search={table.state.globalFilter ?? ''}
                    onSearchChange={(value) => table.setGlobalFilter(value)}
                    sortColumns={sortableColumns}
                    sortLabels={columnLabels}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                >
                    {canCreate && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={openCreate}
                        >
                            New Post
                        </Button>
                    )}
                </AdminTableToolbar>
            }
        >
            <Heading
                title="Articles"
                description={PAGE_DESCRIPTION}
                variant="large"
            />
            {table.getRowModel().rows.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Newspaper className="size-8" />
                        </EmptyMedia>
                        <EmptyTitle>No Articles</EmptyTitle>
                        {posts.length === 0 && (
                            <EmptyDescription>
                                You haven&apos;t written any articles yet.
                            </EmptyDescription>
                        )}
                    </EmptyHeader>
                    <EmptyContent>
                        {canCreate && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={openCreate}
                            >
                                New Post
                            </Button>
                        )}
                    </EmptyContent>
                </Empty>
            ) : viewMode === 'table' ? (
                <DataTable
                    table={table}
                    onRowClick={setSelectedPost}
                    showHeader={false}
                />
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {table.getRowModel().rows.map((row) => {
                        const post = row.original;
                        return (
                            <Card
                                key={post.id}
                                size="sm"
                                role="button"
                                tabIndex={0}
                                className="cursor-pointer"
                                onClick={() => setSelectedPost(post)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.preventDefault();
                                        setSelectedPost(post);
                                    }
                                }}
                            >
                                <CardHeader>
                                    <CardTitle>{post.title}</CardTitle>
                                    <CardAction>
                                        <StatusBadge post={post} />
                                    </CardAction>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="size-6">
                                                <AvatarFallback />
                                            </Avatar>
                                            <span className="text-muted-foreground text-xs">
                                                {post.authorName ??
                                                    'Unassigned'}
                                            </span>
                                        </div>
                                        <span className="text-muted-foreground text-xs">
                                            {formatAdminDate(post.publishDate)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog
                open={selectedPost !== null}
                onOpenChange={(open) => !open && setSelectedPost(null)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader title={selectedPost?.title} />
                    <DialogDescription>{selectedPost?.slug}</DialogDescription>
                    {selectedPost && (
                        <div className="grid gap-4 text-sm">
                            <dl className="grid grid-cols-2 gap-2">
                                <dt className="text-muted-foreground">
                                    Status
                                </dt>
                                <dd>
                                    <StatusBadge post={selectedPost} />
                                </dd>
                                <dt className="text-muted-foreground">Date</dt>
                                <dd>
                                    {formatAdminDate(selectedPost.publishDate)}
                                </dd>
                            </dl>
                            <Detail
                                label="URL Slug"
                                value={selectedPost.slug}
                            />
                            <div className="grid gap-1">
                                <span className="text-muted-foreground">
                                    Related Services
                                </span>
                                {selectedPost.serviceNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedPost.serviceNames.map(
                                            (name) => (
                                                <Badge
                                                    key={name}
                                                    variant="secondary"
                                                >
                                                    {name}
                                                </Badge>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <span>—</span>
                                )}
                            </div>
                            <Detail
                                label="Author"
                                value={selectedPost.authorName ?? ''}
                            />
                            <Detail
                                label="Excerpt"
                                value={selectedPost.excerpt}
                            />
                            <div className="grid gap-1">
                                <span className="text-muted-foreground">
                                    Banner Image
                                </span>
                                {selectedPost.bannerImage ? (
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={selectedPost.bannerImage.url}
                                            alt=""
                                            className="size-10 rounded-md object-cover"
                                        />
                                        <span>
                                            {selectedPost.bannerImage.fileName}
                                        </span>
                                    </div>
                                ) : (
                                    <span>—</span>
                                )}
                            </div>
                            <Detail label="Body" value={selectedPost.body} />
                            <Detail
                                label="Meta Title"
                                value={selectedPost.metaTitle ?? ''}
                            />
                            <Detail
                                label="Meta Description"
                                value={selectedPost.metaDescription ?? ''}
                            />
                        </div>
                    )}
                    <AdminDialogFooter>
                        {canEdit && (
                            <Button
                                onClick={() =>
                                    selectedPost && openEdit(selectedPost)
                                }
                            >
                                Edit
                            </Button>
                        )}
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={editingId ? 'Edit Post' : 'New Post'}
                        closeDisabled={processing}
                    />
                    <div className="grid gap-4">
                        <Field label="Title" htmlFor="blog-title">
                            <Input
                                id="blog-title"
                                value={draft.title}
                                onChange={(event) =>
                                    updateDraft('title', event.target.value)
                                }
                            />
                        </Field>
                        <Field label="URL Slug" htmlFor="blog-url-slug">
                            <Input
                                id="blog-url-slug"
                                value={draft.urlSlug}
                                onChange={(event) => {
                                    setSlugTouched(true);
                                    updateDraft('urlSlug', event.target.value);
                                }}
                            />
                        </Field>
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
                        <Field label="Excerpt" htmlFor="blog-excerpt">
                            <Textarea
                                id="blog-excerpt"
                                value={draft.excerpt}
                                onChange={(event) =>
                                    updateDraft('excerpt', event.target.value)
                                }
                            />
                        </Field>
                        <Field label="Body" htmlFor="blog-body">
                            <Textarea
                                id="blog-body"
                                className="field-sizing-fixed"
                                value={draft.body}
                                onChange={(event) =>
                                    updateDraft('body', event.target.value)
                                }
                            />
                        </Field>
                        <MediaPicker
                            label="Banner Image"
                            accept="image"
                            value={bannerMedia}
                            onChange={setBannerMedia}
                        />
                        <p className="text-muted-foreground text-sm">
                            Live posts with a future publish date appear on that
                            date. Separate body paragraphs with a blank line.
                        </p>
                        <Field label="Date" htmlFor="blog-publish-date">
                            <DatePicker
                                id="blog-publish-date"
                                value={draft.publishDate}
                                onChange={(value) =>
                                    updateDraft('publishDate', value)
                                }
                            />
                        </Field>
                        <Field label="Meta Title" htmlFor="blog-meta-title">
                            <Input
                                id="blog-meta-title"
                                maxLength={255}
                                value={draft.metaTitle}
                                onChange={(event) =>
                                    updateDraft('metaTitle', event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Meta Description"
                            htmlFor="blog-meta-description"
                        >
                            <Textarea
                                id="blog-meta-description"
                                maxLength={320}
                                value={draft.metaDescription}
                                onChange={(event) =>
                                    updateDraft(
                                        'metaDescription',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <RelatedServicesField
                            services={services}
                            value={draft.serviceIds}
                            onChange={(value) =>
                                updateDraft('serviceIds', value)
                            }
                            description="Shown as a relevant post on each selected service's public page."
                            error={errors.serviceIds}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="blog-author">Author</Label>
                            <Input
                                id="blog-author"
                                value={auth.user.name}
                                readOnly
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            {canPublish ? (
                                <Select
                                    value={draft.status}
                                    onValueChange={(value) =>
                                        updateDraft(
                                            'status',
                                            value as BlogPost['status'],
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
                            ) : (
                                <div className="grid gap-1">
                                    <Badge variant="outline" className="w-fit">
                                        {draft.status}
                                    </Badge>
                                    <p className="text-muted-foreground text-sm">
                                        Publication is managed by an editor with
                                        publish permission.
                                    </p>
                                </div>
                            )}
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
                        <Button disabled={processing} onClick={handleSave}>
                            {processing ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
        </AdminWorkspaceLayout>
    );
}
