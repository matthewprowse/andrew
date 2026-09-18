import { usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import type { PublicSettings } from '@/types/site-settings';

/**
 * Fixed call-to-contact control shown on every public service page, so a
 * visitor can always reach out regardless of scroll position.
 */
export function PersistentContactButton({
    href,
    label,
    serviceId,
}: {
    href?: string;
    label?: string;
    serviceId?: number | null;
}) {
    const { publicSettings } = usePage<{ publicSettings: PublicSettings }>()
        .props;
    const site = publicSettings.site;
    const destination = href || site.defaultCtaLink;
    const buttonLabel = label || site.defaultCtaButtonLabel;

    if (!destination || !buttonLabel) return null;

    return (
        <div className="fixed right-6 bottom-6 z-40">
            <Button asChild size="lg" className="shadow-lg">
                <a
                    href={destination}
                    onClick={() =>
                        trackEvent('cta_click', {
                            label: buttonLabel,
                            serviceId,
                        })
                    }
                >
                    {buttonLabel}
                </a>
            </Button>
        </div>
    );
}
