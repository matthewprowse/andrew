export type SiteValues = {
    footerText: string;
    copyrightLine: string;
    defaultCtaText: string;
    defaultCtaDescription: string;
    defaultCtaButtonLabel: string;
    defaultCtaLink: string;
    euraHeading: string;
    euraText: string;
    organizationName: string;
    defaultOgImage: string;
    organizationLogo: string;
    feedbackEnabled: boolean;
    marketingTheme: MarketingTheme;
};
export type MarketingThemePreset =
    | 'neutral'
    | 'blue'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'violet';
export type MarketingThemeMode = 'system' | 'light' | 'dark';
export type MarketingThemeColors = Partial<
    Record<
        | 'background'
        | 'foreground'
        | 'card'
        | 'cardForeground'
        | 'popover'
        | 'popoverForeground'
        | 'primary'
        | 'primaryForeground'
        | 'secondary'
        | 'secondaryForeground'
        | 'muted'
        | 'mutedForeground'
        | 'accent'
        | 'accentForeground'
        | 'destructive'
        | 'destructiveForeground'
        | 'border'
        | 'input'
        | 'ring'
        | 'chart1'
        | 'chart2'
        | 'chart3'
        | 'chart4'
        | 'chart5'
        | 'surface'
        | 'heading'
        | 'headingSecondary'
        | 'headingTertiary'
        | 'body'
        | 'link'
        | 'linkHover',
        string | null
    >
>;
export type MarketingTheme = {
    preset: MarketingThemePreset;
    mode: MarketingThemeMode;
    colors: MarketingThemeColors;
};
export type MenuEntry = {
    id: string;
    label: string;
    link: string;
    section: 'header' | 'footer';
    parentId: string | null;
    sortOrder: number;
    childrenSource: 'manual' | 'services';
};
export type SocialEntry = {
    id: string;
    platform: string;
    url: string;
    sortOrder: number;
};
export type Settings = {
    site: SiteValues;
    menu: MenuEntry[];
    socialLinks: SocialEntry[];
};
export type PublicSettings = {
    site: SiteValues;
    menu: (MenuEntry & {
        children: { id: string; label: string; link: string }[];
    })[];
    socialLinks: SocialEntry[];
};
