import { Link } from '@inertiajs/react';
import { Menu, Palette, Settings2, Share2 } from 'lucide-react';
import { useRef } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from '@/components/ui/sidebar';
import {
    SettingsEditor,
    type SettingsEditorHandle,
} from '@/features/admin/settings/settings-editor';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';
import type { Settings } from '@/types/site-settings';

const settingsSections = [
    {
        key: 'site',
        label: 'Settings',
        href: '/admin/company',
        icon: Settings2,
    },
    { key: 'menu', label: 'Menu', href: '/admin/company/menu', icon: Menu },
    {
        key: 'appearance',
        label: 'Appearance',
        href: '/admin/company/appearance',
        icon: Palette,
    },
    {
        key: 'social-links',
        label: 'Social Links',
        href: '/admin/company/social-links',
        icon: Share2,
    },
];

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

export default function CompanyIndex({
    section,
    settings,
}: {
    section: string;
    settings: Settings;
}) {
    const currentSection =
        settingsSections.find((item) => item.key === section) ??
        settingsSections[0];
    const editorRef = useRef<SettingsEditorHandle>(null);
    const headerAction =
        currentSection.key === 'menu' ? (
            <Button
                variant="secondary"
                onClick={() => editorRef.current?.openCreate()}
            >
                New Menu Item
            </Button>
        ) : currentSection.key === 'social-links' ? (
            <Button
                variant="secondary"
                onClick={() => editorRef.current?.openCreate()}
            >
                New Social Link
            </Button>
        ) : undefined;

    return (
        <AdminWorkspaceLayout
            title={currentSection.label}
            headerAction={headerAction}
        >
            <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
                <SidebarProvider defaultOpen className="min-h-0 w-full">
                    <Sidebar
                        collapsible="none"
                        variant="sidebar"
                        className="sticky top-6 h-fit"
                    >
                        <SidebarContent>
                            <SidebarGroup className="p-0">
                                <SidebarMenu className="gap-0.5">
                                    {settingsSections.map((item) => (
                                        <SidebarMenuItem key={item.key}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={
                                                    item.key ===
                                                    currentSection.key
                                                }
                                            >
                                                <Link href={item.href}>
                                                    <item.icon className="size-4" />
                                                    <span>{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>
                </SidebarProvider>

                <div className="min-w-0">
                    <Heading
                        title={currentSection.label}
                        description={PAGE_DESCRIPTION}
                        variant="large"
                    />
                    <SettingsEditor
                        ref={editorRef}
                        key={currentSection.key}
                        section={currentSection.key}
                        settings={settings}
                    />
                </div>
            </div>
        </AdminWorkspaceLayout>
    );
}
