import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { NavUser } from '@/components/nav-user';
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
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

interface AdminLayoutProps {
    title: string;
    children?: ReactNode;
    /**
     * Page-specific control rendered where /admin/test's header shows its
     * "Search" button — e.g. a "New Service" button on the services page.
     * Omit for pages with no primary create action.
     */
    headerAction?: ReactNode;
}

type AdminNavItem = NavItem & { section?: string };

// Sidebar sections mirror the icon-free, unlabeled grouping approved on
// /admin/test. Do not add icons back onto these items. `section` keys match
// config('admin.sections') — items without one (Home) are always visible to
// anyone with any admin access; the rest are filtered by the viewer's actual
// role permissions, so a role only ever sees what it can reach.
// The Company nav item merges Team, Careers, and the primary ("site")
// Settings tab into one page (see AdminCompanyController) — it has no
// single `section`, since a viewer needs to see it if they can view any
// of those three; that's handled as a special case in visibleSections
// below rather than by extending `section` to accept an array for one item.
const navigationSections: AdminNavItem[][] = [
    [
        { title: 'Pages', href: '/admin/pages', section: 'pages' },
        { title: 'Services', href: '/admin/services', section: 'services' },
        { title: 'Company', href: '/admin/company' },
        {
            title: 'Testimonials',
            href: '/admin/testimonials',
            section: 'testimonials',
        },
        { title: 'Insights', href: '/admin/blog', section: 'blog' },
        {
            title: 'Locations',
            href: '/admin/locations',
            section: 'locations',
        },
    ],
    [
        {
            title: 'Inquiries',
            href: '/admin/inquiries',
            section: 'inquiries',
        },
        {
            title: 'Analytics',
            href: '/admin/analytics',
            section: 'analytics',
        },
        {
            title: 'Media Library',
            href: '/admin/media-library',
            section: 'media',
        },
    ],
    [
        {
            title: 'Resources',
            href: '/admin/resources/brochures',
            section: 'resources',
        },
        {
            title: 'Estimator',
            href: '/admin/estimator',
            section: 'estimator',
        },
    ],
    [{ title: 'Settings', href: '/admin/settings', section: 'settings' }],
];

function isActiveRoute(url: string, href: string) {
    if (href === '/admin') {
        return url === href;
    }

    return url === href || url.startsWith(`${href}/`);
}

export default function AdminLayout({
    title,
    children,
    headerAction,
}: AdminLayoutProps) {
    const { url, props } = usePage();
    const sidebarOpen = props.sidebarOpen;
    const { adminPermissions, canAdmin } = props.auth;
    const companyVisible = Boolean(
        adminPermissions.team?.view ||
        adminPermissions.careers?.view ||
        adminPermissions.settings?.view,
    );
    const visibleSections = navigationSections
        .map((section) =>
            section.filter((item) => {
                if (item.href === '/admin/company') return companyVisible;

                return !item.section || adminPermissions[item.section]?.view;
            }),
        )
        .filter((section) => section.length > 0);

    return (
        <>
            <Head title={title} />
            <SidebarProvider
                defaultOpen={sidebarOpen}
                className="bg-muted/40 min-h-svh"
            >
                <Sidebar collapsible="offcanvas" variant="sidebar">
                    <SidebarHeader className="h-16 justify-center">
                        <label
                            className="sr-only"
                            htmlFor="admin-sidebar-search"
                        >
                            Search
                        </label>
                        <Input
                            id="admin-sidebar-search"
                            placeholder="Search"
                            className="bg-background h-8 shadow-none"
                        />
                    </SidebarHeader>

                    <SidebarContent>
                        <SidebarGroup className="px-2 py-1">
                            {visibleSections.map((section, index) => (
                                <SidebarMenu
                                    key={section[0].title}
                                    className={
                                        index < visibleSections.length - 1
                                            ? 'mb-4 gap-0.5'
                                            : 'gap-0.5'
                                    }
                                >
                                    {section.map((item) => {
                                        const href =
                                            typeof item.href === 'string'
                                                ? item.href
                                                : item.href.url;
                                        const isActive = isActiveRoute(
                                            url,
                                            href,
                                        );

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
                                                        <span>
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                    {canAdmin &&
                                        section.some(
                                            (item) =>
                                                item.section === 'settings',
                                        ) && (
                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isActiveRoute(
                                                        url,
                                                        '/admin/users',
                                                    )}
                                                    tooltip="Permissions"
                                                >
                                                    <Link
                                                        href="/admin/users"
                                                        prefetch
                                                    >
                                                        <span>Permissions</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )}
                                </SidebarMenu>
                            ))}
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    tooltip="View website"
                                >
                                    <Link href="/">
                                        <span>View Website</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                        <NavUser settingsHref="/settings/profile?context=admin" />
                    </SidebarFooter>
                </Sidebar>

                <SidebarInset className="bg-background min-h-svh overflow-hidden">
                    <header className="flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6">
                        <SidebarTrigger className="-ml-2 size-8" />
                        <div
                            className="bg-border h-4 w-px"
                            aria-hidden="true"
                        />
                        <p className="truncate text-sm font-medium">{title}</p>
                        <div className="ml-auto flex items-center gap-2">
                            <Input
                                placeholder="Search"
                                className="h-8 w-56"
                                aria-label="Search preview"
                            />
                            {headerAction}
                        </div>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4 sm:px-6 sm:pt-1 sm:pb-6 lg:pt-1 lg:pb-8">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
