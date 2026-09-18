import { usePage } from '@inertiajs/react';
import {
    Facebook,
    Instagram,
    Linkedin,
    Mail,
    Twitter,
    Youtube,
    Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PublicSettings } from '@/types/site-settings';
export function SocialLinks() {
    const { publicSettings } = usePage<{ publicSettings: PublicSettings }>()
        .props;
    const icons: Record<string, typeof Mail> = {
        facebook: Facebook,
        instagram: Instagram,
        linkedin: Linkedin,
        email: Mail,
        x: Twitter,
        twitter: Twitter,
        youtube: Youtube,
    };
    return (
        <>
            {publicSettings.socialLinks.map((s) => {
                const Icon = icons[s.platform.toLowerCase()] ?? LinkIcon;
                return (
                    <Button key={s.id} asChild variant="outline">
                        <a href={s.url}>
                            <Icon aria-hidden="true" />
                            {s.platform}
                        </a>
                    </Button>
                );
            })}
        </>
    );
}
