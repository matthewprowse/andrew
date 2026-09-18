import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { SettingsEditor } from '@/features/admin/settings/settings-editor';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import type { Settings } from '@/types/site-settings';

const tabs = [
    ['menu', 'Menu'],
    ['social-links', 'Social Links'],
];

export default function SettingsIndex({
    section,
    settings,
}: {
    section: string;
    settings: Settings;
}) {
    return (
        <AdminWorkspaceLayout
            title={tabs.find((t) => t[0] === section)?.[1] ?? 'Settings'}
        >
            <div className="flex flex-col gap-6 md:flex-row">
                <nav className="flex shrink-0 flex-wrap md:w-48 md:flex-col">
                    {tabs.map(([key, label]) => (
                        <Button
                            asChild
                            variant={key === section ? 'secondary' : 'ghost'}
                            className="justify-start font-normal"
                            key={key}
                        >
                            <Link href={`/admin/settings/${key}`}>{label}</Link>
                        </Button>
                    ))}
                    <Button
                        asChild
                        variant="ghost"
                        className="justify-start font-normal"
                    >
                        <Link href="/admin/users">Permissions</Link>
                    </Button>
                </nav>
                <div className="min-w-0 flex-1">
                    <SettingsEditor
                        key={section}
                        section={section}
                        settings={settings}
                    />
                </div>
            </div>
        </AdminWorkspaceLayout>
    );
}
