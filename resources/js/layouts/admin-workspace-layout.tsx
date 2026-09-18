import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
import {
    BarChart3,
    Briefcase,
    Building2,
    ChevronRight,
    Globe,
    House,
    Library,
    MessageSquare,
    FlaskConical,
    Users,
    UserCog,
} from 'lucide-react';
import { FeedbackFab } from '@/components/admin/feedback-fab';
import { WorkspaceNavUser } from '@/components/admin/workspace-nav-user';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import type { BreadcrumbItem, NavItem } from '@/types';

// New, separate shell for the non-Services admin pages — see
// docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 2 (NAV-01..NAV-06). Deliberately
// NOT built on top of admin-layout.tsx: Services keeps using that file
// completely untouched, and this file reuses its patterns (Radix sidebar
// primitives, isActiveRoute, permission filtering, NavUser) as new, parallel
// code rather than by importing or extending it. Do not import this layout
// from any Services file, and do not import admin-layout.tsx here.

interface AdminWorkspaceLayoutProps {
    title: string;
    /** Rendered as this page's <meta name="description">. Every page should set one. */
    description?: string;
    children?: ReactNode;
    /** Page-specific control rendered top-right of the header, e.g. a "New…" button. */
    headerAction?: ReactNode;
}

type WorkspaceNavItem = NavItem & {
    /** Filters this item by a single config('admin.sections') key. */
    section?: string;
    /**
     * Filters this item by ANY of several section keys — used by the hub
     * items (Pages, Content Library) that front more than one
     * separately-permissioned area. See docs/ADMIN_UX_SEO_BUILD_PLAN.md §3.
     */
    anySection?: string[];
    /** Only visible to root administrators. */
    rootOnly?: boolean;
    /** Small label rendered after the item's title — e.g. "Beta". */
    badge?: string;
};

type SidebarChildItem = {
    title: string;
    href: string;
    /** Renders as a button that posts to `href` instead of a navigation link — for one-click actions like "+ New page". */
    action?: boolean;
};

// Keep operational customer work together while leaving reporting and product
// feedback as flat, standalone destinations. Pages, Content Library, Company,
// are the expandable workspaces in this shell.
// Services is a direct link to /admin/services and is never nested under
// Pages, renamed, or replaced — see §1.1/§1.2 of that plan.
const navigationGroups: WorkspaceNavItem[][] = [
    [
        {
            title: 'Home',
            href: '/admin',
            icon: House,
        },
        {
            title: 'Pages',
            href: '/admin/pages',
            icon: Globe,
            anySection: ['pages'],
        },
        {
            title: 'Services',
            href: '/admin/services',
            icon: Briefcase,
            section: 'services',
        },
        {
            title: 'Content Library',
            href: '/admin/content',
            icon: Library,
            anySection: ['blog', 'resources', 'testimonials', 'media'],
        },
        {
            title: 'Company',
            href: '/admin/company',
            icon: Building2,
            anySection: ['pages', 'team', 'careers', 'settings'],
        },
    ],
    [
        {
            title: 'Customers',
            href: '/admin/inquiries',
            icon: Users,
            anySection: ['inquiries', 'orders'],
        },
    ],
    [
        {
            title: 'Analytics',
            href: '/admin/analytics',
            icon: BarChart3,
            section: 'analytics',
        },
        {
            title: 'Feedback',
            href: '/admin/feedback',
            icon: MessageSquare,
            rootOnly: true,
        },
    ],
    [
        {
            title: 'Experimental',
            href: '/admin/estimator',
            icon: FlaskConical,
            anySection: ['estimator'],
        },
    ],
];

const OPEN_MENUS_STORAGE_KEY = 'admin-sidebar-open-menus';

function isActiveRoute(url: string, href: string) {
    if (href === '/admin') {
        return url === href;
    }

    return url === href || url.startsWith(`${href}/`);
}

