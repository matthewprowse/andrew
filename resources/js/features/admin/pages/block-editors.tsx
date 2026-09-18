import { useState } from 'react';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { MediaPicker } from '@/components/admin/media-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose } from '@/components/ui/dialog';
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
import type {
    BlockDataMap,
    CardsBlockData,
    CtaBlockData,
    FaqBlockData,
    HeroBlockData,
    ImageTextBlockData,
    OpenPositionsBlockData,
    PageBlock,
    ResourcesPromoBlockData,
    ServicesGridBlockData,
    StandardsBlockData,
    StatsBlockData,
    TeamBlockData,
    TestimonialsBlockData,
    TextBlockData,
    TextWithListBlockData,
} from '@/types/blocks';

function Field({
    label,
    htmlFor,
    hint,
    children,
}: {
    label: string;
    htmlFor: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
        </div>
    );
}

/** Fixed notice for blocks whose content comes from elsewhere in the admin. */
function ManagedElsewhere({ where }: { where: string }) {
    return (
        <p className="text-muted-foreground text-sm">
            The items shown here are managed under {where}. This block only
            controls the heading and intro text.
        </p>
    );
}

function HeroEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: HeroBlockData;
    onChange: (data: HeroBlockData) => void;
}) {
    return (
        <div className="grid gap-4">
            <Field label="Layout" htmlFor={`${id}-layout`}>
                <Select
                    value={data.layout}
                    onValueChange={(value) =>
                        onChange({
                            ...data,
                            layout: value as HeroBlockData['layout'],
                        })
                    }
                >
                    <SelectTrigger id={`${id}-layout`} className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="split">
                            Split: heading and text side by side
                        </SelectItem>
                        <SelectItem value="centered">
                            Centered: everything stacked in the middle
                        </SelectItem>
                    </SelectContent>
                </Select>
            </Field>
            <Field label="Eyebrow (optional)" htmlFor={`${id}-eyebrow`}>
                <Input
                    id={`${id}-eyebrow`}
                    placeholder="Relocation Africa"
                    value={data.eyebrow}
                    onChange={(e) =>
                        onChange({ ...data, eyebrow: e.target.value })
                    }
                />
            </Field>
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <Field label="Subheading" htmlFor={`${id}-subheading`}>
                <Textarea
                    id={`${id}-subheading`}
                    className="field-sizing-fixed"
                    value={data.subheading}
                    onChange={(e) =>
                        onChange({ ...data, subheading: e.target.value })
                    }
                />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Primary button label" htmlFor={`${id}-plabel`}>
                    <Input
                        id={`${id}-plabel`}
                        value={data.primaryLabel}
                        onChange={(e) =>
                            onChange({ ...data, primaryLabel: e.target.value })
                        }
                    />
                </Field>
                <Field label="Primary button link" htmlFor={`${id}-plink`}>
                    <Input
                        id={`${id}-plink`}
                        value={data.primaryLink}
                        placeholder="/contact"
                        onChange={(e) =>
                            onChange({ ...data, primaryLink: e.target.value })
                        }
                    />
                </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Secondary button label" htmlFor={`${id}-slabel`}>
                    <Input
                        id={`${id}-slabel`}
                        value={data.secondaryLabel}
                        onChange={(e) =>
                            onChange({
                                ...data,
                                secondaryLabel: e.target.value,
                            })
                        }
                    />
                </Field>
                <Field label="Secondary button link" htmlFor={`${id}-slink`}>
                    <Input
                        id={`${id}-slink`}
                        value={data.secondaryLink}
                        placeholder="#services"
                        onChange={(e) =>
                            onChange({
                                ...data,
                                secondaryLink: e.target.value,
                            })
                        }
                    />
                </Field>
            </div>
            {data.layout === 'split' && (
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={data.showServicesNav}
                        onCheckedChange={(checked) =>
                            onChange({
                                ...data,
                                showServicesNav: checked === true,
                            })
                        }
                    />
                    Show a strip of service links under the hero
                </label>
            )}
        </div>
    );
}

function TextEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: TextBlockData;
    onChange: (data: TextBlockData) => void;
}) {
    return (
        <div className="grid gap-4">
            <Field label="Eyebrow (optional)" htmlFor={`${id}-eyebrow`}>
                <Input
                    id={`${id}-eyebrow`}
                    value={data.eyebrow}
                    onChange={(e) =>
                        onChange({ ...data, eyebrow: e.target.value })
                    }
                />
            </Field>
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <Field label="Body" htmlFor={`${id}-body`}>
                <Textarea
                    id={`${id}-body`}
                    className="field-sizing-fixed"
                    rows={5}
                    value={data.body}
                    onChange={(e) =>
                        onChange({ ...data, body: e.target.value })
                    }
                />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Link label (optional)" htmlFor={`${id}-llabel`}>
                    <Input
                        id={`${id}-llabel`}
                        value={data.linkLabel}
                        onChange={(e) =>
                            onChange({ ...data, linkLabel: e.target.value })
                        }
                    />
                </Field>
                <Field label="Link URL" htmlFor={`${id}-lurl`}>
                    <Input
                        id={`${id}-lurl`}
                        value={data.linkUrl}
                        onChange={(e) =>
                            onChange({ ...data, linkUrl: e.target.value })
                        }
                    />
                </Field>
            </div>
        </div>
    );
}

function CardsEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: CardsBlockData;
    onChange: (data: CardsBlockData) => void;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [draft, setDraft] = useState({ title: '', text: '' });

    function openCard(index?: number) {
        const item =
            index === undefined ? { title: '', text: '' } : data.items[index];
        setEditingIndex(index ?? null);
        setDraft(item);
        setDialogOpen(true);
    }

    function saveCard() {
        onChange({
            ...data,
            items:
                editingIndex === null
                    ? [...data.items, draft]
                    : data.items.map((item, index) =>
                          index === editingIndex ? draft : item,
                      ),
        });
        setDialogOpen(false);
    }

    return (
        <div className="grid gap-4">
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <Field label="Intro (optional)" htmlFor={`${id}-intro`}>
                <Textarea
                    id={`${id}-intro`}
                    className="field-sizing-fixed"
                    value={data.intro}
                    onChange={(e) =>
                        onChange({ ...data, intro: e.target.value })
                    }
                />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Style" htmlFor={`${id}-style`}>
                    <Select
                        value={data.style}
                        onValueChange={(value) =>
                            onChange({
                                ...data,
                                style: value as CardsBlockData['style'],
                            })
                        }
                    >
                        <SelectTrigger id={`${id}-style`} className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="icons">
                                Icons: muted band, icon per card
                            </SelectItem>
                            <SelectItem value="list">
                                List: plain bordered list
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <Field label="Columns" htmlFor={`${id}-columns`}>
                    <Select
                        value={String(data.columns)}
                        onValueChange={(value) =>
                            onChange({
                                ...data,
                                columns: (value === '2' ? 2 : 3) as 2 | 3,
                            })
                        }
                    >
                        <SelectTrigger id={`${id}-columns`} className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
            </div>
            <div className="grid gap-3">
                <Label>Cards</Label>
                <div className="divide-y border-y">
                    {data.items.map((item, index) => (
                        <button
                            key={index}
                            type="button"
                            className="hover:bg-muted grid w-full gap-1 px-3 py-3 text-left transition-colors"
                            onClick={() => openCard(index)}
                        >
                            <span className="text-sm font-medium">
                                {item.title || 'Untitled Card'}
                            </span>
                            <span className="text-muted-foreground line-clamp-2 text-sm">
                                {item.text || 'Add card copy'}
                            </span>
                        </button>
                    ))}
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-fit"
                    onClick={() => openCard()}
                >
                    Add Card
                </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={editingIndex === null ? 'New Card' : 'Edit Card'}
                    />
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveCard();
                        }}
                    >
                        <Field label="Title" htmlFor={`${id}-card-title`}>
                            <Input
                                id={`${id}-card-title`}
                                value={draft.title}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        title: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <Field label="Text" htmlFor={`${id}-card-text`}>
                            <Textarea
                                id={`${id}-card-text`}
                                className="field-sizing-fixed"
                                value={draft.text}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        text: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <AdminDialogFooter>
                            {editingIndex !== null && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive mr-auto"
                                    onClick={() => {
                                        onChange({
                                            ...data,
                                            items: data.items.filter(
                                                (_, index) =>
                                                    index !== editingIndex,
                                            ),
                                        });
                                        setDialogOpen(false);
                                    }}
                                >
                                    Remove
                                </Button>
                            )}
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" variant="secondary">
                                Save Card
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
        </div>
    );
}

