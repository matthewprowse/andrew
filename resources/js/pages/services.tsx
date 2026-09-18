import { Link, usePage } from '@inertiajs/react';
import { PageMeta } from '@/components/page-meta';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import type { PublicSettings } from '@/types/site-settings';
import type { ServiceRecord } from '@/types/service';

const genericDescription =
    'Relocation, immigration, research, remuneration and training services across Africa.';

export default function Services({ services }: { services: ServiceRecord[] }) {
    const { publicSettings } = usePage<{ publicSettings: PublicSettings }>()
        .props;
    const serviceNames = services.map((s) => s.name);
    const description =
        serviceNames.length > 0
            ? `${publicSettings.site.organizationName}'s services across Africa: ${serviceNames.join(', ')}.`
            : genericDescription;

    return (
        <>
            <PageMeta
                title={`Services | ${publicSettings.site.organizationName}`}
                description={description}
            />
            <SiteHeader />
            <main className="mx-auto max-w-7xl px-6 py-24 md:px-8">
                <h1 className="text-4xl font-semibold">Services</h1>
                <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {services.map((s) => (
                        <Link
                            key={s.id}
                            href={`/services/${s.slug}`}
                            className="hover:bg-accent rounded-lg border p-6"
                        >
                            <h2 className="text-xl font-medium">{s.name}</h2>
                            <p className="text-muted-foreground mt-3 line-clamp-4">
                                {s.intro}
                            </p>
                            <p className="mt-6 text-sm font-medium">
                                Learn more →
                            </p>
                        </Link>
                    ))}
                </div>
                {services.length === 0 && (
                    <p className="text-muted-foreground mt-8">
                        Our services will be available here soon.
                    </p>
                )}
            </main>
            <SiteFooter />
        </>
    );
}
