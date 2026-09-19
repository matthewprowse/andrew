import { createInertiaApp, usePage } from '@inertiajs/react';
import {
    StrictMode,
    useEffect,
    useLayoutEffect,
    useRef,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { MARKETING_DEFAULT_COLORS } from '@/lib/marketing-theme';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import type { PublicSettings } from '@/types/site-settings';

const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect;

const marketingTokenAliases: Record<string, string[]> = {
    background: ['--background'],
    foreground: ['--foreground'],
    card: ['--card'],
    cardForeground: ['--card-foreground'],
    popover: ['--popover'],
    popoverForeground: ['--popover-foreground'],
    primary: ['--primary'],
    primaryForeground: ['--primary-foreground'],
    secondary: ['--secondary'],
    secondaryForeground: ['--secondary-foreground'],
    muted: ['--muted'],
    mutedForeground: ['--muted-foreground'],
    accent: ['--accent'],
    accentForeground: ['--accent-foreground'],
    destructive: ['--destructive'],
    destructiveForeground: ['--destructive-foreground'],
    input: ['--input'],
    ring: ['--ring'],
    chart1: ['--chart-1'],
    chart2: ['--chart-2'],
    chart3: ['--chart-3'],
    chart4: ['--chart-4'],
    chart5: ['--chart-5'],
    surface: ['--card', '--popover'],
    border: ['--border'],
    body: ['--foreground'],
};

const marketingTokenNames = [
    ...new Set(Object.values(marketingTokenAliases).flat()),
];

type MarketingRootBaseline = {
    tokenValues: Map<string, string>;
    hadMarketingDark: boolean;
    marketingDarkValue: string | null;
    backgroundColor: string;
    colorScheme: string;
};

// A marketing layout can be replaced while React transitions between two
// marketing pages. Keep one baseline for the whole visit so an outgoing
// layout cannot restore the app theme in the middle of that transition.
let marketingRootBaseline: MarketingRootBaseline | null = null;

function AppProviders({ children }: { children: ReactNode }) {
    useFlashToast();

    return (
        <TooltipProvider delayDuration={0}>
            {children}
            <Toaster />
        </TooltipProvider>
    );
}

function SiteThemeLayout({ children }: { children: ReactNode }) {
    const { publicSettings } = usePage<{ publicSettings: PublicSettings }>()
        .props;
    const marketingTheme = publicSettings.site.marketingTheme;
    const marketingSiteRef = useRef<HTMLDivElement>(null);

    const isDark =
        marketingTheme.mode === 'dark' ||
        (marketingTheme.mode === 'system' &&
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);
    const defaultColors =
        MARKETING_DEFAULT_COLORS[marketingTheme.preset] ??
        MARKETING_DEFAULT_COLORS.neutral;
    const customColors = marketingTheme.colors ?? {};
    const customColorsKey = JSON.stringify(customColors);
    const colorVariables = Object.fromEntries(
        Object.entries(defaultColors).flatMap(([key, defaultValue]) => {
            const custom = customColors[key as keyof typeof customColors];
            const value = custom || defaultValue;
            const cssKey = key.replace(
                /[A-Z]/g,
                (letter) => `-${letter.toLowerCase()}`,
            );

            // Neutral with no overrides must be byte-for-byte the normal
            // ShadCN theme. In particular, don't replace --foreground with a
            // hex approximation just to support marketing-only heading/link
            // colours. Presets and explicit overrides are intentionally
            // allowed to opt into the marketing bridge.
            const marketingVariable =
                marketingTheme.preset !== 'neutral' || custom
                    ? [[`--marketing-${cssKey}`, value]]
                    : [];
            const semanticVariables = custom
                ? (marketingTokenAliases[key] ?? []).map((name) => [
                      name,
                      value,
                  ])
                : [];

            return [...marketingVariable, ...semanticVariables];
        }),
    ) as CSSProperties;

    // This must run before the browser paints after an Inertia navigation.
    // A normal effect leaves one frame where portalled UI reads the default
    // light tokens while the new marketing page is still applying its theme.
    useIsomorphicLayoutEffect(() => {
        const root = document.documentElement;
        const marketingSite = marketingSiteRef.current;
        if (!marketingSite) return;

        // Radix portals (selects, popovers, dialogs and tooltips) mount under
        // body rather than inside this wrapper. Mirror the resolved marketing
        // tokens onto the document root while this page is active so those
        // controls use exactly the same palette as the page itself.
        if (!marketingRootBaseline) {
            marketingRootBaseline = {
                tokenValues: new Map(
                    marketingTokenNames.map((name) => [
                        name,
                        root.style.getPropertyValue(name),
                    ]),
                ),
                hadMarketingDark: root.hasAttribute('data-marketing-dark'),
                marketingDarkValue: root.getAttribute('data-marketing-dark'),
                backgroundColor: root.style.backgroundColor,
                colorScheme: root.style.colorScheme,
            };
        }

        const computed = getComputedStyle(marketingSite);
        marketingTokenNames.forEach((name) => {
            root.style.setProperty(name, computed.getPropertyValue(name));
        });

        // Keep the browser canvas and native controls on the marketing theme
        // too. This prevents the document itself from showing a light frame
        // while one service page is replaced by another.
        root.style.backgroundColor = computed.getPropertyValue('--background');
        root.style.colorScheme = isDark ? 'dark' : 'light';

        if (isDark) root.setAttribute('data-marketing-dark', 'true');
        else root.removeAttribute('data-marketing-dark');
        root.removeAttribute('data-marketing-bootstrap-dark');

        return () => {
            // React cleans up the outgoing layout before committing the next
            // one. Defer restoration and only do it if no marketing layout is
            // present after the commit.
            queueMicrotask(() => {
                if (document.querySelector('[data-marketing-site]')) return;

                const baseline = marketingRootBaseline;
                if (!baseline) return;

                marketingTokenNames.forEach((name) => {
                    const previous = baseline.tokenValues.get(name) ?? '';
                    if (previous) root.style.setProperty(name, previous);
                    else root.style.removeProperty(name);
                });
                root.style.backgroundColor = baseline.backgroundColor;
                root.style.colorScheme = baseline.colorScheme;

                if (baseline.hadMarketingDark) {
                    root.setAttribute(
                        'data-marketing-dark',
                        baseline.marketingDarkValue ?? '',
                    );
                } else {
                    root.removeAttribute('data-marketing-dark');
                }

                marketingRootBaseline = null;
            });
        };
    }, [customColorsKey, isDark, marketingTheme.mode, marketingTheme.preset]);

    return (
        <div
            ref={marketingSiteRef}
            data-marketing-site
            data-theme-preset={marketingTheme.preset || 'neutral'}
            className={
                isDark
                    ? 'dark bg-background text-foreground min-h-screen'
                    : 'bg-background text-foreground min-h-screen'
            }
            style={colorVariables}
        >
            {children}
        </div>
    );
}

function SettingsPageLayout({ children }: { children: ReactNode }) {
    const { component, props, url } = usePage();
    const isAdminContext =
        new URLSearchParams(url.split('?')[1] ?? '').get('context') ===
            'admin' && props.auth?.canAdmin;
    const content =
        component === 'settings/account' ? (
            children
        ) : (
            <SettingsLayout>{children}</SettingsLayout>
        );

    return isAdminContext ? (
        <AdminWorkspaceLayout title="Account Settings">
            {content}
        </AdminWorkspaceLayout>
    ) : (
        <AppLayout>{content}</AppLayout>
    );
}

// Vite can re-evaluate this entry when page imports change. Keep the root for
// each DOM container across those evaluations instead of hydrating it twice.
const roots: WeakMap<HTMLElement, Root> =
    import.meta.hot?.data.roots ?? new WeakMap<HTMLElement, Root>();
if (import.meta.hot) {
    import.meta.hot.data.roots = roots;
    // Startup configuration changes need a fresh Inertia instance. Page and
    // component updates still use React Fast Refresh independently.
    import.meta.hot.accept(() => window.location.reload());
}

void createInertiaApp({
    title: (title) => title || 'Relocation Africa',
    layout: (name) => {
        let Layout: React.ComponentType<any> | null = null;

        switch (true) {
            case name === 'page' ||
                name === 'contact' ||
                name === 'service' ||
                name === 'services' ||
                name === 'resource' ||
                name === 'estimator' ||
                name === 'locations' ||
                name === 'country' ||
                name === 'error' ||
                name === 'checkout' ||
                name === 'about' ||
                name === 'blog' ||
                name === 'blog-post' ||
                name.startsWith('admin/'):
                break;
            case name.startsWith('auth/'):
                Layout = AuthLayout;
                break;
            case name.startsWith('settings/'):
                Layout = SettingsPageLayout;
                break;
            default:
                Layout = AppLayout;
        }

        return function ThemedLayout(props: any) {
            const content = Layout ? <Layout {...props} /> : props.children;
            const isMarketingPage = [
                'page',
                'contact',
                'service',
                'services',
                'resource',
                'estimator',
                'locations',
                'country',
                'error',
                'checkout',
                'about',
                'blog',
                'blog-post',
            ].includes(name);
            return isMarketingPage ? (
                <SiteThemeLayout>{content}</SiteThemeLayout>
            ) : (
                content
            );
        };
    },
    setup({ el, App, props }) {
        const app = (
            <StrictMode>
                <AppProviders>
                    <App {...props} />
                </AppProviders>
            </StrictMode>
        );

        if (!el) return app;

        const existingRoot = roots.get(el);
        if (existingRoot) {
            return;
        } else if (el.hasAttribute('data-server-rendered')) {
            roots.set(el, hydrateRoot(el, app));
        } else {
            const root = createRoot(el);
            roots.set(el, root);
            root.render(app);
        }
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