function workspaceFor(url: string): { title: string; href: string } | null {
    if (
        url.startsWith('/admin/website') ||
        url.startsWith('/admin/pages') ||
        url.startsWith('/admin/blocks')
    ) {
        return { title: 'Pages', href: '/admin/pages' };
    }

    if (
        url.startsWith('/admin/company') ||
        url.startsWith('/admin/team') ||
        url.startsWith('/admin/careers') ||
        url.startsWith('/admin/users')
    ) {
        return { title: 'Company', href: '/admin/company' };
    }

    if (
        url.startsWith('/admin/content') ||
        url.startsWith('/admin/blog') ||
        url.startsWith('/admin/resources') ||
        url.startsWith('/admin/faqs') ||
        url.startsWith('/admin/testimonials') ||
        url.startsWith('/admin/reusable-content')
    ) {
        return { title: 'Content Library', href: '/admin/content' };
    }

    if (url.startsWith('/admin/settings')) {
        return { title: 'Settings', href: '/admin/settings' };
    }

    if (url.startsWith('/admin/estimator') || url.startsWith('/admin/rag')) {
        return { title: 'Experimental', href: '/admin/estimator' };
    }

    if (
        url.startsWith('/admin/customers') ||
        url.startsWith('/admin/inquiries') ||
        url.startsWith('/admin/orders')
    ) {
        return { title: 'Customers', href: '/admin/customers' };
    }

    return null;
}

