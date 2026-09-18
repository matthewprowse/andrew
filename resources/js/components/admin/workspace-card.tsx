import { Link } from '@inertiajs/react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export type WorkspaceCardItem = {
    label: string;
    description: string;
    href: string;
    icon: LucideIcon;
};

/**
 * Card-grid link tile, shared across the Overview dashboard and the
 * Website / Content Library workspace hubs (see
 * docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 2, NAV-01/NAV-02) so the three
 * pages stay visually consistent without duplicating the markup.
 */
export function WorkspaceCard({ item }: { item: WorkspaceCardItem }) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            prefetch
            className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
            <Card
                size="sm"
                className="group-hover:bg-muted/60 h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-sm"
            >
                <CardHeader className="gap-3">
                    <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                        <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle>{item.label}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="text-foreground mt-auto flex items-center gap-1 text-sm font-medium">
                    Open workspace
                    <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                    />
                </CardContent>
            </Card>
        </Link>
    );
}
