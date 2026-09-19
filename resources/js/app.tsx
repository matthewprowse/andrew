import { createInertiaApp, usePage } from "@inertiajs/react";
import { StrictMode, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initializeTheme } from "@/hooks/use-appearance";
import { useFlashToast } from "@/hooks/use-flash-toast";
import { MARKETING_DEFAULT_COLORS } from "@/lib/marketing-theme";
import AppLayout from "@/layouts/app-layout";
import AuthLayout from "@/layouts/auth-layout";
import SettingsLayout from "@/layouts/settings/layout";
import AdminWorkspaceLayout from "@/layouts/admin-workspace-layout";
import type { PublicSettings } from "@/types/site-settings";

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
    const { publicSettings } = usePage<{ publicSettings: PublicSettings }>().props;
    const marketingTheme = publicSettings.site.marketingTheme;
    const marketingSiteRef = useRef<HTMLDivElement>(null);

    const isDark =
        marketingTheme.mode === "dark" ||
        (marketingTheme.mode === "system" &&
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
    const aliases: Record<string, string[]> = {
        background: ["--background"],
        foreground: ["--foreground"],
        card: ["--card"],
        cardForeground: ["--card-foreground"],
        popover: ["--popover"],
        popoverForeground: ["--popover-foreground"],
        primary: ["--primary"],
        primaryForeground: ["--primary-foreground"],
        secondary: ["--secondary"],
        secondaryForeground: ["--secondary-foreground"],
        muted: ["--muted"],
        mutedForeground: ["--muted-foreground"],
        accent: ["--accent"],
        accentForeground: ["--accent-foreground"],
        destructive: ["--destructive"],
        destructiveForeground: ["--destructive-foreground"],
        input: ["--input"],
        ring: ["--ring"],
        chart1: ["--chart-1"],
        chart2: ["--chart-2"],
        chart3: ["--chart-3"],
        chart4: ["--chart-4"],
        chart5: ["--chart-5"],
        surface: ["--card", "--popover"],
        border: ["--border"],
        body: ["--foreground"],
    };
    const defaultColors =
        MARKETING_DEFAULT_COLORS[marketingTheme.preset] ?? MARKETING_DEFAULT_COLORS.neutral;
    const customColors = marketingTheme.colors ?? {};
    const colorVariables = Object.fromEntries(
        Object.entries(defaultColors).flatMap(([key, defaultValue]) => {
            const custom = customColors[key as keyof typeof customColors];
            const value = custom || defaultValue;
            const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

            // Neutral with no overrides must be byte-for-byte the normal
            // ShadCN theme. In particular, don't replace --foreground with a
            // hex approximation just to support marketing-only heading/link
            // colours. Presets and explicit overrides are intentionally
            // allowed to opt into the marketing bridge.
            const marketingVariable =
                marketingTheme.preset !== "neutral" || custom
                    ? [[`--marketing-${cssKey}`, value]]
                    : [];
            const semanticVariables = custom
                ? (aliases[key] ?? []).map((name) => [name, value])
                : [];

            return [...marketingVariable, ...semanticVariables];
        }),
    ) as CSSProperties;

    useEffect(() => {
        initializeTheme();

        const root = document.documentElement;
        const marketingSite = marketingSiteRef.current;
        if (!marketingSite) return;

        // Radix portals (selects, popovers, dialogs and tooltips) mount under
        // body rather than inside this wrapper. Mirror the resolved marketing
        // tokens onto the document root while this page is active so those
        // controls use exactly the same palette as the page itself.
        const tokenNames = [
            ...new Set(Object.values(aliases).flat()),
        ];
        const previousValues = new Map(
            tokenNames.map((name) => [name, root.style.getPropertyValue(name)]),
        );
        const computed = getComputedStyle(marketingSite);
        tokenNames.forEach((name) => {
            root.style.setProperty(name, computed.getPropertyValue(name));
        });

        const hadMarketingDark = root.hasAttribute("data-marketing-dark");
        const previousMarketingDark = root.getAttribute("data-marketing-dark");
        if (isDark) root.setAttribute("data-marketing-dark", "true");
        else root.removeAttribute("data-marketing-dark");

        return () => {
            tokenNames.forEach((name) => {
                const previous = previousValues.get(name) ?? "";
                if (previous) root.style.setProperty(name, previous);
                else root.style.removeProperty(name);
            });
            if (hadMarketingDark) {
                root.setAttribute("data-marketing-dark", previousMarketingDark ?? "");
            } else {
                root.removeAttribute("data-marketing-dark");
            }
        };
    }, [isDark, marketingTheme.colors, marketingTheme.mode, marketingTheme.preset]);

    return (
        <div
            ref={marketingSiteRef}
            data-marketing-site
            data-theme-preset={marketingTheme.preset || "neutral"}
            className={
                isDark
                    ? "dark bg-background text-foreground min-h-screen"
                    : "bg-background text-foreground min-h-screen"
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
        new URLSearchParams(url.split("?")[1] ?? "").get("context") === "admin" &&
        props.auth?.canAdmin;
    const content =
        component === "settings/account" ? children : <SettingsLayout>{children}</SettingsLayout>;

    return isAdminContext ? (
        <AdminWorkspaceLayout title="Account Settings">{content}</AdminWorkspaceLayout>
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
    title: (title) => title || "Relocation Africa",
    layout: (name) => {
        let Layout: React.ComponentType<any> | null = null;

        switch (true) {
            case name === "page" ||
                name === "welcome" ||
                name === "contact" ||
                name === "service" ||
                name === "services" ||
                name === "resource" ||
                name === "estimator" ||
                name === "locations" ||
                name === "country" ||
                name === "error" ||
                name === "careers" ||
                name === "checkout" ||
                name === "about" ||
                name === "blog" ||
                name === "blog-post" ||
                name.startsWith("admin/"):
                break;
            case name.startsWith("auth/"):
                Layout = AuthLayout;
                break;
            case name.startsWith("settings/"):
                Layout = SettingsPageLayout;
                break;
            default:
                Layout = AppLayout;
        }

        return function ThemedLayout(props: any) {
            const content = Layout ? <Layout {...props} /> : props.children;
            const isMarketingPage = [
                "page",
                "welcome",
                "contact",
                "service",
                "services",
                "resource",
                "estimator",
                "locations",
                "country",
                "error",
                "careers",
                "checkout",
                "about",
                "blog",
                "blog-post",
            ].includes(name);
            return isMarketingPage ? <SiteThemeLayout>{content}</SiteThemeLayout> : content;
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
        } else if (el.hasAttribute("data-server-rendered")) {
            roots.set(el, hydrateRoot(el, app));
        } else {
            const root = createRoot(el);
            roots.set(el, root);
            root.render(app);
        }
    },
    progress: {
        color: "#4B5563",
    },
});

// This will set light / dark mode on load...
initializeTheme();
