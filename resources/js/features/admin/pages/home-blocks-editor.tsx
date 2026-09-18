import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EditorSection } from '@/features/admin/shared/nonservice-editor';
import type { HomeBlocks } from '@/types/page-content';

// CMS-02: the homepage blocks that used to be hardcoded directly in
// home.tsx (servicesIntro, africanReachIntro, audienceCards, relocoachingBody,
// knowledgeIntro, finalCtaDescription). Each block below has its own
// enable/disable toggle; while off, the public page keeps rendering its
// current hardcoded fallback copy exactly as it does today, regardless of
// whatever draft text sits in the field — see resources/js/pages/home.tsx.

function BlockToggle({
    id,
    checked,
    onCheckedChange,
    label,
}: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <label htmlFor={id} className="flex items-center gap-2 text-sm">
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => onCheckedChange(value === true)}
            />
            {label}
        </label>
    );
}

export function HomeBlocksEditor({
    value,
    onChange,
}: {
    value: HomeBlocks;
    onChange: (next: HomeBlocks) => void;
}) {
    return (
        <EditorSection
            title="Homepage Sections"
            description="Each section shows the site's current default copy until you turn it on and fill it in below. Turning a section back off reverts it to that default without discarding your draft text."
        >
            <div className="grid gap-3 rounded-md border p-3">
                <BlockToggle
                    id="block-services-intro"
                    checked={value.servicesIntro.enabled}
                    onCheckedChange={(enabled) =>
                        onChange({
                            ...value,
                            servicesIntro: { ...value.servicesIntro, enabled },
                        })
                    }
                    label='Use custom copy for "Services Built Around Your Move"'
                />
                <Textarea
                    className="field-sizing-fixed"
                    placeholder="Services introduction"
                    value={value.servicesIntro.text}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            servicesIntro: {
                                ...value.servicesIntro,
                                text: event.target.value,
                            },
                        })
                    }
                />
            </div>

            <div className="grid gap-3 rounded-md border p-3">
                <BlockToggle
                    id="block-african-reach"
                    checked={value.africanReachIntro.enabled}
                    onCheckedChange={(enabled) =>
                        onChange({
                            ...value,
                            africanReachIntro: {
                                ...value.africanReachIntro,
                                enabled,
                            },
                        })
                    }
                    label='Use custom copy for "African Reach, Local Understanding"'
                />
                <Textarea
                    className="field-sizing-fixed"
                    placeholder="African reach introduction"
                    value={value.africanReachIntro.text}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            africanReachIntro: {
                                ...value.africanReachIntro,
                                text: event.target.value,
                            },
                        })
                    }
                />
            </div>

            <div className="grid gap-3 rounded-md border p-3">
                <BlockToggle
                    id="block-audiences"
                    checked={value.audiences.enabled}
                    onCheckedChange={(enabled) =>
                        onChange({
                            ...value,
                            audiences: { ...value.audiences, enabled },
                        })
                    }
                    label="Use custom audience cards (replaces all 3 default cards)"
                />
                {value.audiences.items.map((item, index) => (
                    <div
                        key={index}
                        className="grid gap-2 border-t pt-3 first:border-t-0 first:pt-0"
                    >
                        <Input
                            placeholder={`Card ${index + 1} title`}
                            value={item.title}
                            onChange={(event) =>
                                onChange({
                                    ...value,
                                    audiences: {
                                        ...value.audiences,
                                        items: value.audiences.items.map(
                                            (current, i) =>
                                                i === index
                                                    ? {
                                                          ...current,
                                                          title: event.target
                                                              .value,
                                                      }
                                                    : current,
                                        ),
                                    },
                                })
                            }
                        />
                        <Textarea
                            className="field-sizing-fixed"
                            placeholder={`Card ${index + 1} text`}
                            value={item.text}
                            onChange={(event) =>
                                onChange({
                                    ...value,
                                    audiences: {
                                        ...value.audiences,
                                        items: value.audiences.items.map(
                                            (current, i) =>
                                                i === index
                                                    ? {
                                                          ...current,
                                                          text: event.target
                                                              .value,
                                                      }
                                                    : current,
                                        ),
                                    },
                                })
                            }
                        />
                    </div>
                ))}
            </div>

            <div className="grid gap-3 rounded-md border p-3">
                <BlockToggle
                    id="block-partnership"
                    checked={value.partnership.enabled}
                    onCheckedChange={(enabled) =>
                        onChange({
                            ...value,
                            partnership: { ...value.partnership, enabled },
                        })
                    }
                    label="Use custom copy for the Relocoaching partnership section"
                />
                <Textarea
                    className="field-sizing-fixed"
                    placeholder="Partnership / Relocoaching content"
                    value={value.partnership.body}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            partnership: {
                                ...value.partnership,
                                body: event.target.value,
                            },
                        })
                    }
                />
            </div>

            <div className="grid gap-3 rounded-md border p-3">
                <BlockToggle
                    id="block-resources-intro"
                    checked={value.resourcesIntro.enabled}
                    onCheckedChange={(enabled) =>
                        onChange({
                            ...value,
                            resourcesIntro: {
                                ...value.resourcesIntro,
                                enabled,
                            },
                        })
                    }
                    label='Use custom copy for "Knowledge for Your Next Chapter"'
                />
                <Textarea
                    className="field-sizing-fixed"
                    placeholder="Resource promotions introduction"
                    value={value.resourcesIntro.text}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            resourcesIntro: {
                                ...value.resourcesIntro,
                                text: event.target.value,
                            },
                        })
                    }
                />
            </div>

            <div className="grid gap-3 rounded-md border p-3">
                <BlockToggle
                    id="block-final-cta"
                    checked={value.finalCta.enabled}
                    onCheckedChange={(enabled) =>
                        onChange({
                            ...value,
                            finalCta: { ...value.finalCta, enabled },
                        })
                    }
                    label="Use custom copy for the final call-to-action description"
                />
                <Textarea
                    className="field-sizing-fixed"
                    placeholder="Final call-to-action description"
                    value={value.finalCta.description}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            finalCta: {
                                ...value.finalCta,
                                description: event.target.value,
                            },
                        })
                    }
                />
            </div>
        </EditorSection>
    );
}
