import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';

const copy: Record<number, { title: string; description: string }> = {
    404: {
        title: 'Page not found',
        description:
            "The page you're looking for doesn't exist, or may have moved.",
    },
    403: {
        title: 'Access denied',
        description: "You don't have permission to view this page.",
    },
    500: {
        title: 'Something went wrong',
        description:
            'An unexpected error occurred on our end. Please try again shortly.',
    },
    503: {
        title: 'Down for maintenance',
        description: "We're making some improvements. Please check back soon.",
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const { title, description } = copy[status] ?? copy[500];

    return (
        <>
            <Head title={title} />
            <SiteHeader />
            <main>
                <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-24 text-center md:px-8 md:py-32">
                    <p className="text-muted-foreground text-sm">
                        Error {status}
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                        {title}
                    </h1>
                    <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
                        {description}
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Button asChild className="min-h-11 px-5">
                            <Link href="/">
                                Back to home <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-11 px-5"
                        >
                            <Link href="/contact">Contact us</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </>
    );
}
