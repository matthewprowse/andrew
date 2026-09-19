import { Link } from '@inertiajs/react';
import { CalendarDays, MapPin } from 'lucide-react';
import { FeatureGrid, type FeatureGridItem } from '@/components/feature-grid';
import { MediaContent } from '@/components/media-content';
import { PageMeta } from '@/components/page-meta';
import { PreviewBanner } from '@/components/preview-banner';
import { SiteCta } from '@/components/site-cta';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PageContent } from '@/types/page-content';
import type { TeamMemberRecord } from '@/types/team';
import { initials } from '@/lib/initials';

type JobOpening = {
    id: string;
    title: string;
    location: string;
    postedDate: string;
    description: string;
};

const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

function formatDate(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
}

const heroSubheadingFallback =
    'Relocation Africa helps global organisations and relocating people make confident moves across Africa through local expertise, accountable service and genuine human support.';
const introHeadingFallback = 'More Than a Move';
const introBodyFallback =
    'Relocation Africa was built on a simple belief: mobility works best when people feel informed, supported and able to get on with their lives and work.\n\nOur integrated services bring together destination support, immigration, research, remuneration and training. We help global HR and mobility teams navigate the operational complexity of African assignments while keeping the assignee experience in view.';

const defaultValues: FeatureGridItem[] = [
    {
        title: 'Embrace Change',
        description:
            'We respond to change with curiosity, innovation and practical action.',
    },
    {
        title: 'Uncompromising Ethics',
        description:
            'We build trust through responsible decisions, honest communication and professional conduct.',
    },
    {
        title: 'Consider the Person',
        description:
            'We listen with empathy and recognise that every relocation experience is different.',
    },
    {
        title: 'I Do It, I Own It',
        description:
            'We take accountability for our commitments and follow through.',
    },
];

export default function About({
    content,
    teamMembers,
    openPositions,
    preview = false,
}: {
    content: PageContent;
    teamMembers: TeamMemberRecord[];
    openPositions: JobOpening[];
    /** PUB-01: true only when rendered via the authenticated draft preview. */
    preview?: boolean;
}) {
    const values: FeatureGridItem[] =
        content.sections.length > 0
            ? content.sections.map((s) => ({
                  title: s.heading,
                  description: s.description,
              }))
            : defaultValues;

    return (
        <>
            <PageMeta
                title={content.metaTitle || 'About Us'}
                description={
                    content.metaDescription ||
                    content.heroSubheading ||
                    'Learn about Relocation Africa and the team behind our relocation services.'
                }
                image={content.ogImageUrl}
                noindex={preview}
            />
            {preview && <PreviewBanner />}
            <SiteHeader />
            <main>
                <section className="mx-auto w-full max-w-7xl px-6 py-16 text-center md:px-8 md:py-24">
                    <p className="text-muted-foreground text-sm">About Us</p>
                    <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                        {content.heroHeading || 'About Us'}
                    </h1>
                    <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-lg leading-8">
                        {content.heroSubheading || heroSubheadingFallback}
                    </p>
                </section>

                <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                    <MediaContent
                        title={content.introHeading || introHeadingFallback}
                        description={content.introBody || introBodyFallback}
                        hasImage
                        imagePosition="right"
                        imageUrl={content.introImageUrl}
                        imageAlt={content.introImageAlt}
                    />
                    <FeatureGrid className="mt-16" items={values} />
                </section>

                {teamMembers.length > 0 && (
                    <section className="bg-muted/30 border-y">
                        <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-8 md:py-24">
                            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                Meet Our Team
                            </h2>
                            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                                {teamMembers.map((member) => (
                                    <article
                                        key={member.id}
                                        className="text-center"
                                    >
                                        {member.photoUrl ? (
                                            <img
                                                src={member.photoUrl}
                                                alt={member.photoAlt}
                                                loading="lazy"
                                                className="mx-auto size-24 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                aria-hidden="true"
                                                className="bg-muted text-muted-foreground mx-auto flex size-24 items-center justify-center rounded-full text-lg font-medium"
                                            >
                                                {initials(member.name)}
                                            </div>
                                        )}
                                        <h3 className="mt-4 text-base font-medium">
                                            {member.name}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            {member.role}
                                        </p>
                                        {member.bio && (
                                            <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm leading-6">
                                                {member.bio}
                                            </p>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section className="mx-auto w-full max-w-7xl px-6 py-16 md:px-8 md:py-24">
                    <h2 className="text-2xl font-medium">Open Positions</h2>
                    <div className="mt-8 border-t">
                        {openPositions.length === 0 && (
                            <p className="text-muted-foreground py-8">
                                There are no open positions at the moment.
                                Please check back soon.
                            </p>
                        )}
                        {openPositions.map((job) => (
                            <article
                                key={job.id}
                                className="grid gap-3 border-b py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:py-8"
                            >
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-lg font-medium">
                                            {job.title}
                                        </h3>
                                        <Badge variant="secondary">Open</Badge>
                                    </div>
                                    <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="size-3.5" />
                                            {job.location}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarDays className="size-3.5" />
                                            Posted {formatDate(job.postedDate)}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                                        {job.description}
                                    </p>
                                </div>
                                <Button
                                    asChild
                                    variant="secondary"
                                    className="w-fit"
                                >
                                    <Link href={`/contact?career=${job.id}`}>
                                        Apply Now
                                    </Link>
                                </Button>
                            </article>
                        ))}
                    </div>
                </section>

                <SiteCta />
            </main>
            <SiteFooter />
        </>
    );
}
