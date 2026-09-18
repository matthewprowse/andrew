import { Link } from '@inertiajs/react';
import {
    createColumnHelper,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import { PageMeta } from '@/components/page-meta';
import { PreviewBanner } from '@/components/preview-banner';
import { SiteCta } from '@/components/site-cta';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { DataTable } from '@/components/ui/data-table';
import type { PageContent } from '@/types/page-content';

type Office = {
    id: string;
    officeName: string;
    address: string;
    phone: string;
    email: string;
    sortOrder: number;
};

type CountryRecord = {
    id: string;
    name: string;
    slug: string;
    region: string;
    description: string;
    sortOrder: number;
};

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, CountryRecord>();
const columns = helper.columns([
    helper.accessor('name', {
        header: 'Country / Region',
        cell: ({ row }) => (
            <Link
                href={`/locations/${row.original.slug}`}
                className="grid gap-1"
            >
                <span>{row.original.name}</span>
                <span className="text-muted-foreground text-xs">
                    {row.original.region}
                </span>
            </Link>
        ),
    }),
]);

function CountryList({ items }: { items: CountryRecord[] }) {
    const table = useTable({ features, columns, data: items });
    return (
        <div className="border-t [&_tbody_tr:last-child]:border-b">
            <DataTable table={table} showHeader={false} />
        </div>
    );
}

export default function Locations({
    content,
    offices,
    countries,
    preview = false,
}: {
    content: PageContent;
    offices: Office[];
    countries: CountryRecord[];
    /** PUB-01: true only when rendered via the authenticated draft preview. */
    preview?: boolean;
}) {
    const primaryOffice = offices[0];
    const midpoint = Math.ceil(countries.length / 2);
    const countryGroups = [
        countries.slice(0, midpoint),
        countries.slice(midpoint),
    ];

    return (
        <>
            <PageMeta
                title={content.metaTitle || 'Locations'}
                description={
                    content.metaDescription ||
                    content.heroSubheading ||
                    'Find our offices and the regions we serve across Africa.'
                }
                image={content.ogImageUrl}
                noindex={preview}
            />
            {preview && <PreviewBanner />}
            <SiteHeader />
            <main>
                <section className="mx-auto w-full max-w-7xl px-6 py-16 text-center md:px-8 md:py-24">
                    <p className="text-muted-foreground text-sm">Locations</p>
                    <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                        {content.heroHeading || 'Locations'}
                    </h1>
                    <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-lg leading-8">
                        {content.heroSubheading ||
                            'Find our offices and the regions we serve across Africa.'}
                    </p>
                </section>

                {primaryOffice && (
                    <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
                            <div>
                                <h2 className="text-2xl font-medium">
                                    {primaryOffice.officeName}
                                </h2>
                                <address className="text-muted-foreground mt-6 text-sm leading-6 whitespace-pre-line not-italic">
                                    {primaryOffice.address}
                                </address>
                                {(primaryOffice.phone ||
                                    primaryOffice.email) && (
                                    <p className="text-muted-foreground mt-4 text-sm leading-6">
                                        {primaryOffice.phone}
                                        {primaryOffice.phone &&
                                            primaryOffice.email &&
                                            ' · '}
                                        {primaryOffice.email}
                                    </p>
                                )}
                            </div>
                            <div
                                aria-hidden="true"
                                className="bg-muted aspect-[4/3] rounded-xl"
                            />
                        </div>
                    </section>
                )}

                {countries.length > 0 && (
                    <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                        <h2 className="text-2xl font-medium">
                            Countries We Operate In
                        </h2>
                        <div className="mt-8 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
                            <div
                                aria-hidden="true"
                                className="bg-muted aspect-[4/3] rounded-xl"
                            />
                            <div className="grid min-w-0 gap-6 sm:grid-cols-2">
                                {countryGroups.map((items, index) => (
                                    <div key={index} className="min-w-0">
                                        <CountryList items={items} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <SiteCta />
            </main>
            <SiteFooter />
        </>
    );
}
