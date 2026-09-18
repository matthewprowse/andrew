import { Head } from '@inertiajs/react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

interface WelcomeProps {
    title: string;
}

export default function Welcome({ title }: WelcomeProps) {
    return (
        <>
            <Head title={title} />
            <SiteHeader />
            <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <p className="text-sm">{title}</p>
            </main>
            <SiteFooter />
        </>
    );
}
