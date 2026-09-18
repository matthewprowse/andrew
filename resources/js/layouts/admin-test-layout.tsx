import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AdminTestLayoutProps {
    title: string;
    children?: ReactNode;
}

const navigationSections = [
    [
        { label: 'Home' },
        { label: 'Pages' },
        { label: 'Services', active: true },
        { label: 'Team' },
        { label: 'Testimonials' },
        { label: 'Careers' },
        { label: 'Insights' },
        { label: 'Locations' },
    ],
    [{ label: 'Inquiries' }, { label: 'Media Library' }],
    [{ label: 'Resources' }, { label: 'Estimator' }],
    [{ label: 'Settings' }],
];

export default function AdminTestLayout({
    title,
    children,
}: AdminTestLayoutProps) {
    const { props } = usePage();

    return (
        <>
            <Head title={title} />
            <SidebarProvider
                defaultOpen={props.sidebarOpen}
                className="bg-muted/40 min-h-svh"
            >
                <Sidebar collapsible="offcanvas" variant="sidebar">
                    <SidebarHeader className="h-16 justify-center">
                        <label
                            className="sr-only"
                            htmlFor="test-sidebar-search"
                        >
                            Search
                        </label>
                        <Input
                            id="test-sidebar-search"
                            placeholder="Search"
                            className="bg-background h-8 shadow-none"
                        />
                    </SidebarHeader>

                    <SidebarContent>
                        <SidebarGroup className="px-2 py-1">
                            {navigationSections.map((section, index) => (
                                <SidebarMenu
                                    key={section[0].label}
                                    className={
                                        index < navigationSections.length - 1
                                            ? 'mb-4 gap-0.5'
                                            : 'gap-0.5'
                                    }
                                >
                                    {section.map((item) => (
                                        <SidebarMenuItem key={item.label}>
                                            <SidebarMenuButton
                                                type="button"
                                                isActive={item.active}
                                                tooltip={item.label}
                                                aria-current={
                                                    item.active
                                                        ? 'page'
                                                        : undefined
                                                }
                                            >
                                                <span>{item.label}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            ))}
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    type="button"
                                    tooltip="View Website"
                                >
                                    <span>View Website</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
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
                            <Button type="button" variant="secondary">
                                Search
                            </Button>
                        </div>
                    </header>
                    {children}
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
