import { usePage } from '@inertiajs/react';
import { SocialLinks } from '@/components/social-links';
import type { PublicSettings } from '@/types/site-settings';

export function SiteFooter() {
    const { publicSettings } = usePage<{ publicSettings: PublicSettings }>()
        .props;
    const site = publicSettings.site;

    return (
        <footer className="border-t">
            <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">
                {site.footerText && (
                    <p className="text-muted-foreground mb-6 text-center text-sm whitespace-pre-line">
                        {site.footerText}
                    </p>
                )}
                <nav
                    aria-label="Footer"
                    className="flex flex-wrap justify-center gap-x-6 gap-y-4 text-sm"
                >
                    {publicSettings.menu
                        .filter((m) => m.section === 'footer')
                        .map((m) => (
                            <div key={m.id}>
                                <a
                                    href={m.link}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {m.label}
                                </a>
                                {m.children.length > 0 && (
                                    <ul className="mt-3 space-y-2">
                                        {m.children.map((c) => (
                                            <li key={c.id}>
                                                <a
                                                    href={c.link}
                                                    className="text-muted-foreground hover:text-foreground"
                                                >
                                                    {c.label}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                </nav>
                {publicSettings.socialLinks.length > 0 && (
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        <SocialLinks />
                    </div>
                )}
                {site.copyrightLine && (
                    <p className="text-muted-foreground mt-6 text-center text-sm">
                        {site.copyrightLine}
                    </p>
                )}
            </div>
        </footer>
    );
}
