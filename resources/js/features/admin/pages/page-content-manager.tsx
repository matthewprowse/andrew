import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { getCsrfToken } from '@/lib/csrf';
import { formatDateTime } from '@/lib/format-date-time';
import { AssetPicker } from '@/components/admin/asset-picker';
import { ConfirmationDialog } from '@/components/admin/confirmation-dialog';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HomeBlocksEditor } from '@/features/admin/pages/home-blocks-editor';
import {
    EditorSection,
    SaveStatus,
    useUnsavedChangesWarning,
} from '@/features/admin/shared/nonservice-editor';
import type { PageContentAdmin, PageSection } from '@/types/page-content';
import type { Auth } from '@/types/auth';
import type {
    PageDraftConflictResponse,
    PageDraftSaveResponse,
    PagePublishResponse,
    PageRestoreResponse,
    PageRevisionSummary,
} from '@/types/page-revision';

const emptySection: PageSection = { heading: '', description: '' };

type PageSlug = 'home' | 'about' | 'contact' | 'locations';

/**
 * Which generic Page fields each public template actually reads (CMS-01).
 * Verified directly against every template, not assumed: contact.tsx and
 * locations.tsx only ever read metaTitle/metaDescription/heroHeading/
 * heroSubheading/ogImageUrl. about.tsx also reads introHeading/introBody/
 * introImage/sections/showTeamSection. Hiding a field here never deletes
 * its stored value — PageContentController::update() preserves any field a
 * request omits.
 */
const FIELD_VISIBILITY: Record<
    PageSlug,
    {
        intro: boolean;
        introImage: boolean;
        sections: boolean;
        sectionsLabel: string;
        showTeamToggle: boolean;
    }
> = {
    home: {
        intro: true,
        introImage: false,
        sections: true,
        sectionsLabel: 'Values',
        showTeamToggle: false,
    },
    about: {
        intro: true,
        introImage: true,
        sections: true,
        sectionsLabel: 'Sections',
        showTeamToggle: true,
    },
    contact: {
        intro: false,
        introImage: false,
        sections: false,
        sectionsLabel: 'Sections',
        showTeamToggle: false,
    },
    locations: {
        intro: false,
        introImage: false,
        sections: false,
        sectionsLabel: 'Sections',
        showTeamToggle: false,
    },
};

// PUB-01/02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): draft save,
// publish, and restore-as-draft all need a structured JSON response (the
// 409 conflict body especially) that Inertia's own form.put()/router
// helpers aren't built to surface — so these three actions use a plain
// fetch() instead, same pattern as asset-picker.tsx and estimator.tsx.
function truncate(value: string, max = 80): string {
    return value.length > max ? `${value.slice(0, max)}…` : value;
}

// PUB-02: a deliberately simple, top-level field diff — not a generic deep
// differ — enough to show a human which parts of the page changed
// underneath them without building a full structural diff UI. `sections`
// and `homeBlocks` are compared as opaque blocks (changed or not) rather
// than item-by-item, which is enough detail to prompt "go look", not a
// promise of a complete diff.
type ScalarField =
    | 'heroHeading'
    | 'heroSubheading'
    | 'introHeading'
    | 'introBody'
    | 'metaTitle'
    | 'metaDescription';

function diffFields(
    before: PageContentAdmin,
    after: PageContentAdmin,
): { field: string; label: string; after: string }[] {
    const scalarFields: [ScalarField, string][] = [
        ['heroHeading', 'Hero heading'],
        ['heroSubheading', 'Hero subheading'],
        ['introHeading', 'Intro heading'],
        ['introBody', 'Intro body'],
        ['metaTitle', 'Meta title'],
        ['metaDescription', 'Meta description'],
    ];
    const diffs: { field: string; label: string; after: string }[] = [];

    for (const [field, label] of scalarFields) {
        if (before[field] !== after[field]) {
            diffs.push({ field, label, after: truncate(after[field]) });
        }
    }
    if (JSON.stringify(before.sections) !== JSON.stringify(after.sections)) {
        diffs.push({ field: 'sections', label: 'Sections', after: '' });
    }
    if (
        JSON.stringify(before.homeBlocks) !== JSON.stringify(after.homeBlocks)
    ) {
        diffs.push({ field: 'homeBlocks', label: 'Home blocks', after: '' });
    }

    return diffs;
}

