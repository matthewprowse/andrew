import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';

interface EstimatorLayoutProps {
    title: string;
    children?: ReactNode;
    /**
     * Size the content pane to the viewport instead of to its content. For the estimator grids,
     * which scroll inside their own pane rather than scrolling the page: without this the height
     * chain is indefinite, so the pane has nothing to fill and has to guess at a height.
     */
    fill?: boolean;
    /** Forwarded to AdminWorkspaceLayout's header slot — see its own doc comment. */
    headerAction?: ReactNode;
}

const navItems = [
    { label: 'Home', href: '/admin/estimator/overview' },
    { label: 'Services', href: '/admin/estimator/services-pricing' },
    { label: 'Destination Costs', href: '/admin/estimator/destination-costs' },
    {
        label: 'Intra-Location Costs',
        href: '/admin/estimator/intra-location-costs',
    },
    {
        label: 'City Service Rates',
        href: '/admin/estimator/city-service-rates',
    },
    { label: 'Cities', href: '/admin/estimator/cities' },
    { label: 'Catalogue Control', href: '/admin/estimator/catalogue-control' },
];

export default function EstimatorLayout({
    title,
    children,
    fill = false,
    headerAction,
}: EstimatorLayoutProps) {
    const { url } = usePage();

    return (
        <AdminWorkspaceLayout title={title} headerAction={headerAction}>
            <div className={fill ? 'flex min-h-0 flex-1 gap-6' : 'flex gap-6'}>
                <aside className="sticky top-0 w-48 shrink-0 self-start">
                    <nav className="flex flex-col">
                        {navItems.map((item) => (
                            <Button
                                key={item.href}
                                asChild
                                variant={
                                    url === item.href ? 'secondary' : 'ghost'
                                }
                                aria-current={
                                    url === item.href ? 'page' : undefined
                                }
                                className="justify-start font-normal"
                            >
                                <Link href={item.href}>{item.label}</Link>
                            </Button>
                        ))}
                    </nav>
                </aside>
                <div
                    className={
                        fill
                            ? 'flex min-h-0 min-w-0 flex-1 flex-col gap-6'
                            : 'flex min-w-0 flex-1 flex-col gap-6'
                    }
                >
                    {children}
                </div>
            </div>
        </AdminWorkspaceLayout>
    );
}
