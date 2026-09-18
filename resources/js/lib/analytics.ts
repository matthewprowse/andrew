/**
 * Fire-and-forget analytics beacon for CTA clicks and resource downloads.
 * Page views are tracked server-side (App\Http\Middleware\TrackPageView) and
 * never need this. Never throws and never blocks the click it's attached to
 * — a failed analytics call must not affect the user's action.
 */
function csrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export function trackEvent(
    eventType: 'cta_click' | 'resource_download',
    details: {
        label?: string;
        serviceId?: number | null;
        resourceItemId?: number | null;
    } = {},
): void {
    try {
        void fetch('/analytics/event', {
            method: 'POST',
            keepalive: true,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': csrfToken(),
            },
            body: JSON.stringify({
                event_type: eventType,
                path: window.location.pathname,
                label: details.label,
                service_id: details.serviceId ?? null,
                resource_item_id: details.resourceItemId ?? null,
            }),
        }).catch(() => undefined);
    } catch {
        // Analytics must never break the page.
    }
}
