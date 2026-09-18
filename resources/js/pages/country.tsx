import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { PageMeta } from '@/components/page-meta';
import { SiteCta } from '@/components/site-cta';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

type CountryRecord = {
    id: string;
    name: string;
    slug: string;
    region: string;
    description: string;
};

export default function Country({ country }: { country: CountryRecord }) {
    const { canonicalUrl } = usePage<{ canonicalUrl: string }>().props;
    const origin = canonicalUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1');

    return (
        <>
            <PageMeta
                title={`${country.name} | Locations`}
                description={
                    country.description ||
                    `Relocation Africa's services in ${country.name}, ${country.region}.`
                }
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        {
                            '@type': 'ListItem',
                            position: 1,
                            name: 'Home',
                            item: origin,
                        },
                        {
                            '@type': 'ListItem',
                            position: 2,
                            name: 'Locations',
                            item: `${origin}/locations`,
                        },
                        {
                            '@type': 'ListItem',
                            position: 3,
                            name: country.name,
                            item: canonicalUrl,
                        },
                    ],
                }}
            />
            <SiteHeader />
            <main>
                <section className="mx-auto w-full max-w-3xl px-6 py-16 md:px-8 md:py-24">
                    <Link
                        href="/locations"
                        className="text-muted-foreground inline-flex items-center gap-2 text-sm hover:underline"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" /> Back
                        to Locations
                    </Link>
                    <p className="text-muted-foreground mt-6 text-sm">
                        {country.region}
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                        {country.name}
                    </h1>
                    {country.description && (
                        <p className="text-muted-foreground mt-5 text-lg leading-8">
                            {country.description}
                        </p>
                    )}
                </section>
                <SiteCta />
            </main>
            <SiteFooter />
        </>
    );
}
