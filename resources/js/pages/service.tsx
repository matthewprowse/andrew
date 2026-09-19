import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { formatPublishDate } from '@/data/blog-posts';
import { PageMeta } from '@/components/page-meta';
import { PersistentContactButton } from '@/components/persistent-contact-button';
import { ServiceContactDialog } from '@/components/service-contact-dialog';
import { ResourceActionButton } from '@/pages/resource';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TestimonialSection } from '@/components/testimonial-section';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { RICH_CONTENT_TYPOGRAPHY_CLASSES } from '@/lib/rich-content-typography';
import { cn } from '@/lib/utils';
import type { ResourceItemRecord } from '@/types/resource';
import type { ServiceRecord } from '@/types/service';

type RelevantPost = {
    title: string;
    slug: string;
    excerpt: string;
    publishDate: string;
};

function introSummary(intro: string): string {
    const firstParagraph = intro.split(/\r?\n\s*\r?\n/)[0].trim();
    if (firstParagraph.length <= 200) return firstParagraph;
    return `${firstParagraph.slice(0, 199).trimEnd()}…`;
}

function ServiceResource({ resource }: { resource: ResourceItemRecord }) {
    return (
        <article className="overflow-hidden rounded-lg border">
            {resource.imageUrl && (
                <img
                    src={resource.imageUrl}
                    alt={resource.imageAlt || resource.title}
                    className="aspect-[16/9] w-full object-cover"
                    loading="lazy"
                />
            )}
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{resource.title}</p>
                    {resource.accessType === 'paid' &&
                        resource.formattedPrice && (
                            <p className="shrink-0 text-sm font-medium">
                                {resource.formattedPrice}
                            </p>
                        )}
                </div>
                {resource.description && (
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                        {resource.description}
                    </p>
                )}
                <div className="mt-3">
                    <ResourceActionButton
                        item={resource}
                        category={resource.categorySlug}
                    />
                </div>
            </div>
        </article>
    );
}

