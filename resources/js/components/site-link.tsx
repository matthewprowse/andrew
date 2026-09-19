import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

type SiteLinkProps = {
    href: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    target?: string;
    rel?: string;
};

/**
 * Keeps same-site marketing navigation inside Inertia so a page change does
 * not repaint the unthemed document shell. External and protocol links keep
 * ordinary browser behaviour.
 */
export function SiteLink({ href, ...props }: SiteLinkProps) {
    const isInternal = href.startsWith('/') && !href.startsWith('//');

    return isInternal ? (
        <Link href={href} {...props} />
    ) : (
        <a href={href} {...props} />
    );
}
