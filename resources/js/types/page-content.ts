export type PageSection = { heading: string; description: string };

// CMS-02: structured, editable homepage blocks. Each block carries its own
// `enabled` flag — resources/js/pages/home.tsx only ever reads a block's
// stored content when `enabled` is true, otherwise it renders the page's
// existing hardcoded fallback copy unchanged. See App\Models\Page's
// HOME_BLOCK_DEFAULTS, which is the source of truth this type mirrors.
export type HomeTextBlock = { enabled: boolean; text: string };
export type HomeAudienceItem = { title: string; text: string };
export type HomeAudiencesBlock = {
    enabled: boolean;
    items: HomeAudienceItem[];
};
export type HomePartnershipBlock = { enabled: boolean; body: string };
export type HomeFinalCtaBlock = { enabled: boolean; description: string };

export type HomeBlocks = {
    servicesIntro: HomeTextBlock;
    africanReachIntro: HomeTextBlock;
    audiences: HomeAudiencesBlock;
    partnership: HomePartnershipBlock;
    resourcesIntro: HomeTextBlock;
    finalCta: HomeFinalCtaBlock;
};

export type PageContent = {
    heroHeading: string;
    heroSubheading: string;
    introHeading: string;
    introBody: string;
    introImageUrl: string;
    introImageAlt: string;
    sections: PageSection[];
    /** Only meaningful on the `home` slug; always present but unused elsewhere. */
    homeBlocks: HomeBlocks;
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
};

export type PageContentAdmin = {
    heroHeading: string;
    heroSubheading: string;
    introHeading: string;
    introBody: string;
    introImage: { id: string; url: string; fileName: string } | null;
    sections: PageSection[];
    /** Only meaningful on the `home` slug; always present but unused elsewhere. */
    homeBlocks: HomeBlocks;
    showTeamSection: boolean;
    metaTitle: string;
    metaDescription: string;
    ogImage: { id: string; url: string; fileName: string } | null;
};
