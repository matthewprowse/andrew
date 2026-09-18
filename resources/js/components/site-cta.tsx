import { usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import type { PublicSettings } from '@/types/site-settings';
export function SiteCta({
    title,
    description,
    href,
    label,
}: {
    title?: string;
    description?: string;
    href?: string;
    label?: string;
}) {
    const { publicSettings } = usePage<{ publicSettings: PublicSettings }>()
        .props;
    const site = publicSettings.site;
    const heading = title ?? site.defaultCtaText,
        copy = description ?? site.defaultCtaDescription,
        destination = href ?? site.defaultCtaLink,
        buttonLabel = label ?? site.defaultCtaButtonLabel;
    if (!heading && !copy && !(destination && buttonLabel)) return null;
    return (
        <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-16 text-center md:px-8 md:pb-24">
            {heading && (
                <h2 className="w-full max-w-3xl text-2xl font-medium">
                    {heading}
                </h2>
            )}
            {copy && (
                <p className="text-muted-foreground mt-4 w-full max-w-3xl leading-7">
                    {copy}
                </p>
            )}
            {destination && buttonLabel && (
                <Button asChild className="mt-6">
                    <a
                        href={destination}
                        onClick={() =>
                            trackEvent('cta_click', { label: buttonLabel })
                        }
                    >
                        {buttonLabel}
                    </a>
                </Button>
            )}
        </section>
    );
}
