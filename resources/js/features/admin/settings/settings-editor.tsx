import { useForm } from '@inertiajs/react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import {
    createColumnHelper,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import {
    MediaPicker,
    type MediaPickerValue,
} from '@/components/admin/media-picker';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { PalettePicker } from '@/components/admin/palette-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/admin/confirmation-dialog';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { Dialog, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/ui/data-table';
import {
    MARKETING_COLOR_TOKENS,
    MARKETING_DEFAULT_COLORS,
    MARKETING_PRESETS,
    titleCase,
} from '@/lib/marketing-theme';
import type {
    MarketingThemeColors,
    MenuEntry,
    Settings,
    SiteValues,
    SocialEntry,
} from '@/types/site-settings';

type MarketingColorRow = {
    key: keyof MarketingThemeColors;
    label: string;
    defaultValue: string;
    defaultLabel: string;
    override: string;
    onPaletteChange: (value: string | null) => void;
    onCustomChange: (value: string) => void;
};

const marketingColorTableFeatures = tableFeatures({});
const marketingColorColumnHelper = createColumnHelper<
    typeof marketingColorTableFeatures,
    MarketingColorRow
>();
const marketingColorColumns = marketingColorColumnHelper.columns([
    marketingColorColumnHelper.accessor('label', {
        header: 'Colour',
        cell: (info) => {
            const row = info.row.original;
            return (
                <div className="flex items-center gap-2">
                    <span
                        className="size-4 shrink-0 rounded-sm border"
                        style={{
                            backgroundColor: row.override || row.defaultValue,
                        }}
                    />
                    <span>{row.label}</span>
                </div>
            );
        },
    }),
    marketingColorColumnHelper.accessor('defaultLabel', {
        header: 'Palette',
        cell: (info) => {
            const row = info.row.original;
            return (
                <PalettePicker
                    value={row.override}
                    defaultValue={row.defaultValue}
                    defaultLabel={row.defaultLabel}
                    onChange={row.onPaletteChange}
                />
            );
        },
    }),
    marketingColorColumnHelper.accessor('override', {
        header: 'Custom Colour',
        cell: (info) => {
            const row = info.row.original;
            return (
                <ColorPicker
                    label={row.label}
                    value={row.override}
                    defaultValue={row.defaultValue}
                    onChange={row.onCustomChange}
                />
            );
        },
    }),
]);

function SortableMenuItem({
    item,
    onEdit,
    onDelete,
}: {
    item: MenuEntry;
    onEdit: (item: MenuEntry) => void;
    onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: item.id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={`flex items-center justify-between border-b py-3 ${item.parentId ? 'pl-6' : ''}`}
        >
            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    className="text-muted-foreground cursor-grab touch-none"
                    aria-label={`Drag ${item.label || 'Menu Item'}`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="size-4" />
                </button>
                <div className="min-w-0">
                    <p className="text-sm">
                        {item.label}
                        {item.childrenSource === 'services'
                            ? ' · Published Services'
                            : ''}
                    </p>
                    <p className="text-muted-foreground text-xs">{item.link}</p>
                </div>
            </div>
            <div className="flex shrink-0">
                <Button variant="ghost" onClick={() => onEdit(item)}>
                    Edit
                </Button>
                <Button variant="ghost" onClick={() => onDelete(item.id)}>
                    Delete
                </Button>
            </div>
        </div>
    );
}

function mediaValue(url: string, fileName: string): MediaPickerValue {
    return url
        ? {
              id: `existing-${fileName.toLowerCase().replaceAll(' ', '-')}`,
              url,
              fileName,
          }
        : null;
}

export type SettingsEditorHandle = {
    openCreate: () => void;
};

export const SettingsEditor = forwardRef<
    SettingsEditorHandle,
    {
        section: string;
        settings: Settings;
    }
>(function SettingsEditor({ section, settings }, ref) {
    const form = useForm(settings);
    const [message, setMessage] = useState('');
    const [menuDraft, setMenuDraft] = useState<MenuEntry | null>(null);
    const [socialDraft, setSocialDraft] = useState<SocialEntry | null>(null);
    const [dialogError, setDialogError] = useState('');
    const [defaultOgImage, setDefaultOgImage] = useState<MediaPickerValue>(() =>
        mediaValue(settings.site.defaultOgImage, 'Social Share Image'),
    );
    const [organisationLogo, setOrganisationLogo] = useState<MediaPickerValue>(
        () => mediaValue(settings.site.organizationLogo, 'Organisation Logo'),
    );
    const [menuDeletionId, setMenuDeletionId] = useState<string | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    function openCreate() {
        setDialogError('');

        if (section === 'menu') {
            setMenuDraft({
                id: crypto.randomUUID(),
                label: '',
                link: '',
                section: 'header',
                parentId: null,
                sortOrder: form.data.menu.length,
                childrenSource: 'manual',
            });
            return;
        }

        if (section === 'social-links') {
            setSocialDraft({
                id: crypto.randomUUID(),
                platform: '',
                url: '',
                sortOrder: form.data.socialLinks.length,
            });
        }
    }

    useImperativeHandle(ref, () => ({ openCreate }));

    function reorderMenuItems(
        section: MenuEntry['section'],
        activeId: string,
        overId: string,
    ) {
        if (activeId === overId) return;

        const entries = form.data.menu
            .filter((entry) => entry.section === section)
            .sort((a, b) => a.sortOrder - b.sortOrder);
        const from = entries.findIndex((entry) => entry.id === activeId);
        const to = entries.findIndex((entry) => entry.id === overId);

        if (from < 0 || to < 0) return;

        const reordered = arrayMove(entries, from, to).map((entry, index) => ({
            ...entry,
            sortOrder: index,
        }));

        form.setData('menu', [
            ...form.data.menu.filter((entry) => entry.section !== section),
            ...reordered,
        ]);
    }

    function saveMenuDraft() {
        if (!menuDraft) return;

        if (!menuDraft.label.trim() || !menuDraft.link.trim()) {
            setDialogError('Enter A Label And Destination.');
            return;
        }

        form.setData('menu', [
            ...form.data.menu.filter((item) => item.id !== menuDraft.id),
            menuDraft,
        ]);
        setMenuDraft(null);
    }

    function saveSocialDraft() {
        if (!socialDraft) return;

        if (!socialDraft.platform.trim() || !socialDraft.url.trim()) {
            setDialogError('Enter A Platform And URL.');
            return;
        }

        form.setData('socialLinks', [
            ...form.data.socialLinks.filter(
                (item) => item.id !== socialDraft.id,
            ),
            socialDraft,
        ]);
        setSocialDraft(null);
    }

    function save() {
        setMessage('');
        form.put(`/admin/settings/${section}`, {
            preserveScroll: true,
            onSuccess: () =>
                setMessage('Saved. Changes are now available on the website.'),
        });
    }
    function setSiteField<Key extends keyof SiteValues>(
        key: Key,
        value: SiteValues[Key],
    ) {
        form.setData('site', { ...form.data.site, [key]: value });
    }

    function setMarketingField<Key extends 'preset' | 'mode'>(
        key: Key,
        value: SiteValues['marketingTheme'][Key],
    ) {
        form.setData('site', {
            ...form.data.site,
            marketingTheme: { ...form.data.site.marketingTheme, [key]: value },
        });
    }

    function setMarketingColor(
        key: keyof SiteValues['marketingTheme']['colors'],
        value: string | null,
    ) {
        form.setData('site', {
            ...form.data.site,
            marketingTheme: {
                ...form.data.site.marketingTheme,
                colors: {
                    ...form.data.site.marketingTheme.colors,
                    [key]: value,
                },
            },
        });
    }

    const marketingOverride = (
        key: keyof SiteValues['marketingTheme']['colors'],
    ) => form.data.site.marketingTheme.colors[key] ?? '';

    const marketingDefault = (
        key: keyof SiteValues['marketingTheme']['colors'],
    ) =>
        MARKETING_DEFAULT_COLORS[form.data.site.marketingTheme.preset][key] ??
        '#000000';

    const marketingColorRows: MarketingColorRow[] = MARKETING_COLOR_TOKENS.map(
        (token) => ({
            key: token.key,
            label: titleCase(token.label),
            defaultValue: marketingDefault(token.key),
            defaultLabel: titleCase(form.data.site.marketingTheme.preset),
            override: marketingOverride(token.key),
            onPaletteChange: (value) => setMarketingColor(token.key, value),
            onCustomChange: (value) =>
                setMarketingColor(token.key, value || null),
        }),
    );
    const marketingColorTable = useTable({
        features: marketingColorTableFeatures,
        columns: marketingColorColumns,
        data: marketingColorRows,
    });
    return (
        <div className="space-y-6">
            {section === 'site' && (
                <div>
                    <section className="grid gap-4 pb-8">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="organisation-name">
                                    Organisation Name
                                </Label>
                                <Input
                                    id="organisation-name"
                                    value={form.data.site.organizationName}
                                    onChange={(event) =>
                                        setSiteField(
                                            'organizationName',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="copyright-line">
                                    Copyright Line
                                </Label>
                                <Input
                                    id="copyright-line"
                                    value={form.data.site.copyrightLine}
                                    onChange={(event) =>
                                        setSiteField(
                                            'copyrightLine',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <MediaPicker
                                label="Organisation Logo"
                                accept="image"
                                value={organisationLogo}
                                onChange={(media) => {
                                    setOrganisationLogo(media);
                                    setSiteField(
                                        'organizationLogo',
                                        media?.url ?? '',
                                    );
                                }}
                            />
                            <MediaPicker
                                label="Default Social Share Image"
                                accept="image"
                                value={defaultOgImage}
                                onChange={(media) => {
                                    setDefaultOgImage(media);
                                    setSiteField(
                                        'defaultOgImage',
                                        media?.url ?? '',
                                    );
                                }}
                            />
                        </div>
                    </section>

                    <Separator />

                    <section className="grid gap-3 py-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-base font-medium">
                                    Social Links
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Links shown on the public marketing website.
                                </p>
                            </div>
                            <Button variant="secondary" onClick={openCreate}>
                                New Social Link
                            </Button>
                        </div>
                        {form.data.socialLinks.length === 0 && (
                            <p className="text-muted-foreground text-sm">
                                No social links configured.
                            </p>
                        )}
                        {[...form.data.socialLinks]
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between border-b py-3"
                                >
                                    <div>
                                        <p>{s.platform}</p>
                                        <p className="text-muted-foreground text-sm">
                                            {s.url} · Order {s.sortOrder}
                                        </p>
                                    </div>
                                    <div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setDialogError('');
                                                setSocialDraft({ ...s });
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                form.setData(
                                                    'socialLinks',
                                                    form.data.socialLinks.filter(
                                                        (x) => x.id !== s.id,
                                                    ),
                                                )
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                    </section>

                    <Separator />

                    <section className="grid gap-2 py-8">
                        <div className="grid gap-2">
                            <Label htmlFor="footer-text">Footer Text</Label>
                            <Textarea
                                id="footer-text"
                                className="field-sizing-fixed"
                                value={form.data.site.footerText}
                                onChange={(event) =>
                                    setSiteField(
                                        'footerText',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                    </section>

                    <Separator />

                    <div className="flex items-center justify-end gap-2 py-8">
                        <Checkbox
                            id="feedbackEnabled"
                            checked={form.data.site.feedbackEnabled}
                            onCheckedChange={(checked) =>
                                setSiteField(
                                    'feedbackEnabled',
                                    checked === true,
                                )
                            }
                        />
                        <Label htmlFor="feedbackEnabled" className="text-base">
                            Show Feedback
                        </Label>
                    </div>
                </div>
            )}
            {section === 'appearance' && (
                <div className="space-y-8">
                    <section className="grid gap-5">
                        <div className="grid gap-1">
                            <h2 className="text-base font-medium">
                                Marketing Theme
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                These settings affect the public marketing
                                website only. Your admin theme is controlled by
                                your account appearance preference.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="marketing-preset">
                                    Colour Theme
                                </Label>
                                <Select
                                    value={form.data.site.marketingTheme.preset}
                                    onValueChange={(value) =>
                                        setMarketingField(
                                            'preset',
                                            value as SiteValues['marketingTheme']['preset'],
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="marketing-preset"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MARKETING_PRESETS.map((preset) => (
                                            <SelectItem
                                                key={preset.value}
                                                value={preset.value}
                                            >
                                                {preset.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="marketing-mode">
                                    Colour Mode
                                </Label>
                                <Select
                                    value={form.data.site.marketingTheme.mode}
                                    onValueChange={(value) =>
                                        setMarketingField(
                                            'mode',
                                            value as SiteValues['marketingTheme']['mode'],
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="marketing-mode"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="system">
                                            Follow visitor preference
                                        </SelectItem>
                                        <SelectItem value="light">
                                            Always light
                                        </SelectItem>
                                        <SelectItem value="dark">
                                            Always dark
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </section>
                    <DataTable table={marketingColorTable} showHeader={false} />
                </div>
            )}
            {section === 'menu' && (
                <>
                    {(['header', 'footer'] as const).map((area) => (
                        <section key={area} className="grid gap-3">
                            <h2 className="text-base font-medium">
                                {area === 'header'
                                    ? 'Header Menu'
                                    : 'Footer Menu'}
                            </h2>
                            <DndContext
                                sensors={sensors}
                                onDragEnd={({ active, over }) => {
                                    if (over) {
                                        reorderMenuItems(
                                            area,
                                            String(active.id),
                                            String(over.id),
                                        );
                                    }
                                }}
                            >
                                <SortableContext
                                    items={form.data.menu
                                        .filter((item) => item.section === area)
                                        .sort(
                                            (a, b) => a.sortOrder - b.sortOrder,
                                        )
                                        .map((item) => item.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {form.data.menu
                                        .filter((item) => item.section === area)
                                        .sort(
                                            (a, b) => a.sortOrder - b.sortOrder,
                                        )
                                        .map((item) => (
                                            <SortableMenuItem
                                                key={item.id}
                                                item={item}
                                                onEdit={(entry) => {
                                                    setDialogError('');
                                                    setMenuDraft({ ...entry });
                                                }}
                                                onDelete={setMenuDeletionId}
                                            />
                                        ))}
                                </SortableContext>
                            </DndContext>
                        </section>
                    ))}
                </>
            )}
            {section === 'social-links' && (
                <section className="grid gap-3">
                    <h2 className="text-base font-medium">Social Links</h2>
                    {form.data.socialLinks.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                            No social links configured.
                        </p>
                    )}
                    {[...form.data.socialLinks]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between border-b py-3"
                            >
                                <div>
                                    <p>{s.platform}</p>
                                    <p className="text-muted-foreground text-sm">
                                        {s.url} · Order {s.sortOrder}
                                    </p>
                                </div>
                                <div>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setDialogError('');
                                            setSocialDraft({ ...s });
                                        }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() =>
                                            form.setData(
                                                'socialLinks',
                                                form.data.socialLinks.filter(
                                                    (x) => x.id !== s.id,
                                                ),
                                            )
                                        }
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                </section>
            )}
            {Object.entries(form.errors).length > 0 && (
                <div role="alert" className="text-destructive text-sm">
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p key={key}>
                            {key}: {error}
                        </p>
                    ))}
                </div>
            )}
            <div role="status" className="text-sm">
                {message}
            </div>
            <Button disabled={form.processing} onClick={save}>
                {form.processing ? 'Saving…' : 'Save Changes'}
            </Button>
            <Dialog
                open={menuDraft !== null}
                onOpenChange={(open) => !open && setMenuDraft(null)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={
                            menuDraft &&
                            form.data.menu.some(
                                (item) => item.id === menuDraft.id,
                            )
                                ? 'Edit Menu Item'
                                : 'New Menu Item'
                        }
                    />
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveMenuDraft();
                        }}
                        className="space-y-4"
                    >
                        {menuDraft && (
                            <div className="grid gap-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="menu-label">
                                            Label
                                        </Label>
                                        <Input
                                            id="menu-label"
                                            value={menuDraft.label}
                                            onChange={(e) =>
                                                setMenuDraft({
                                                    ...menuDraft,
                                                    label: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="menu-destination">
                                            Destination
                                        </Label>
                                        <Input
                                            id="menu-destination"
                                            value={menuDraft.link}
                                            placeholder="/contact"
                                            onChange={(e) =>
                                                setMenuDraft({
                                                    ...menuDraft,
                                                    link: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="menu-order">
                                            Display Order
                                        </Label>
                                        <Input
                                            id="menu-order"
                                            type="number"
                                            min="0"
                                            value={menuDraft.sortOrder}
                                            onChange={(e) =>
                                                setMenuDraft({
                                                    ...menuDraft,
                                                    sortOrder: Number(
                                                        e.target.value,
                                                    ),
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="menu-section">
                                            Menu Section
                                        </Label>
                                        <Select
                                            value={menuDraft.section}
                                            onValueChange={(value) =>
                                                setMenuDraft({
                                                    ...menuDraft,
                                                    section:
                                                        value as MenuEntry['section'],
                                                    parentId: null,
                                                })
                                            }
                                        >
                                            <SelectTrigger
                                                id="menu-section"
                                                className="w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="header">
                                                    Header
                                                </SelectItem>
                                                <SelectItem value="footer">
                                                    Footer
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="menu-parent">Parent</Label>
                                    <Select
                                        value={menuDraft.parentId ?? 'none'}
                                        onValueChange={(value) =>
                                            setMenuDraft({
                                                ...menuDraft,
                                                parentId:
                                                    value === 'none'
                                                        ? null
                                                        : value,
                                                childrenSource: 'manual',
                                            })
                                        }
                                    >
                                        <SelectTrigger
                                            id="menu-parent"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                None (top-level)
                                            </SelectItem>
                                            {form.data.menu
                                                .filter(
                                                    (m) =>
                                                        m.id !== menuDraft.id &&
                                                        m.parentId === null &&
                                                        m.section ===
                                                            menuDraft.section &&
                                                        m.childrenSource ===
                                                            'manual',
                                                )
                                                .map((m) => (
                                                    <SelectItem
                                                        value={m.id}
                                                        key={m.id}
                                                    >
                                                        {m.label}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {menuDraft.parentId === null && (
                                    <div className="space-y-2">
                                        <Label htmlFor="menu-children">
                                            Children
                                        </Label>
                                        <Select
                                            value={menuDraft.childrenSource}
                                            onValueChange={(value) =>
                                                setMenuDraft({
                                                    ...menuDraft,
                                                    childrenSource:
                                                        value as MenuEntry['childrenSource'],
                                                })
                                            }
                                        >
                                            <SelectTrigger
                                                id="menu-children"
                                                className="w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manual">
                                                    Manually managed
                                                </SelectItem>
                                                <SelectItem value="services">
                                                    Published services
                                                    (automatic)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                        {dialogError && (
                            <p role="alert" className="text-destructive">
                                {dialogError}
                            </p>
                        )}
                        <AdminDialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" variant="secondary">
                                Save Changes
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
            <ConfirmationDialog
                open={menuDeletionId !== null}
                title="Remove Menu Item"
                description="This Will Remove The Menu Item And Any Items Nested Beneath It. Save Changes To Apply The Update."
                confirmLabel="Remove Menu Item"
                onOpenChange={(open) => {
                    if (!open) setMenuDeletionId(null);
                }}
                onConfirm={() => {
                    if (menuDeletionId !== null) {
                        form.setData(
                            'menu',
                            form.data.menu.filter(
                                (item) =>
                                    item.id !== menuDeletionId &&
                                    item.parentId !== menuDeletionId,
                            ),
                        );
                    }
                    setMenuDeletionId(null);
                }}
            />
            <Dialog
                open={socialDraft !== null}
                onOpenChange={(open) => !open && setSocialDraft(null)}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={
                            socialDraft &&
                            form.data.socialLinks.some(
                                (item) => item.id === socialDraft.id,
                            )
                                ? 'Edit Social Link'
                                : 'New Social Link'
                        }
                    />
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveSocialDraft();
                        }}
                        className="space-y-4"
                    >
                        {socialDraft && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="social-platform">
                                        Platform
                                    </Label>
                                    <Input
                                        id="social-platform"
                                        value={socialDraft.platform}
                                        onChange={(e) =>
                                            setSocialDraft({
                                                ...socialDraft,
                                                platform: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="social-url">URL</Label>
                                    <Input
                                        id="social-url"
                                        value={socialDraft.url}
                                        onChange={(e) =>
                                            setSocialDraft({
                                                ...socialDraft,
                                                url: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="social-order">
                                        Display Order
                                    </Label>
                                    <Input
                                        id="social-order"
                                        type="number"
                                        min="0"
                                        value={socialDraft.sortOrder}
                                        onChange={(e) =>
                                            setSocialDraft({
                                                ...socialDraft,
                                                sortOrder: Number(
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        )}
                        {dialogError && (
                            <p role="alert" className="text-destructive">
                                {dialogError}
                            </p>
                        )}
                        <AdminDialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" variant="secondary">
                                Save Changes
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
        </div>
    );
});