export default function ServicePage({
    service: s,
    testimonials,
    relevantPosts,
    resources,
}: {
    service: ServiceRecord;
    testimonials: {
        id: string;
        quote: string;
        author: string;
        company: string;
    }[];
    relevantPosts: RelevantPost[];
    resources: ResourceItemRecord[];
}) {
    const [contactOpen, setContactOpen] = useState(false);
    const featuredServices = s.featured_services ?? [];
    const consultationLabel = s.cta_button_label || 'Request Consultation';
    const consultationHelper =
        s.cta_description ||
        'Request a consultation and our team will be in touch.';
    const bannerImageUrl = s.bannerImageUrl || s.banner_image;
    const bannerImageAlt = s.bannerImageAlt || `${s.name} service banner`;
    const hasSidebar =
        featuredServices.length > 0 ||
        relevantPosts.length > 0 ||
        resources.length > 0;

    return (
        <>
            <PageMeta
                title={s.metaTitle || s.name}
                description={s.metaDescription || introSummary(s.intro)}
                image={bannerImageUrl}
            />
            <SiteHeader />
            <main className="mx-auto max-w-7xl space-y-16 px-6 py-16 md:px-8 md:py-24">
                <section className="mx-auto max-w-3xl text-center">
                    <p className="text-muted-foreground text-sm">Services</p>
                    <h1 className="mt-3 text-4xl font-semibold text-balance md:text-5xl">
                        {s.headline}
                    </h1>
                    <p className="text-muted-foreground mt-5 text-lg leading-8 whitespace-pre-line">
                        {s.intro}
                    </p>
                    {s.cta_link && (
                        <div className="mt-6">
                            <p className="text-muted-foreground mb-2 text-sm">
                                {consultationHelper}
                            </p>
                            <Button onClick={() => { setContactOpen(true); trackEvent('cta_click', { label: consultationLabel, serviceId: s.id }); }}>
                                {consultationLabel}
                            </Button>
                        </div>
                    )}
                </section>
                <section className="overflow-hidden rounded-xl">
                    {bannerImageUrl ? (
                        <img
                            src={bannerImageUrl}
                            alt={bannerImageAlt}
                            className="aspect-video w-full object-cover"
                        />
                    ) : (
                        <div
                            role="img"
                            aria-label={`${s.name} service banner placeholder`}
                            className="bg-secondary aspect-video"
                        />
                    )}
                </section>
                {(s.rich_content || hasSidebar) && (
                    <div className="grid gap-12 lg:grid-cols-3">
                        {s.rich_content && (
                            <div
                                className={cn(
                                    'lg:col-span-2',
                                    RICH_CONTENT_TYPOGRAPHY_CLASSES,
                                )}
                                dangerouslySetInnerHTML={{
                                    __html: s.rich_content,
                                }}
                            />
                        )}
                        {hasSidebar && (
                            <aside
                                className={cn(
                                    'space-y-10',
                                    s.rich_content
                                        ? 'lg:col-span-1'
                                        : 'lg:col-span-3',
                                )}
                            >
                                {(featuredServices.length > 0 ||
                                    resources.length > 0) && (
                                    <section>
                                        <h2 className="text-lg font-medium">
                                            Explore {s.name}
                                        </h2>
                                        <div className="mt-4 space-y-4">
                                            {featuredServices.map(
                                                (feature, index) => (
                                                    <div
                                                        key={index}
                                                        className="rounded-lg border p-4"
                                                    >
                                                        <div>
                                                            <p className="font-medium">
                                                                {feature.name}
                                                            </p>
                                                            {feature.description && (
                                                                <p className="text-muted-foreground mt-1 text-sm leading-6">
                                                                    {
                                                                        feature.description
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                        {feature.resources &&
                                                            feature.resources
                                                                .length > 0 && (
                                                                <div className="mt-4 space-y-3 border-t pt-4">
                                                                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                                                        Resources
                                                                    </p>
                                                                    {feature.resources.map(
                                                                        (
                                                                            resource,
                                                                        ) => (
                                                                            <ServiceResource
                                                                                key={
                                                                                    resource.id
                                                                                }
                                                                                resource={
                                                                                    resource
                                                                                }
                                                                            />
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                ),
                                            )}
                                            {resources.length > 0 && (
                                                <div className="rounded-lg border p-4">
                                                    <p className="font-medium">
                                                        More resources
                                                    </p>
                                                    <div className="mt-4 space-y-4">
                                                        {resources.map(
                                                            (resource) => (
                                                                <ServiceResource
                                                                    key={
                                                                        resource.id
                                                                    }
                                                                    resource={
                                                                        resource
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}
                                {relevantPosts.length > 0 && (
                                    <section>
                                        <h2 className="text-lg font-medium">
                                            Related Insights
                                        </h2>
                                        <div className="mt-4 space-y-4">
                                            {relevantPosts.map((post) => (
                                                <Link
                                                    key={post.slug}
                                                    href={`/blog/${post.slug}`}
                                                    className="hover:bg-accent block rounded-lg border p-4"
                                                >
                                                    <p className="text-muted-foreground text-xs">
                                                        {formatPublishDate(
                                                            post.publishDate,
                                                        )}
                                                    </p>
                                                    <p className="mt-1 font-medium">
                                                        {post.title}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-6">
                                                        {post.excerpt}
                                                    </p>
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </aside>
                        )}
                    </div>
                )}
                <TestimonialSection testimonials={testimonials} />
                {s.cta_link && (
                    <section className="text-center">
                        {s.cta_text && (
                            <h2 className="text-2xl font-medium">
                                {s.cta_text}
                            </h2>
                        )}
                        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl whitespace-pre-line">
                            {consultationHelper}
                        </p>
                        <Button className="mt-6" onClick={() => { setContactOpen(true); trackEvent('cta_click', { label: consultationLabel, serviceId: s.id }); }}>
                            {consultationLabel}
                        </Button>
                    </section>
                )}
            </main>
            <SiteFooter />
            <PersistentContactButton
                href={s.cta_link}
                label={consultationLabel}
                serviceId={s.id}
                serviceName={s.name}
                contactFields={s.contact_fields}
            />
            <ServiceContactDialog
                open={contactOpen}
                onOpenChange={setContactOpen}
                serviceId={s.id}
                serviceName={s.name}
                buttonLabel={consultationLabel}
                fields={s.contact_fields}
            />
        </>
    );
}
