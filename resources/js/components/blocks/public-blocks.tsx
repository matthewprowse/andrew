import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    ChartNoAxesCombined,
    Compass,
    Globe2,
    Handshake,
    HeartHandshake,
    Landmark,
    MapPin,
    ShieldCheck,
} from 'lucide-react';
import { SiteCta } from '@/components/site-cta';
import { TestimonialSection } from '@/components/testimonial-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
    BlockDataMap,
    CardsBlockData,
    CtaBlockData,
    FaqBlockData,
    HeroBlockData,
    ImageTextBlockData,
    OpenPositionsBlockData,
    PageBlock,
    ResourcesPromoBlockData,
    ServicesGridBlockData,
    StandardsBlockData,
    StatsBlockData,
    TeamBlockData,
    TestimonialsBlockData,
    TextBlockData,
    TextWithListBlockData,
} from '@/types/blocks';

// Lifted verbatim from the original resources/js/pages/home.tsx so every
// block reproduces that page's exact look, not a new generic style.
const section = 'mx-auto w-full max-w-7xl px-6 py-16 md:px-8 md:py-24';
const heading = 'text-3xl font-semibold tracking-tight md:text-4xl';
const textLink =
    'inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4';
const serviceIcons = {
    mobility: Compass,
    immigration: Globe2,
    research: ChartNoAxesCombined,
    remuneration: Landmark,
} as const;
const fallbackServiceIcon = ShieldCheck;
const valueIcons = [Globe2, HeartHandshake, Handshake];

function iconFor(name: string | null) {
    return (
        serviceIcons[name?.toLowerCase() as keyof typeof serviceIcons] ??
        fallbackServiceIcon
    );
}

function isExternal(url: string) {
    return /^https?:\/\//i.test(url);
}

function LinkOrAnchor({
    href,
    className,
    children,
}: {
    href: string;
    className?: string;
    children: React.ReactNode;
}) {
    return isExternal(href) ? (
        <a href={href} className={className}>
            {children}
        </a>
    ) : (
        <Link href={href} className={className}>
            {children}
        </Link>
    );
}

function HeroButtons({
    data,
    className,
}: {
    data: HeroBlockData;
    className: string;
}) {
    if (!data.primaryLabel && !data.secondaryLabel) return null;

    return (
        <div className={className}>
            {data.primaryLabel && data.primaryLink && (
                <Button asChild className="min-h-11 px-5">
                    <LinkOrAnchor href={data.primaryLink}>
                        {data.primaryLabel} <ArrowRight aria-hidden="true" />
                    </LinkOrAnchor>
                </Button>
            )}
            {data.secondaryLabel && data.secondaryLink && (
                <Button asChild variant="outline" className="min-h-11 px-5">
                    <LinkOrAnchor href={data.secondaryLink}>
                        {data.secondaryLabel}
                    </LinkOrAnchor>
                </Button>
            )}
        </div>
    );
}

// About's original hero: everything centered, no services strip.
function CenteredHero({ data }: { data: HeroBlockData }) {
    return (
        <section className="mx-auto w-full max-w-7xl px-6 py-16 text-center md:px-8 md:py-24">
            <p className="text-muted-foreground text-sm">
                {data.eyebrow || 'Relocation Africa'}
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-balance md:text-5xl">
                {data.heading}
            </h1>
            {data.subheading && (
                <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-lg leading-8">
                    {data.subheading}
                </p>
            )}
            <HeroButtons
                data={data}
                className="mt-6 flex flex-wrap justify-center gap-3"
            />
        </section>
    );
}

function HeroBlock({ data }: { data: HeroBlockData }) {
    if (!data.heading && !data.subheading) return null;

    if (data.layout === 'centered') {
        return <CenteredHero data={data} />;
    }

    return (
        <section className={`${section} pb-12 md:pb-16`}>
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
                <div>
                    <p className="text-muted-foreground mb-5 text-sm font-medium">
                        {data.eyebrow || 'Relocation Africa'}
                    </p>
                    <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl lg:leading-[1.1]">
                        {data.heading}
                    </h1>
                </div>
                <div>
                    {data.subheading && (
                        <p className="text-muted-foreground text-lg leading-8">
                            {data.subheading}
                        </p>
                    )}
                    <HeroButtons
                        data={data}
                        className="mt-6 flex flex-wrap gap-3"
                    />
                </div>
            </div>
            {data.showServicesNav && data.services.length > 0 && (
                <nav
                    aria-label="Our services"
                    className="mt-12 grid grid-cols-2 border-y md:mt-16 md:grid-cols-4"
                >
                    {data.services.map((service) => {
                        const Icon = iconFor(service.icon);

                        return (
                            <Link
                                key={service.id}
                                href={`/services/${service.slug}`}
                                className="group hover:bg-muted flex min-h-20 items-center gap-3 px-3 py-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:px-5"
                            >
                                <Icon
                                    className="text-muted-foreground size-5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="text-sm font-medium sm:text-base">
                                    {service.name}
                                </span>
                                <ArrowRight
                                    className="ml-auto hidden size-4 sm:block"
                                    aria-hidden="true"
                                />
                            </Link>
                        );
                    })}
                </nav>
            )}
        </section>
    );
}