function HeadingIntroEditor({
    id,
    data,
    onChange,
    managedWhere,
    showIntro = true,
}: {
    id: string;
    data: { heading: string; intro?: string };
    onChange: (data: { heading: string; intro?: string }) => void;
    managedWhere: string;
    showIntro?: boolean;
}) {
    return (
        <div className="grid gap-4">
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            {showIntro && (
                <Field label="Intro (optional)" htmlFor={`${id}-intro`}>
                    <Textarea
                        id={`${id}-intro`}
                        className="field-sizing-fixed"
                        value={data.intro ?? ''}
                        onChange={(e) =>
                            onChange({ ...data, intro: e.target.value })
                        }
                    />
                </Field>
            )}
            <ManagedElsewhere where={managedWhere} />
        </div>
    );
}

function CtaEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: CtaBlockData;
    onChange: (data: CtaBlockData) => void;
}) {
    return (
        <div className="grid gap-4">
            <p className="text-muted-foreground text-sm">
                Leave a field blank to use the site's default call-to-action
                from Company › Settings.
            </p>
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <Field label="Description" htmlFor={`${id}-description`}>
                <Textarea
                    id={`${id}-description`}
                    className="field-sizing-fixed"
                    value={data.description}
                    onChange={(e) =>
                        onChange({ ...data, description: e.target.value })
                    }
                />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Button label" htmlFor={`${id}-label`}>
                    <Input
                        id={`${id}-label`}
                        value={data.buttonLabel}
                        onChange={(e) =>
                            onChange({ ...data, buttonLabel: e.target.value })
                        }
                    />
                </Field>
                <Field label="Button link" htmlFor={`${id}-link`}>
                    <Input
                        id={`${id}-link`}
                        value={data.buttonLink}
                        onChange={(e) =>
                            onChange({ ...data, buttonLink: e.target.value })
                        }
                    />
                </Field>
            </div>
        </div>
    );
}

function TextWithListEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: TextWithListBlockData;
    onChange: (data: TextWithListBlockData) => void;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [draft, setDraft] = useState({ title: '', text: '' });

    function openItem(index?: number) {
        const item =
            index === undefined ? { title: '', text: '' } : data.items[index];
        setEditingIndex(index ?? null);
        setDraft(item);
        setDialogOpen(true);
    }

    function saveItem() {
        onChange({
            ...data,
            items:
                editingIndex === null
                    ? [...data.items, draft]
                    : data.items.map((item, index) =>
                          index === editingIndex ? draft : item,
                      ),
        });
        setDialogOpen(false);
    }

    return (
        <div className="grid gap-4">
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <Field label="Body" htmlFor={`${id}-body`}>
                <Textarea
                    id={`${id}-body`}
                    className="field-sizing-fixed"
                    value={data.body}
                    onChange={(e) =>
                        onChange({ ...data, body: e.target.value })
                    }
                />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Link label (optional)" htmlFor={`${id}-llabel`}>
                    <Input
                        id={`${id}-llabel`}
                        value={data.linkLabel}
                        onChange={(e) =>
                            onChange({ ...data, linkLabel: e.target.value })
                        }
                    />
                </Field>
                <Field label="Link URL" htmlFor={`${id}-lurl`}>
                    <Input
                        id={`${id}-lurl`}
                        value={data.linkUrl}
                        onChange={(e) =>
                            onChange({ ...data, linkUrl: e.target.value })
                        }
                    />
                </Field>
            </div>
            <div className="grid gap-3">
                <Label>List items</Label>
                {data.items.length > 0 && (
                    <div className="divide-y border-y">
                        {data.items.map((item, index) => (
                            <button
                                key={index}
                                type="button"
                                className="hover:bg-muted grid w-full gap-1 px-3 py-3 text-left transition-colors"
                                onClick={() => openItem(index)}
                            >
                                <span className="text-sm font-medium">
                                    {item.title || 'Untitled Item'}
                                </span>
                                <span className="text-muted-foreground line-clamp-2 text-sm">
                                    {item.text || 'Add item copy'}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-fit"
                    onClick={() => openItem()}
                >
                    Add item
                </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={
                            editingIndex === null
                                ? 'New List Item'
                                : 'Edit List Item'
                        }
                    />
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveItem();
                        }}
                    >
                        <Field label="Title" htmlFor={`${id}-item-title`}>
                            <Input
                                id={`${id}-item-title`}
                                value={draft.title}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        title: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <Field label="Text" htmlFor={`${id}-item-text`}>
                            <Textarea
                                id={`${id}-item-text`}
                                className="field-sizing-fixed"
                                value={draft.text}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        text: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <AdminDialogFooter>
                            {editingIndex !== null && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive mr-auto"
                                    onClick={() => {
                                        onChange({
                                            ...data,
                                            items: data.items.filter(
                                                (_, index) =>
                                                    index !== editingIndex,
                                            ),
                                        });
                                        setDialogOpen(false);
                                    }}
                                >
                                    Remove
                                </Button>
                            )}
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" variant="secondary">
                                Save Item
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
        </div>
    );
}

function StandardsEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: StandardsBlockData;
    onChange: (data: StandardsBlockData) => void;
}) {
    return (
        <div className="grid gap-4">
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <ManagedElsewhere where="Company › Settings (the membership heading and text)" />
        </div>
    );
}

function ImageTextEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: ImageTextBlockData;
    onChange: (data: ImageTextBlockData) => void;
}) {
    return (
        <div className="grid gap-4">
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <Field label="Body" htmlFor={`${id}-body`}>
                <Textarea
                    id={`${id}-body`}
                    className="field-sizing-fixed"
                    rows={5}
                    value={data.body}
                    onChange={(e) =>
                        onChange({ ...data, body: e.target.value })
                    }
                />
            </Field>
            <Field label="Image position" htmlFor={`${id}-position`}>
                <Select
                    value={data.imagePosition}
                    onValueChange={(value) =>
                        onChange({
                            ...data,
                            imagePosition:
                                value as ImageTextBlockData['imagePosition'],
                        })
                    }
                >
                    <SelectTrigger id={`${id}-position`} className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                </Select>
            </Field>
            <MediaPicker
                label="Image"
                accept="image"
                value={data.image}
                onChange={(image) => onChange({ ...data, image })}
            />
        </div>
    );
}

function StatsEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: StatsBlockData;
    onChange: (data: StatsBlockData) => void;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [draft, setDraft] = useState({ value: '', label: '' });

    function openItem(index?: number) {
        const item =
            index === undefined ? { value: '', label: '' } : data.items[index];
        setEditingIndex(index ?? null);
        setDraft(item);
        setDialogOpen(true);
    }

    function saveItem() {
        onChange({
            ...data,
            items:
                editingIndex === null
                    ? [...data.items, draft]
                    : data.items.map((item, index) =>
                          index === editingIndex ? draft : item,
                      ),
        });
        setDialogOpen(false);
    }

    return (
        <div className="grid gap-4">
            <Field label="Heading (optional)" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <div className="grid gap-3">
                <Label>Stats</Label>
                {data.items.length > 0 && (
                    <div className="divide-y border-y">
                        {data.items.map((item, index) => (
                            <button
                                key={index}
                                type="button"
                                className="hover:bg-muted flex w-full items-baseline gap-2 px-3 py-3 text-left transition-colors"
                                onClick={() => openItem(index)}
                            >
                                <span className="text-sm font-medium">
                                    {item.value || 'Value'}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    {item.label || 'Stat label'}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-fit"
                    onClick={() => openItem()}
                >
                    Add stat
                </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={editingIndex === null ? 'New Stat' : 'Edit Stat'}
                    />
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveItem();
                        }}
                    >
                        <Field label="Value" htmlFor={`${id}-stat-value`}>
                            <Input
                                id={`${id}-stat-value`}
                                placeholder="15+"
                                value={draft.value}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        value: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <Field label="Label" htmlFor={`${id}-stat-label`}>
                            <Input
                                id={`${id}-stat-label`}
                                placeholder="Years in business"
                                value={draft.label}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        label: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <AdminDialogFooter>
                            {editingIndex !== null && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive mr-auto"
                                    onClick={() => {
                                        onChange({
                                            ...data,
                                            items: data.items.filter(
                                                (_, index) =>
                                                    index !== editingIndex,
                                            ),
                                        });
                                        setDialogOpen(false);
                                    }}
                                >
                                    Remove
                                </Button>
                            )}
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" variant="secondary">
                                Save Stat
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
        </div>
    );
}

function FaqEditor({
    id,
    data,
    onChange,
}: {
    id: string;
    data: FaqBlockData;
    onChange: (data: FaqBlockData) => void;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [draft, setDraft] = useState({ question: '', answer: '' });

    function openItem(index?: number) {
        const item =
            index === undefined
                ? { question: '', answer: '' }
                : data.items[index];
        setEditingIndex(index ?? null);
        setDraft(item);
        setDialogOpen(true);
    }

    function saveItem() {
        onChange({
            ...data,
            items:
                editingIndex === null
                    ? [...data.items, draft]
                    : data.items.map((item, index) =>
                          index === editingIndex ? draft : item,
                      ),
        });
        setDialogOpen(false);
    }

    return (
        <div className="grid gap-4">
            <Field label="Heading" htmlFor={`${id}-heading`}>
                <Input
                    id={`${id}-heading`}
                    value={data.heading}
                    onChange={(e) =>
                        onChange({ ...data, heading: e.target.value })
                    }
                />
            </Field>
            <div className="grid gap-3">
                <Label>Questions</Label>
                {data.items.length > 0 && (
                    <div className="divide-y border-y">
                        {data.items.map((item, index) => (
                            <button
                                key={index}
                                type="button"
                                className="hover:bg-muted grid w-full gap-1 px-3 py-3 text-left transition-colors"
                                onClick={() => openItem(index)}
                            >
                                <span className="text-sm font-medium">
                                    {item.question || 'Untitled Question'}
                                </span>
                                <span className="text-muted-foreground line-clamp-2 text-sm">
                                    {item.answer || 'Add an answer'}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-fit"
                    onClick={() => openItem()}
                >
                    Add question
                </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={
                            editingIndex === null
                                ? 'New Question'
                                : 'Edit Question'
                        }
                    />
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveItem();
                        }}
                    >
                        <Field label="Question" htmlFor={`${id}-question`}>
                            <Input
                                id={`${id}-question`}
                                value={draft.question}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        question: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <Field label="Answer" htmlFor={`${id}-answer`}>
                            <Textarea
                                id={`${id}-answer`}
                                className="field-sizing-fixed"
                                value={draft.answer}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        answer: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <AdminDialogFooter>
                            {editingIndex !== null && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive mr-auto"
                                    onClick={() => {
                                        onChange({
                                            ...data,
                                            items: data.items.filter(
                                                (_, index) =>
                                                    index !== editingIndex,
                                            ),
                                        });
                                        setDialogOpen(false);
                                    }}
                                >
                                    Remove
                                </Button>
                            )}
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" variant="secondary">
                                Save Question
                            </Button>
                        </AdminDialogFooter>
                    </form>
                </AdminDialogContent>
            </Dialog>
        </div>
    );
}

/** Dispatches to the right form for a block's type, fully typed via the discriminated PageBlock union. */
export function BlockEditor({
    block,
    onChange,
}: {
    block: PageBlock;
    onChange: (data: BlockDataMap[PageBlock['type']]) => void;
}) {
    switch (block.type) {
        case 'hero':
            return (
                <HeroEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        case 'text':
            return (
                <TextEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        case 'cards':
            return (
                <CardsEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        case 'text_with_list':
            return (
                <TextWithListEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        case 'standards':
            return (
                <StandardsEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        case 'services_grid':
            return (
                <HeadingIntroEditor
                    id={block.id}
                    data={block.data}
                    managedWhere="Services"
                    onChange={(next) => onChange(next as ServicesGridBlockData)}
                />
            );
        case 'testimonials':
            return (
                <HeadingIntroEditor
                    id={block.id}
                    data={block.data}
                    managedWhere="Testimonials"
                    showIntro={false}
                    onChange={(next) => onChange(next as TestimonialsBlockData)}
                />
            );
        case 'resources_promo':
            return (
                <HeadingIntroEditor
                    id={block.id}
                    data={block.data}
                    managedWhere="Resources"
                    onChange={(next) =>
                        onChange(next as ResourcesPromoBlockData)
                    }
                />
            );
        case 'cta':
            return (
                <CtaEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        case 'image_text':
            return (
                <ImageTextEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        case 'team':
            return (
                <HeadingIntroEditor
                    id={block.id}
                    data={block.data}
                    managedWhere="Team Members"
                    showIntro={false}
                    onChange={(next) => onChange(next as TeamBlockData)}
                />
            );
        case 'open_positions':
            return (
                <HeadingIntroEditor
                    id={block.id}
                    data={block.data}
                    managedWhere="Team Members › Open positions"
                    showIntro={false}
                    onChange={(next) =>
                        onChange(next as OpenPositionsBlockData)
                    }
                />
            );
        case 'stats':
            return (
                <StatsEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        case 'faq':
            return (
                <FaqEditor
                    id={block.id}
                    data={block.data}
                    onChange={onChange}
                />
            );
        default:
            return null;
    }
}