// Fields with their own inline InputError below — excluded from the
// fallback aggregate error list so a validation message never shows twice.
const INLINE_HANDLED_FIELDS = new Set([
    'hero_heading',
    'hero_subheading',
    'intro_heading',
    'intro_body',
    'meta_title',
    'meta_description',
]);

export function PageContentManager({
    slug,
    content,
    publishedTeamMemberCount,
    hasUnpublishedChanges: initialHasUnpublishedChanges,
    baseRevisionId: initialBaseRevisionId,
    revisions: initialRevisions,
    previewUrl,
}: {
    slug: string;
    content: PageContentAdmin;
    /**
     * How many team members currently have status "Published" — used only to
     * power the empty-team warning below. Omit (or pass undefined) from a
     * context that hasn't loaded it; the warning simply won't render.
     */
    publishedTeamMemberCount?: number;
    /**
     * PUB-01/02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B):
     * whether a draft is already pending for this page, the revision id
     * this editing session's `content` came from (null if the page has no
     * revisions at all yet — a fresh page never edited before), the
     * revision history list, and the authenticated preview URL.
     */
    hasUnpublishedChanges: boolean;
    baseRevisionId: number | null;
    revisions: PageRevisionSummary[];
    previewUrl: string;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const canPublish = auth.adminPermissions.pages?.publish === true;
    const visibility =
        FIELD_VISIBILITY[slug as PageSlug] ?? FIELD_VISIBILITY.contact;
    const sectionSingular = visibility.sectionsLabel
        .toLowerCase()
        .replace(/s$/, '');
    const form = useForm({
        hero_heading: content.heroHeading,
        hero_subheading: content.heroSubheading,
        intro_heading: content.introHeading,
        intro_body: content.introBody,
        intro_image_media_id: content.introImage?.id ?? '',
        sections: content.sections,
        home_blocks: content.homeBlocks,
        show_team_section: content.showTeamSection,
        meta_title: content.metaTitle,
        meta_description: content.metaDescription,
        og_image_media_id: content.ogImage?.id ?? '',
    });
    const [introImage, setIntroImage] = useState(content.introImage);
    const [ogImage, setOgImage] = useState(content.ogImage);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [restoringId, setRestoringId] = useState<number | null>(null);
    const [baseRevisionId, setBaseRevisionId] = useState(initialBaseRevisionId);
    const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(
        initialHasUnpublishedChanges,
    );
    const [revisions, setRevisions] =
        useState<PageRevisionSummary[]>(initialRevisions);
    const [conflict, setConflict] = useState<PageDraftConflictResponse | null>(
        null,
    );
    const [restoreConfirmationId, setRestoreConfirmationId] = useState<
        number | null
    >(null);

    useUnsavedChangesWarning(form.isDirty);

    // Applies a full content object (from a successful save, publish,
    // restore, or the editor choosing to load the other side of a
    // conflict) into every field this form tracks, including the two
    // image-picker fields that live in their own local state.
    function applyContent(next: PageContentAdmin) {
        form.setData({
            hero_heading: next.heroHeading,
            hero_subheading: next.heroSubheading,
            intro_heading: next.introHeading,
            intro_body: next.introBody,
            intro_image_media_id: next.introImage?.id ?? '',
            sections: next.sections,
            home_blocks: next.homeBlocks,
            show_team_section: next.showTeamSection,
            meta_title: next.metaTitle,
            meta_description: next.metaDescription,
            og_image_media_id: next.ogImage?.id ?? '',
        });
        setIntroImage(next.introImage);
        setOgImage(next.ogImage);
    }

    async function save() {
        setMessage('');
        setConflict(null);
        form.clearErrors();
        setSaving(true);
        try {
            const response = await fetch(`/admin/pages/${slug}`, {
                method: 'PUT',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    ...form.data,
                    intro_image_media_id: introImage?.id ?? '',
                    og_image_media_id: ogImage?.id ?? '',
                    base_revision_id: baseRevisionId,
                }),
            });
            const json = await response.json();

            if (response.status === 409) {
                setConflict(json as PageDraftConflictResponse);
                return;
            }
            if (response.status === 422) {
                const errors = json.errors as Record<string, string[]>;
                const flattened = Object.fromEntries(
                    Object.entries(errors).map(([field, messages]) => [
                        field,
                        messages[0],
                    ]),
                );
                // Laravel's array-validation error keys (e.g.
                // "sections.0.heading") are dynamic and can't be statically
                // typed against Inertia's FormDataKeys union — this cast is
                // the same escape hatch Inertia's own runtime accepts these
                // through, just made explicit here for our manual fetch.
                (form.setError as (errors: Record<string, string>) => void)(
                    flattened,
                );
                return;
            }
            if (!response.ok) {
                setMessage('Something went wrong. Please try again.');
                return;
            }

            const saved = json as PageDraftSaveResponse;
            setBaseRevisionId(saved.baseRevisionId);
            setHasUnpublishedChanges(saved.hasUnpublishedChanges);
            setRevisions(saved.revisions);
            form.setDefaults();
            setMessage('Draft saved. Not yet published.');
        } finally {
            setSaving(false);
        }
    }

    async function publishNow() {
        setMessage('');
        setConflict(null);
        setPublishing(true);
        try {
            const response = await fetch(`/admin/pages/${slug}/publish`, {
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

            const published = json as PagePublishResponse;
            setHasUnpublishedChanges(published.hasUnpublishedChanges);
            setRevisions(published.revisions);
            setMessage('Published. Changes are now live on the website.');
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
                `/admin/pages/${slug}/revisions/${revisionId}/restore`,
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
            const restored = (await response.json()) as PageRestoreResponse;
            applyContent(restored.content);
            setBaseRevisionId(restored.baseRevisionId);
            setHasUnpublishedChanges(restored.hasUnpublishedChanges);
            setRevisions(restored.revisions);
            setMessage('Restored as the current draft. Not yet published.');
        } finally {
            setRestoringId(null);
        }
    }

    function requestRestoreAsDraft(revisionId: number) {
        if (!hasUnpublishedChanges && !form.isDirty) {
            void restoreAsDraft(revisionId);
            return;
        }

        setRestoreConfirmationId(revisionId);
    }

    function loadConflictingVersion() {
        if (!conflict?.current) return;
        applyContent(conflict.current.content);
        setBaseRevisionId(conflict.current.revisionId);
        setHasUnpublishedChanges(conflict.current.status === 'draft');
        setConflict(null);
        setMessage(
            'Loaded the other version. Your prior edits in this form were replaced — review before saving again.',
        );
    }

    function updateSection(index: number, section: PageSection) {
        form.setData(
            'sections',
            form.data.sections.map((current, i) =>
                i === index ? section : current,
            ),
        );
    }

    function removeSection(index: number) {
        form.setData(
            'sections',
            form.data.sections.filter((_, i) => i !== index),
        );
    }

    const remainingErrors = Object.entries(form.errors).filter(
        ([field]) =>
            !INLINE_HANDLED_FIELDS.has(field) && !field.startsWith('sections.'),
    );

    return (
        <div className="grid max-w-2xl gap-6">
            <EditorSection title="Content">
                <div className="grid gap-2">
                    <Label htmlFor="hero-heading">Hero Heading</Label>
                    <Input
                        id="hero-heading"
                        value={form.data.hero_heading}
                        onChange={(event) =>
                            form.setData('hero_heading', event.target.value)
                        }
                        aria-invalid={!!form.errors.hero_heading}
                    />
                    <InputError message={form.errors.hero_heading} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="hero-subheading">Hero Subheading</Label>
                    <Textarea
                        id="hero-subheading"
                        className="field-sizing-fixed"
                        value={form.data.hero_subheading}
                        onChange={(event) =>
                            form.setData('hero_subheading', event.target.value)
                        }
                        aria-invalid={!!form.errors.hero_subheading}
                    />
                    <InputError message={form.errors.hero_subheading} />
                </div>

                {visibility.intro && (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="intro-heading">Intro Heading</Label>
                            <Input
                                id="intro-heading"
                                value={form.data.intro_heading}
                                onChange={(event) =>
                                    form.setData(
                                        'intro_heading',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!form.errors.intro_heading}
                            />
                            <InputError message={form.errors.intro_heading} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="intro-body">Intro Body</Label>
                            <Textarea
                                id="intro-body"
                                className="field-sizing-fixed"
                                value={form.data.intro_body}
                                onChange={(event) =>
                                    form.setData(
                                        'intro_body',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!form.errors.intro_body}
                            />
                            <InputError message={form.errors.intro_body} />
                        </div>
                    </>
                )}
                {visibility.introImage && (
                    <AssetPicker
                        label="Intro Image"
                        accept="image"
                        value={introImage}
                        onChange={setIntroImage}
                    />
                )}

                {visibility.sections && (
                    <div className="grid gap-3">
                        <Label>{visibility.sectionsLabel}</Label>
                        {form.data.sections.map((section, index) => (
                            <div
                                key={index}
                                className="grid gap-2 rounded-md border p-3"
                            >
                                <Input
                                    placeholder="Heading"
                                    value={section.heading}
                                    onChange={(event) =>
                                        updateSection(index, {
                                            ...section,
                                            heading: event.target.value,
                                        })
                                    }
                                />
                                <InputError
                                    message={
                                        form.errors[`sections.${index}.heading`]
                                    }
                                />
                                <Textarea
                                    className="field-sizing-fixed"
                                    placeholder="Description"
                                    value={section.description}
                                    onChange={(event) =>
                                        updateSection(index, {
                                            ...section,
                                            description: event.target.value,
                                        })
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-fit"
                                    onClick={() => removeSection(index)}
                                >
                                    Remove {sectionSingular}
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-fit"
                            onClick={() =>
                                form.setData('sections', [
                                    ...form.data.sections,
                                    { ...emptySection },
                                ])
                            }
                        >
                            Add {sectionSingular}
                        </Button>
                    </div>
                )}

                {slug === 'home' && (
                    <HomeBlocksEditor
                        value={form.data.home_blocks}
                        onChange={(next) => form.setData('home_blocks', next)}
                    />
                )}

                {visibility.showTeamToggle && (
                    <div className="grid gap-2 rounded-md border p-3">
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={form.data.show_team_section}
                                onCheckedChange={(checked) =>
                                    form.setData(
                                        'show_team_section',
                                        checked === true,
                                    )
                                }
                            />
                            Show the Team section on this page
                        </label>
                        {/*
                            CMS-03: "placed on the page" (this toggle) and
                            "published" (a team member's own status in Team)
                            are two independent things — a reader unfamiliar
                            with the distinction could easily assume this
                            checkbox alone makes team members appear.
                        */}
                        <p className="text-muted-foreground text-sm">
                            This only controls whether the team section is{' '}
                            <strong>placed on this page</strong>. It does not
                            publish anyone — a team member must separately be
                            marked <strong>Published</strong> in Team to
                            actually show here.
                        </p>
                        {form.data.show_team_section &&
                            publishedTeamMemberCount === 0 && (
                                <p
                                    role="alert"
                                    className="text-sm text-amber-600 dark:text-amber-500"
                                >
                                    This section is placed on the page, but
                                    there are currently no published team
                                    members — no published team members will
                                    show until at least one is published in
                                    Team.
                                </p>
                            )}
                    </div>
                )}
            </EditorSection>

            <EditorSection
                title="SEO"
                description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            >
                <div className="grid gap-2">
                    <Label htmlFor="meta-title">
                        Meta Title
                        <span className="text-muted-foreground font-normal">
                            {' '}
                            (shown as the page title in search results; defaults
                            to the hero heading if left blank)
                        </span>
                    </Label>
                    <Input
                        id="meta-title"
                        maxLength={255}
                        value={form.data.meta_title}
                        onChange={(event) =>
                            form.setData('meta_title', event.target.value)
                        }
                        aria-invalid={!!form.errors.meta_title}
                    />
                    <InputError message={form.errors.meta_title} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="meta-description">
                        Meta Description
                        <span className="text-muted-foreground font-normal">
                            {' '}
                            (shown as the snippet in search results, ideally
                            under 160 characters)
                        </span>
                    </Label>
                    <Textarea
                        id="meta-description"
                        className="field-sizing-fixed"
                        maxLength={320}
                        value={form.data.meta_description}
                        onChange={(event) =>
                            form.setData('meta_description', event.target.value)
                        }
                        aria-invalid={!!form.errors.meta_description}
                    />
                    <InputError message={form.errors.meta_description} />
                </div>
                <AssetPicker
                    label="Social Share Image"
                    accept="image"
                    value={ogImage}
                    onChange={setOgImage}
                />
            </EditorSection>

            <EditorSection
                title="Publishing"
                description="Save creates a draft only — nothing on the public site changes until you Publish."
            >
                <div className="flex flex-wrap items-center gap-3">
                    <Button asChild variant="secondary" className="w-full">
                        <a href={previewUrl} target="_blank" rel="noreferrer">
                            Preview Draft
                        </a>
                    </Button>
                </div>

                {revisions.length > 0 && (
                    <div className="grid gap-2">
                        <Label>Revision history</Label>
                        <ul className="grid gap-2">
                            {revisions.map((revision) => (
                                <li
                                    key={revision.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                                >
                                    <span className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                revision.status === 'published'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {revision.status}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                            {revision.authorName} ·{' '}
                                            {formatDateTime(revision.createdAt)}
                                        </span>
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={restoringId !== null}
                                        onClick={() =>
                                            requestRestoreAsDraft(revision.id)
                                        }
                                    >
                                        {restoringId === revision.id
                                            ? 'Restoring…'
                                            : 'Restore As Draft'}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </EditorSection>

            {conflict && (
                <div
                    role="alert"
                    className="grid gap-3 rounded-lg border border-amber-500 bg-amber-50 p-4 text-sm dark:bg-amber-950/40"
                >
                    <p className="font-medium">{conflict.message}</p>
                    {conflict.current && (
                        <>
                            <p className="text-muted-foreground">
                                Current version ({conflict.current.status}) by{' '}
                                {conflict.current.authorName},{' '}
                                {formatDateTime(conflict.current.updatedAt)}:
                            </p>
                            <ul className="grid list-disc gap-1 pl-5">
                                {diffFields(
                                    content,
                                    conflict.current.content,
                                ).map((diff) => (
                                    <li key={diff.field}>
                                        <span className="font-medium">
                                            {diff.label}
                                        </span>{' '}
                                        changed
                                        {diff.after && (
                                            <> — theirs: “{diff.after}”</>
                                        )}
                                    </li>
                                ))}
                                {diffFields(content, conflict.current.content)
                                    .length === 0 && (
                                    <li>
                                        No visible field differences (the
                                        conflict is with a revision id only).
                                    </li>
                                )}
                            </ul>
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
                                Your edits above are unchanged — save again
                                (using their revision as the new base) once
                                you've reconciled the two.
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
            <div className="grid gap-3">
                <div
                    className={
                        canPublish ? 'grid grid-cols-2 gap-3' : 'grid gap-3'
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
                                saving || publishing || !hasUnpublishedChanges
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
                    isDirty={form.isDirty}
                    savedMessage={message}
                />
            </div>
            <ConfirmationDialog
                open={restoreConfirmationId !== null}
                title="Restore Draft"
                description="Restoring Will Replace The Current Draft With This Older Version. Any Changes Not Yet Saved As A Draft Will Be Lost."
                confirmLabel="Restore Draft"
                onOpenChange={(open) => {
                    if (!open) setRestoreConfirmationId(null);
                }}
                onConfirm={() => {
                    if (restoreConfirmationId !== null) {
                        void restoreAsDraft(restoreConfirmationId);
                    }
                    setRestoreConfirmationId(null);
                }}
            />
        </div>
    );
}
