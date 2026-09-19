import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import type { PublicSettings } from '@/types/site-settings';
import { ServiceContactDialog, type ServiceContactField } from '@/components/service-contact-dialog';

/**
 * Fixed call-to-contact control shown on every public service page, so a
 * visitor can always reach out regardless of scroll position.
 */
export function PersistentContactButton({
    href,
    label,
    serviceId,
    serviceName,
    contactFields,
}: {
    href?: string;
    label?: string;
    serviceId?: number | null;
    serviceName?: string;
    contactFields?: ServiceContactField[];
}) {
    const { publicSettings } = usePage<{ publicSettings: PublicSettings }>()
        .props;
    const site = publicSettings.site;
    const destination = href || site.defaultCtaLink;
    const buttonLabel = label || site.defaultCtaButtonLabel;
    const [open, setOpen] = useState(false);
    const serviceContact = serviceId && serviceName;

    if (!destination || !buttonLabel) return null;

    return (
        <>
            <div className="fixed right-6 bottom-6 z-40">
                {serviceContact ? (
                    <Button className="shadow-lg" onClick={() => { setOpen(true); trackEvent('cta_click', { label: buttonLabel, serviceId }); }}>
                        {buttonLabel}
                    </Button>
                ) : (
                    <Button asChild className="shadow-lg">
                        <a href={destination} onClick={() => trackEvent('cta_click', { label: buttonLabel, serviceId })}>{buttonLabel}</a>
                    </Button>
                )}
            </div>
            {serviceContact && <ServiceContactDialog open={open} onOpenChange={setOpen} serviceId={serviceId} serviceName={serviceName} buttonLabel={buttonLabel} fields={contactFields} />}
        </>
    );
}