export default function AdminWorkspaceLayout({
    title,
    description,
    children,
    headerAction,
}: AdminWorkspaceLayoutProps) {
    const { url, props } = usePage();
    const sidebarOpen = props.sidebarOpen;
    const { adminPermissions, canAdmin } = props.auth;
    // AdminWorkspaceLayout isn't a persistent Inertia layout — it's a plain
    // wrapper each page mounts fresh — so this state alone can't survive a
    // navigation. Backed by sessionStorage so a group a user opened stays
    // open (and other open groups aren't collapsed) after clicking through
    // to one of its sub-pages.
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
    const [menusHydrated, setMenusHydrated] = useState(false);
    const [creatingPage, setCreatingPage] = useState(false);

    function createPage(href: string) {
        if (creatingPage) return;
        setCreatingPage(true);
        router.post(href, {}, { onFinish: () => setCreatingPage(false) });
    }

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem(OPEN_MENUS_STORAGE_KEY);
            if (stored) {
                setOpenMenus(JSON.parse(stored) as Record<string, boolean>);
            }
        } catch {
            // Best-effort — a private window or invalid storage shouldn't break the sidebar.
        } finally {
            setMenusHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!menusHydrated) return;

        try {
            sessionStorage.setItem(
                OPEN_MENUS_STORAGE_KEY,
                JSON.stringify(openMenus),
            );
        } catch {
            // Best-effort — a private window or full storage shouldn't break the sidebar.
        }
    }, [menusHydrated, openMenus]);

    const companyItems = [
        {
            title: 'Team Members',
            href: '/admin/company/members',
            visible:
                adminPermissions.team?.view ||
                adminPermissions.careers?.view ||
                canAdmin,
        },
        {
            title: 'Settings',
            href: '/admin/company',
            visible: adminPermissions.settings?.view,
        },
    ].filter((item) => item.visible);
    const contentItems = [
        {
            title: 'Articles',
            href: '/admin/blog',
            visible: adminPermissions.blog?.view,
        },
        {
            title: 'Resources',
            href: '/admin/resources/brochures',
            visible: adminPermissions.resources?.view,
        },
        {
            title: 'FAQs',
            href: '/admin/faqs',
            visible: adminPermissions.resources?.view,
        },
        {
            title: 'Testimonials',
            href: '/admin/testimonials',
            visible: adminPermissions.testimonials?.view,
        },
        {
            title: 'Media Library',
            href: '/admin/media-library',
            visible: adminPermissions.media?.view,
        },
    ].filter((item) => item.visible);
    const currentPath = url.split('?')[0];
    const childItemsByTitle: Record<string, SidebarChildItem[]> = {
        Company: companyItems,
        'Content Library': contentItems,
        Customers: [
            ...(adminPermissions.inquiries?.view || canAdmin
                ? [{ title: 'Inquiries', href: '/admin/inquiries' }]
                : []),
            ...(adminPermissions.orders?.view || canAdmin
                ? [{ title: 'Purchases', href: '/admin/orders' }]
                : []),
        ],
        Experimental: [
            ...(adminPermissions.estimator?.view || canAdmin
                ? [{ title: 'Estimator', href: '/admin/estimator' }]
                : []),
            ...(adminPermissions.estimator?.view || canAdmin
                ? [{ title: 'RAG System', href: '/admin/rag' }]
                : []),
        ],
    };

    const visibleGroups = navigationGroups
        .map((group) =>
            group.filter((item) => {
                if (item.href === '/admin/company' && canAdmin) {
                    return true;
                }

                if (item.rootOnly) {
                    return canAdmin;
                }

                if (item.anySection) {
                    return item.anySection.some(
                        (section) => adminPermissions[section]?.view,
                    );
                }

                return !item.section || adminPermissions[item.section]?.view;
            }),
        )
        .filter((group) => group.length > 0);

    const workspace = workspaceFor(url);
    const breadcrumbs: BreadcrumbItem[] =
        workspace && workspace.title !== title
            ? [
                  { title: workspace.title, href: workspace.href },
                  { title, href: url },
              ]
            : [{ title, href: url }];

    return (
        <>
            <Head title={title}>
                {description && (
                    <meta
                        head-key="description"
                        name="description"
                        content={description}
                    />
                )}
            </Head>
            <SidebarProvider
                defaultOpen={sidebarOpen}
                className="bg-muted/40 min-h-svh"
            >
                <Sidebar collapsible="offcanvas" variant="sidebar">
                    {/* Plain, non-functional input — no search wiring behind it. */}
                    <SidebarHeader className="h-16 justify-center">
                        <Input placeholder="Search" className="h-8" />
                    </SidebarHeader>

                    <SidebarContent>
                        <SidebarGroup className="px-2 py-1">
                            {visibleGroups.map((group, index) => (
                                <SidebarMenu
                                    key={group[0].title}
                                    className={
                                        index < visibleGroups.length - 1
                                            ? 'mb-4 gap-0.5'
                                            : 'gap-0.5'
                                    }
                                >
                                    {group.map((item) => {
                                        const href =
                                            typeof item.href === 'string'
                                                ? item.href
                                                : item.href.url;
                                        const childItems =
                                            childItemsByTitle[item.title];
                                        const isExpandable =
                                            Boolean(childItems);
                                        const isActive = isExpandable
                                            ? childItems.some((child) =>
                                                  isActiveRoute(
                                                      currentPath,
                                                      child.href,
                                                  ),
                                              )
                                            : isActiveRoute(url, href);

                                        if (isExpandable) {
                                            const menuOpen =
                                                openMenus[item.title] ??
                                                isActive;

                                            return (
                                                <Collapsible
                                                    key={item.title}
                                                    asChild
                                                    open={menuOpen}
                                                    onOpenChange={(open) =>
                                                        setOpenMenus(
                                                            (current) => ({
                                                                ...current,
                                                                [item.title]:
                                                                    open,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    <SidebarMenuItem className="group/collapsible">
                                                        <CollapsibleTrigger
                                                            asChild
                                                        >
                                                            <SidebarMenuButton
                                                                type="button"
                                                                isActive={
                                                                    isActive
                                                                }
                                                                tooltip={
                                                                    item.title
                                                                }
                                                            >
                                                                {item.icon && (
                                                                    <item.icon className="size-4" />
                                                                )}
                                                                <span>
                                                                    {item.title}
                                                                </span>
                                                                <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                                            </SidebarMenuButton>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent
                                                            asChild
                                                        >
                                                            <SidebarMenuSub className="gap-0.5">
                                                                {childItems.map(
                                                                    (child) => {
                                                                        if (
                                                                            child.action
                                                                        ) {
                                                                            return (
                                                                                <SidebarMenuSubItem
                                                                                    key={
                                                                                        child.title
                                                                                    }
                                                                                >
                                                                                    <SidebarMenuSubButton
                                                                                        asChild
                                                                                    >
                                                                                        <button
                                                                                            type="button"
                                                                                            className="w-full text-left"
                                                                                            disabled={
                                                                                                creatingPage
                                                                                            }
                                                                                            onClick={() =>
                                                                                                createPage(
                                                                                                    child.href,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <span>
                                                                                                {creatingPage
                                                                                                    ? 'Creating…'
                                                                                                    : child.title}
                                                                                            </span>
                                                                                        </button>
                                                                                    </SidebarMenuSubButton>
                                                                                </SidebarMenuSubItem>
                                                                            );
                                                                        }

                                                                        const childActive =
                                                                            child.href ===
                                                                            '/admin/company'
                                                                                ? currentPath ===
                                                                                  child.href
                                                                                : currentPath ===
                                                                                      child.href ||
                                                                                  currentPath.startsWith(
                                                                                      `${child.href}/`,
                                                                                  );

                                                                        return (
                                                                            <SidebarMenuSubItem
                                                                                key={
                                                                                    child.title
                                                                                }
                                                                            >
                                                                                <SidebarMenuSubButton
                                                                                    asChild
                                                                                    isActive={
                                                                                        childActive
                                                                                    }
                                                                                >
                                                                                    <Link
                                                                                        href={
                                                                                            child.href
                                                                                        }
                                                                                        prefetch
                                                                                        aria-current={
                                                                                            childActive
                                                                                                ? 'page'
                                                                                                : undefined
                                                                                        }
                                                                                    >
                                                                                        <span>
                                                                                            {
                                                                                                child.title
                                                                                            }
                                                                                        </span>
                                                                                    </Link>
                                                                                </SidebarMenuSubButton>
                                                                            </SidebarMenuSubItem>
                                                                        );
                                                                    },
                                                                )}
                                                            </SidebarMenuSub>
                                                        </CollapsibleContent>
                                                    </SidebarMenuItem>
                                                </Collapsible>
                                            );
                                        }

                                        return (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isActive}
                                                    tooltip={item.title}
                                                >
                                                    <Link
                                                        href={item.href}
                                                        prefetch
                                                        aria-current={
                                                            isActive
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                    >
                                                        {item.icon && (
                                                            <item.icon className="size-4" />
                                                        )}
                                                        <span>
                                                            {item.title}
                                                        </span>
                                                        {item.badge && (
                                                            <Badge
                                                                variant="outline"
                                                                className="ml-auto"
                                                            >
                                                                {item.badge}
                                                            </Badge>
                                                        )}
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            ))}
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter>
                        <SidebarMenu className="gap-0.5">
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActiveRoute(
                                        currentPath,
                                        '/settings',
                                    )}
                                    tooltip="Account settings"
                                >
                                    <Link href="/settings/profile?context=admin">
                                        <UserCog className="size-4" />
                                        <span>Account Settings</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                        <WorkspaceNavUser />
                    </SidebarFooter>
                </Sidebar>

                <SidebarInset className="bg-background min-h-svh overflow-hidden">
                    <header className="flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6">
                        <SidebarTrigger className="-ml-2 size-8" />
                        <div
                            className="bg-border h-4 w-px"
                            aria-hidden="true"
                        />
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                        <div className="ml-auto flex items-center gap-2">
                            {headerAction}
                        </div>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4 sm:px-6 sm:pt-1 sm:pb-6 lg:pt-1 lg:pb-8">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
            <FeedbackFab />
        </>
    );
}
