import { Head, usePage } from '@inertiajs/react';
import type { PublicSettings } from '@/types/site-settings';

type StructuredData = Record<string, unknown>;

/**
 * Resolve a possibly-relative image reference (a stored local media path, or
 * an editor-entered absolute path) into an absolute URL against the current
 * origin. Already-absolute http(s) URLs pass through unchanged. Search
 * engines and social crawlers fetch og:image/structured-data image URLs out
 * of page context, so a relative path silently fails for them.
 */
export function toAbsoluteUrl(
    url: string | null | undefined,
    origin: string,
): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const base = origin.replace(/\/+$/, '');
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

export function PageMeta({
    title,
    description: descriptionProp,
    image,
    canonical,
    type = 'website',
    structuredData,
    noindex = false,
}: {
    title: string;
    description?: string;
    image?: string;
    canonical?: string;
    type?: 'website' | 'article';
    structuredData?: StructuredData | StructuredData[];
    /**
     * PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): every
     * authenticated preview page passes this so a draft can never be
     * indexed. Defaults to false — no existing caller's behavior changes.
     */
    noindex?: boolean;
}) {
    const { publicSettings, canonicalUrl } = usePage<{
        publicSettings: PublicSettings;
        canonicalUrl: string;
    }>().props;

    const url = canonical ?? canonicalUrl;
    const origin = url.replace(/^(https?:\/\/[^/]+).*$/, '$1');
    const siteName = publicSettings.site.organizationName;
    // Every public page must ship a description (search/social previews look
    // blank without one); fall back to the sitewide footer copy — already
    // approved, already shown on every page — rather than leaving it empty
    // whenever a specific page (e.g. a freshly-created block page) hasn't
    // set its own.
    const description = descriptionProp || publicSettings.site.footerText;
    // The per-page share image (this page's banner/cover, falling back to
    // the site default) is distinct from the organization's logo: a page
    // image is what should appear when a link is shared, while the logo
    // identifies the organization itself in Organization structured data.
    // Conflating the two meant every page's Organization markup claimed
    // whatever image happened to be sharing for that page as the brand logo.
    const resolvedImage = toAbsoluteUrl(
        image || publicSettings.site.defaultOgImage,
        origin,
    );
    const resolvedLogo = toAbsoluteUrl(
        publicSettings.site.organizationLogo,
        origin,
    );
    const organizationSchema: StructuredData = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteName,
        url: origin,
        ...(resolvedLogo ? { logo: resolvedLogo } : {}),
    };
    const pageSchemas = structuredData
        ? Array.isArray(structuredData)
            ? structuredData
            : [structuredData]
        : [];
    const schemas = [organizationSchema, ...pageSchemas];

    return (
        <Head title={title}>
            {noindex && (
                <meta
                    head-key="robots"
                    name="robots"
                    content="noindex, nofollow"
                />
            )}
            {description && (
                <meta
                    head-key="description"
                    name="description"
                    content={description}
                />
            )}
            <link head-key="canonical" rel="canonical" href={url} />
            <meta head-key="og:type" property="og:type" content={type} />
            <meta head-key="og:title" property="og:title" content={title} />
            {description && (
                <meta
                    head-key="og:description"
                    property="og:description"
                    content={description}
                />
            )}
            <meta head-key="og:url" property="og:url" content={url} />
            <meta
                head-key="og:site_name"
                property="og:site_name"
                content={siteName}
            />
            {resolvedImage && (
                <meta
                    head-key="og:image"
                    property="og:image"
                    content={resolvedImage}
                />
            )}
            <meta
                head-key="twitter:card"
                name="twitter:card"
                content={resolvedImage ? 'summary_large_image' : 'summary'}
            />
            <meta
                head-key="twitter:title"
                name="twitter:title"
                content={title}
            />
            {description && (
                <meta
                    head-key="twitter:description"
                    name="twitter:description"
                    content={description}
                />
            )}
            {resolvedImage && (
                <meta
                    head-key="twitter:image"
                    name="twitter:image"
                    content={resolvedImage}
                />
            )}
            {schemas.map((schema, index) => (
                <script
                    key={index}
                    head-key={`structured-data-${index}`}
                    type="application/ld+json"
                >
                    {JSON.stringify(schema).replace(/</g, '\\u003c')}
                </script>
            ))}
        </Head>
    );
}