// Matches both of the original page's plain 2-column text sections ("Your
// Partner in African Mobility" and "Support Beyond the Move") — heading (and
// optional eyebrow) on the left, body copy and link on the right.
function TextBlock({ data }: { data: TextBlockData }) {
    if (!data.heading && !data.body) return null;

    return (
        <section className={`${section} pt-4 md:pt-8`}>
            <div className="grid gap-8 md:grid-cols-2 md:gap-16">
                <div>
                    {data.eyebrow && (
                        <p className="text-muted-foreground mb-4 text-sm font-medium">
                            {data.eyebrow}
                        </p>
                    )}
                    {data.heading && (
                        <h2 className={heading}>{data.heading}</h2>
                    )}
                </div>
                <div>
                    {data.body && (
                        <p className="text-muted-foreground leading-7 whitespace-pre-line">
                            {data.body}
                        </p>
                    )}
                    {data.linkLabel && data.linkUrl && (
                        <LinkOrAnchor
                            href={data.linkUrl}
                            className={`${textLink} mt-5`}
                        >
                            {data.linkLabel}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </LinkOrAnchor>
                    )}
                </div>
            </div>
        </section>
    );
}

// Matches "African Reach, Local Understanding": reach copy beside a
// bordered, divided list of items (originally the audience cards).
function TextWithListBlock({ data }: { data: TextWithListBlockData }) {
    return (
        <section className={section}>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
                <div>
                    {data.heading && (
                        <h2 className={heading}>{data.heading}</h2>
                    )}
                    {data.body && (
                        <p className="text-muted-foreground mt-5 leading-7">
                            {data.body}
                        </p>
                    )}
                    {data.linkLabel && data.linkUrl && (
                        <LinkOrAnchor
                            href={data.linkUrl}
                            className={`${textLink} mt-5`}
                        >
                            {data.linkLabel}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </LinkOrAnchor>
                    )}
                </div>
                <div className="divide-y border-y">
                    {data.items
                        .filter((item) => item.title)
                        .map((item, index) => (
                            <div
                                key={`${item.title}-${index}`}
                                className="py-6"
                            >
                                <h3 className="text-lg font-medium">
                                    {item.title}
                                </h3>
                                {item.text && (
                                    <p className="text-muted-foreground mt-3 leading-7">
                                        {item.text}
                                    </p>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        </section>
    );
}

// Matches "The People Behind Every Move": a muted band with a 2/3-column
// icon + heading + description grid, icons cycling through a fixed set.
function IconCards({
    items,
    columns,
}: {
    items: CardsBlockData['items'];
    columns: 2 | 3;
}) {
    return (
        <div
            className={`mt-10 grid gap-10 ${columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}
        >
            {items.map((item, index) => {
                const Icon = valueIcons[index % valueIcons.length];

                return (
                    <div key={`${item.title}-${index}`}>
                        <Icon className="mb-5 size-6" aria-hidden="true" />
                        <h3 className="text-xl font-medium">{item.title}</h3>
                        {item.text && (
                            <p className="text-muted-foreground mt-4 leading-7">
                                {item.text}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Matches About's original values grid (FeatureGrid): a plain bordered
// list, two columns, no icons.
function ListCards({ items }: { items: CardsBlockData['items'] }) {
    return (
        <div className="mt-10 grid border-t md:grid-cols-2 md:gap-x-12">
            {items.map((item, index) => (
                <article
                    key={`${item.title}-${index}`}
                    className="border-b py-6 md:py-8"
                >
                    <h3 className="text-lg font-medium">{item.title}</h3>
                    {item.text && (
                        <p className="text-muted-foreground mt-2 max-w-xl leading-7">
                            {item.text}
                        </p>
                    )}
                </article>
            ))}
        </div>
    );
}

function CardsBlock({ data }: { data: CardsBlockData }) {
    const items = data.items.filter((item) => item.title);
    if (items.length === 0) return null;

    const body = (
        <div className={section}>
            {data.heading && <h2 className={heading}>{data.heading}</h2>}
            {data.intro && (
                <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
                    {data.intro}
                </p>
            )}
            {data.style === 'list' ? (
                <ListCards items={items} />
            ) : (
                <IconCards items={items} columns={data.columns} />
            )}
        </div>
    );

    return data.style === 'list' ? (
        <section>{body}</section>
    ) : (
        <section className="bg-muted/30 border-y">{body}</section>
    );
}

function ServicesGridBlock({ data }: { data: ServicesGridBlockData }) {
    return (
        <section
            id="services"
            className="bg-muted/30 scroll-mt-20 border-y"
            aria-labelledby="services-heading"
        >
            <div className={section}>
                {data.heading && (
                    <h2 id="services-heading" className={heading}>
                        {data.heading}
                    </h2>
                )}
                {data.intro && (
                    <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
                        {data.intro}
                    </p>
                )}
                {data.services.length > 0 ? (
                    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {data.services.map((service) => {
                            const Icon = iconFor(service.icon);

                            return (
                                <article
                                    key={service.id}
                                    className="bg-background flex flex-col rounded-xl border p-6"
                                >
                                    <Icon
                                        className="text-muted-foreground mb-8 size-7"
                                        aria-hidden="true"
                                    />
                                    <h3 className="text-xl font-medium">
                                        {service.headline || service.name}
                                    </h3>
                                    {service.intro && (
                                        <p className="text-muted-foreground mt-4 flex-1 leading-7">
                                            {service.intro}
                                        </p>
                                    )}
                                    <Link
                                        href={`/services/${service.slug}`}
                                        className={`${textLink} mt-6`}
                                    >
                                        Explore {service.name}
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-muted-foreground mt-10 leading-7">
                        Our services will be available here soon.
                    </p>
                )}
            </div>
        </section>
    );
}

function TestimonialsBlockRender({ data }: { data: TestimonialsBlockData }) {
    return <TestimonialSection testimonials={data.testimonials} />;
}

// Matches "Support Beyond the Move"'s membership box: heading + icon always
// show, the membership copy underneath only when it's actually set in
// Company > Settings.
function StandardsBlock({ data }: { data: StandardsBlockData }) {
    return (
        <div className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
            <div className="grid gap-8 rounded-xl border p-6 md:grid-cols-2 md:p-10">
                <div>
                    <ShieldCheck className="mb-5 size-7" aria-hidden="true" />
                    <h2 className="text-2xl font-medium">{data.heading}</h2>
                </div>
                <div>
                    {data.membershipHeading && (
                        <h3 className="text-lg font-medium">
                            {data.membershipHeading}
                        </h3>
                    )}
                    {data.membershipText && (
                        <p className="text-muted-foreground mt-3 leading-7 whitespace-pre-line">
                            {data.membershipText}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResourcesPromoBlock({ data }: { data: ResourcesPromoBlockData }) {
    if (data.cards.length === 0) return null;

    return (
        <section className={`${section} border-t`}>
            {data.heading && <h2 className={heading}>{data.heading}</h2>}
            {data.intro && (
                <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
                    {data.intro}
                </p>
            )}
            <div className="mt-10 grid gap-8 md:grid-cols-3">
                {data.cards.map((card) => (
                    <article key={card.href} className="border-t pt-6">
                        <h3 className="text-xl font-medium">{card.title}</h3>
                        <p className="text-muted-foreground mt-4 leading-7">
                            {card.text}
                        </p>
                        <Link href={card.href} className={`${textLink} mt-4`}>
                            Explore {card.title}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}

// Matches About's original intro section (MediaContent): heading + body
// beside a photo, either side, an even placeholder block when no image is set.
function ImageTextBlock({ data }: { data: ImageTextBlockData }) {
    if (!data.heading && !data.body) return null;

    const image = data.imageUrl ? (
        <img
            src={data.imageUrl}
            alt={data.imageAlt}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-xl object-cover"
        />
    ) : (
        <div aria-hidden="true" className="bg-muted aspect-[4/3] rounded-xl" />
    );
    const copy = (
        <div>
            {data.heading && (
                <h2 className="text-2xl font-medium">{data.heading}</h2>
            )}
            {data.body && (
                <p className="text-muted-foreground mt-4 max-w-xl leading-7 whitespace-pre-line">
                    {data.body}
                </p>
            )}
        </div>
    );

    return (
        <section className={section}>
            <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
                {data.imagePosition === 'left' && image}
                {copy}
                {data.imagePosition === 'right' && image}
            </div>
        </section>
    );
}

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

// Matches About's original "Meet Our Team" section.
function TeamBlock({ data }: { data: TeamBlockData }) {
    if (data.members.length === 0) return null;

    return (
        <section className="bg-muted/30 border-y">
            <div className={section}>
                {data.heading && <h2 className={heading}>{data.heading}</h2>}
                <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                    {data.members.map((member) => (
                        <article key={member.id} className="text-center">
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
    );
}

function formatPostedDate(date: string) {
    const [year, month, day] = date.split('-').map(Number);
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
    return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
}

// Matches About's original "Open Positions" list.
function OpenPositionsBlock({ data }: { data: OpenPositionsBlockData }) {
    return (
        <section className={section}>
            {data.heading && (
                <h2 className="text-2xl font-medium">{data.heading}</h2>
            )}
            <div className="mt-8 border-t">
                {data.positions.length === 0 && (
                    <p className="text-muted-foreground py-8">
                        There are no open positions at the moment. Please check
                        back soon.
                    </p>
                )}
                {data.positions.map((job) => (
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
                                    Posted {formatPostedDate(job.postedDate)}
                                </span>
                            </div>
                            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                                {job.description}
                            </p>
                        </div>
                        <Button asChild variant="secondary" className="w-fit">
                            <Link href={`/contact?career=${job.id}`}>
                                Apply Now
                            </Link>
                        </Button>
                    </article>
                ))}
            </div>
        </section>
    );
}

// Full, static Tailwind class names — a template-built class like
// `sm:grid-cols-${n}` is invisible to Tailwind's build-time scan and would
// silently ship with no column rule at all.
const statsColumnClasses: Record<number, string> = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
};

function StatsBlockRender({ data }: { data: StatsBlockData }) {
    const items = data.items.filter((item) => item.value);
    if (items.length === 0) return null;
    const columnsClass =
        items.length >= 4
            ? 'sm:grid-cols-2 lg:grid-cols-4'
            : (statsColumnClasses[items.length] ?? 'sm:grid-cols-3');

    return (
        <section className={section}>
            {data.heading && <h2 className={heading}>{data.heading}</h2>}
            <div
                className={`grid gap-8 ${data.heading ? 'mt-10' : ''} ${columnsClass}`}
            >
                {items.map((item, index) => (
                    <div
                        key={`${item.value}-${index}`}
                        className="border-t pt-4"
                    >
                        <p className="text-4xl font-semibold tabular-nums">
                            {item.value}
                        </p>
                        {item.label && (
                            <p className="text-muted-foreground mt-1 text-sm">
                                {item.label}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

function FaqBlockRender({ data }: { data: FaqBlockData }) {
    const items = data.items.filter((item) => item.question);
    if (items.length === 0) return null;

    return (
        <section className={section}>
            {data.heading && <h2 className={heading}>{data.heading}</h2>}
            <div className="mt-10 max-w-3xl divide-y border-y">
                {items.map((item, index) => (
                    <details
                        key={`${item.question}-${index}`}
                        className="group py-4"
                    >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                            {item.question}
                            <span
                                aria-hidden="true"
                                className="text-muted-foreground shrink-0 transition-transform group-open:rotate-45"
                            >
                                +
                            </span>
                        </summary>
                        <p className="text-muted-foreground mt-3 leading-7 whitespace-pre-line">
                            {item.answer}
                        </p>
                    </details>
                ))}
            </div>
        </section>
    );
}

function CtaBlock({ data }: { data: CtaBlockData }) {
    return (
        <SiteCta
            title={data.heading || undefined}
            description={data.description || undefined}
            label={data.buttonLabel || undefined}
            href={data.buttonLink || undefined}
        />
    );
}

export function PublicBlock({ block }: { block: PageBlock }) {
    switch (block.type) {
        case 'hero':
            return <HeroBlock data={block.data as BlockDataMap['hero']} />;
        case 'text':
            return <TextBlock data={block.data as BlockDataMap['text']} />;
        case 'text_with_list':
            return (
                <TextWithListBlock
                    data={block.data as BlockDataMap['text_with_list']}
                />
            );
        case 'cards':
            return <CardsBlock data={block.data as BlockDataMap['cards']} />;
        case 'services_grid':
            return (
                <ServicesGridBlock
                    data={block.data as BlockDataMap['services_grid']}
                />
            );
        case 'testimonials':
            return (
                <TestimonialsBlockRender
                    data={block.data as BlockDataMap['testimonials']}
                />
            );
        case 'standards':
            return (
                <StandardsBlock
                    data={block.data as BlockDataMap['standards']}
                />
            );
        case 'resources_promo':
            return (
                <ResourcesPromoBlock
                    data={block.data as BlockDataMap['resources_promo']}
                />
            );
        case 'cta':
            return <CtaBlock data={block.data as BlockDataMap['cta']} />;
        case 'image_text':
            return (
                <ImageTextBlock
                    data={block.data as BlockDataMap['image_text']}
                />
            );
        case 'team':
            return <TeamBlock data={block.data as BlockDataMap['team']} />;
        case 'open_positions':
            return (
                <OpenPositionsBlock
                    data={block.data as BlockDataMap['open_positions']}
                />
            );
        case 'stats':
            return (
                <StatsBlockRender data={block.data as BlockDataMap['stats']} />
            );
        case 'faq':
            return <FaqBlockRender data={block.data as BlockDataMap['faq']} />;
        default:
            return null;
    }
}
