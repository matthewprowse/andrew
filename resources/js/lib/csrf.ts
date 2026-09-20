export function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * fetch() for same-origin JSON endpoints that Inertia's router can't serve
 * (structured 409/422 bodies, file uploads). Pass `json` for a JSON body or
 * `body` for FormData, which must not get a Content-Type so the browser can
 * set the multipart boundary itself.
 */
export function csrfFetch(
    url: string,
    {
        method,
        json,
        body,
    }: { method: 'POST' | 'PUT'; json?: unknown; body?: FormData },
): Promise<Response> {
    const hasJson = json !== undefined;

    return fetch(url, {
        method,
        headers: {
            Accept: 'application/json',
            ...(hasJson ? { 'Content-Type': 'application/json' } : {}),
            'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: hasJson ? JSON.stringify(json) : body,
    });
}
