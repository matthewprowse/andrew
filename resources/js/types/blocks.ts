export type HeroServiceLink = {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
};

export type HeroBlockData = {
    heading: string;
    subheading: string;
    eyebrow: string;
    primaryLabel: string;
    primaryLink: string;
    secondaryLabel: string;
    secondaryLink: string;
    layout: 'split' | 'centered';
    showServicesNav: boolean;
    services: HeroServiceLink[];
};

export type TextWithListBlockData = {
    heading: string;
    body: string;
    linkLabel: string;
    linkUrl: string;
    items: { title: string; text: string }[];
};

export type StandardsBlockData = {
    heading: string;
    membershipHeading: string;
    membershipText: string;
};

export type TextBlockData = {
    eyebrow: string;
    heading: string;
    body: string;
    linkLabel: string;
    linkUrl: string;
};

export type CardsBlockData = {
    heading: string;
    intro: string;
    columns: 2 | 3;
    style: 'icons' | 'list';
    items: { title: string; text: string }[];
};

export type ServicesGridBlockData = {
    heading: string;
    intro: string;
    services: {
        id: number;
        name: string;
        headline: string;
        slug: string;
        intro: string;
        icon: string | null;
    }[];
};

export type TestimonialsBlockData = {
    heading: string;
    testimonials: {
        id: string;
        quote: string;
        author: string;
        company: string;
    }[];
};

export type ResourcesPromoBlockData = {
    heading: string;
    intro: string;
    cards: { title: string; href: string; text: string }[];
};

export type CtaBlockData = {
    heading: string;
    description: string;
    buttonLabel: string;
    buttonLink: string;
};

export type ImageTextBlockData = {
    heading: string;
    body: string;
    imagePosition: 'left' | 'right';
    image: { id: string; url: string; fileName: string } | null;
    imageUrl: string;
    imageAlt: string;
};

export type TeamBlockData = {
    heading: string;
    members: {
        id: string;
        name: string;
        role: string;
        bio: string;
        photoUrl: string;
        photoAlt: string;
    }[];
};

export type OpenPositionsBlockData = {
    heading: string;
    positions: {
        id: string;
        title: string;
        description: string;
        location: string;
        postedDate: string;
    }[];
};

export type StatsBlockData = {
    heading: string;
    items: { value: string; label: string }[];
};

export type FaqBlockData = {
    heading: string;
    items: { question: string; answer: string }[];
};

export type BlockDataMap = {
    hero: HeroBlockData;
    text: TextBlockData;
    cards: CardsBlockData;
    services_grid: ServicesGridBlockData;
    testimonials: TestimonialsBlockData;
    resources_promo: ResourcesPromoBlockData;
    cta: CtaBlockData;
    text_with_list: TextWithListBlockData;
    standards: StandardsBlockData;
    image_text: ImageTextBlockData;
    team: TeamBlockData;
    open_positions: OpenPositionsBlockData;
    stats: StatsBlockData;
    faq: FaqBlockData;
};

export type BlockType = keyof BlockDataMap;

export type PageBlock<T extends BlockType = BlockType> = {
    [K in T]: { id: string; type: K; data: BlockDataMap[K] };
}[T];

export type BlockCatalogueEntry = {
    key: BlockType;
    label: string;
    defaultData: Record<string, unknown>;
};

export const BLOCK_LABELS: Record<BlockType, string> = {
    hero: 'Hero',
    text: 'Text',
    cards: 'Cards',
    services_grid: 'Services grid',
    testimonials: 'Testimonials',
    resources_promo: 'Resources promo',
    cta: 'Call to action',
    text_with_list: 'Text with list',
    standards: 'Professional standards',
    image_text: 'Image + text',
    team: 'Team',
    open_positions: 'Open positions',
    stats: 'Stats',
    faq: 'FAQ',
};
