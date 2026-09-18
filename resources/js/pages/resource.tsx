import { Link, useForm, usePage } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { PageMeta } from '@/components/page-meta';
import { SiteCta } from '@/components/site-cta';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trackEvent } from '@/lib/analytics';
import type { ResourceItemRecord, ResourceLayout } from '@/types/resource';

const resourcePages: Record<string, { title: string; description: string }> = {
    resources: {
        title: 'Resources',
        description:
            'Explore publications, webinars, and practical material from our team.',
    },
    brochures: {
        title: 'Brochures',
        description:
            'Download our brochures for a detailed overview of our services.',
    },
    webinars: {
        title: 'Webinars',
        description: 'Watch recordings of our webinars and learning sessions.',
    },
    books: {
        title: 'Books',
        description: 'Browse books and guides recommended by our team.',
    },
};

export default function ResourcePage({
    slug,
    layout,
    items,
    categories,
}: {
    slug: string;
    layout?: ResourceLayout;
    items?: ResourceItemRecord[];
    categories?: { title: string; href: string; itemCount: number }[];
}) {
    const page = resourcePages[slug] ?? resourcePages.resources;
    const { canonicalUrl } = usePage<{ canonicalUrl: string }>().props;
    const origin = canonicalUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1');
    const breadcrumb = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
        {
            '@type': 'ListItem',
            position: 2,
            name: 'Resources',
            item: `${origin}/resources`,
        },
        ...(slug === 'resources'
            ? []
            : [
                  {
                      '@type': 'ListItem',
                      position: 3,
                      name: page.title,
                      item: canonicalUrl,
                  },
              ]),
    ];

    return (
        <>
            <PageMeta
                title={page.title}
                description={page.description}
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: breadcrumb,
                }}
            />
            <SiteHeader />
            <main>
                <section className="mx-auto w-full max-w-7xl px-6 py-16 text-center md:px-8 md:py-24">
                    <p className="text-muted-foreground text-sm">Resources</p>
                    <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                        {page.title}
                    </h1>
                    <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-lg leading-8">
                        {page.description}
                    </p>
                </section>
                <PrimarySection
                    slug={slug}
                    layout={layout}
                    items={items}
                    categories={categories}
                />
                <SiteCta />
            </main>
            <SiteFooter />
        </>
    );
}

function itemHref(item: ResourceItemRecord): string | undefined {
    return item.fileUrl || item.externalUrl || undefined;
}

type BuyerForm = {
    first_name: string;
    last_name: string;
    email: string;
    company: string;
    consent: boolean;
};

const emptyBuyer: BuyerForm = {
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    consent: false,
};

export function ResourceActionButton({
    item,
    category,
}: {
    item: ResourceItemRecord;
    category: string;
}) {
    if (item.accessType === 'paid') {
        return <PaidResourceButton item={item} category={category} />;
    }

    if (item.accessType === 'email') {
        return <RequestAccessButton item={item} category={category} />;
    }

    return <OpenResourceButton item={item} />;
}

function RequestAccessButton({
    item,
    category,
}: {
    item: ResourceItemRecord;
    category: string;
}) {
    const [open, setOpen] = useState(false);
    const form = useForm<BuyerForm>(emptyBuyer);

    return (
        <>
            <Button
                type="button"
                variant="secondary"
                className="w-fit"
                onClick={() => setOpen(true)}
            >
                {item.actionLabel || 'Request access'}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Get {item.title}</DialogTitle>
                    </DialogHeader>
                    <BuyerDetailsForm
                        form={form}
                        idPrefix={`request-${item.id}`}
                        intro="Enter Your Details And We'll Email You A Link To Access This Resource."
                        submitLabel="Email Me The Link"
                        processingLabel="Sending…"
                        onSubmit={() =>
                            form.post(
                                `/resources/${category}/${item.id}/request-access`,
                                {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        setOpen(false);
                                        form.reset();
                                    },
                                },
                            )
                        }
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

function PaidResourceButton({
    item,
    category,
}: {
    item: ResourceItemRecord;
    category: string;
}) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'buy' | 'resend'>('buy');
    const buyForm = useForm<BuyerForm>(emptyBuyer);
    const resendForm = useForm({ email: '' });
    const label = `${item.actionLabel || 'Buy'} · ${item.formattedPrice}`;

    if (!item.purchasable) {
        return (
            <Button
                type="button"
                variant="secondary"
                className="w-fit"
                disabled
            >
                Available soon · {item.formattedPrice}
            </Button>
        );
    }

    return (
        <>
            <Button
                type="button"
                variant="secondary"
                className="w-fit"
                onClick={() => {
                    setView('buy');
                    setOpen(true);
                }}
            >
                {label}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {view === 'buy'
                                ? `Buy ${item.title}`
                                : 'Get A New Access Link'}
                        </DialogTitle>
                    </DialogHeader>
                    {view === 'buy' ? (
                        <>
                            <BuyerDetailsForm
                                form={buyForm}
                                idPrefix={`buy-${item.id}`}
                                intro={`${item.formattedPrice}, Paid Once. After Payment We'll Email You An Access Link, And You Can Request A New One At Any Time.`}
                                submitLabel="Continue To Payment"
                                processingLabel="Opening Checkout…"
                                onSubmit={() =>
                                    buyForm.post(
                                        `/resources/${category}/${item.id}/purchase`,
                                        {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setOpen(false);
                                                buyForm.reset();
                                            },
                                        },
                                    )
                                }
                            />
                            <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground w-fit text-sm underline underline-offset-4"
                                onClick={() => setView('resend')}
                            >
                                Already Bought It? Email Me A New Link
                            </button>
                        </>
                    ) : (
                        <form
                            className="grid gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                resendForm.post(
                                    `/resources/${category}/${item.id}/resend-access`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            setOpen(false);
                                            resendForm.reset();
                                        },
                                    },
                                );
                            }}
                        >
                            <p className="text-muted-foreground text-sm">
                                Enter The Email Address You Used When You Bought
                                This Resource.
                            </p>
                            <div className="grid gap-2">
                                <Label htmlFor={`resend-email-${item.id}`}>
                                    Email
                                </Label>
                                <Input
                                    id={`resend-email-${item.id}`}
                                    type="email"
                                    value={resendForm.data.email}
                                    onChange={(event) =>
                                        resendForm.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                {resendForm.errors.email && (
                                    <p className="text-destructive text-sm">
                                        {resendForm.errors.email}
                                    </p>
                                )}
                            </div>
                            <DialogFooter className="items-center justify-between border-t-0 bg-transparent p-0 sm:justify-between">
                                <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
                                    onClick={() => setView('buy')}
                                >
                                    Back
                                </button>
                                <Button
                                    type="submit"
                                    disabled={resendForm.processing}
                                >
                                    {resendForm.processing
                                        ? 'Sending…'
                                        : 'Send Link'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function BuyerDetailsForm({
    form,
    idPrefix,
    intro,
    submitLabel,
    processingLabel,
    onSubmit,
}: {
    form: InertiaFormProps<BuyerForm>;
    idPrefix: string;
    intro: string;
    submitLabel: string;
    processingLabel: string;
    onSubmit: () => void;
}) {
    const textFields = [
        { key: 'first_name', label: 'First name', required: true },
        { key: 'last_name', label: 'Last name', required: true },
    ] as const;

    return (
        <form
            className="grid gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            <p className="text-muted-foreground text-sm">{intro}</p>
            <div className="grid gap-4 sm:grid-cols-2">
                {textFields.map((field) => (
                    <div key={field.key} className="grid gap-2">
                        <Label htmlFor={`${idPrefix}-${field.key}`}>
                            {field.label}
                        </Label>
                        <Input
                            id={`${idPrefix}-${field.key}`}
                            value={form.data[field.key]}
                            onChange={(event) =>
                                form.setData(field.key, event.target.value)
                            }
                            required={field.required}
                        />
                    </div>
                ))}
            </div>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-email`}>Email</Label>
                <Input
                    id={`${idPrefix}-email`}
                    type="email"
                    value={form.data.email}
                    onChange={(event) =>
                        form.setData('email', event.target.value)
                    }
                    required
                />
                {form.errors.email && (
                    <p className="text-destructive text-sm">
                        {form.errors.email}
                    </p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-company`}>
                    Company (optional)
                </Label>
                <Input
                    id={`${idPrefix}-company`}
                    value={form.data.company}
                    onChange={(event) =>
                        form.setData('company', event.target.value)
                    }
                />
            </div>
            <label className="flex items-start gap-2 text-sm">
                <Checkbox
                    checked={form.data.consent}
                    onCheckedChange={(checked) =>
                        form.setData('consent', checked === true)
                    }
                    required
                />
                <span className="text-muted-foreground">
                    I agree to be contacted about this resource.
                </span>
            </label>
            <DialogFooter className="border-t-0 bg-transparent p-0">
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? processingLabel : submitLabel}
                </Button>
            </DialogFooter>
        </form>
    );
}

function OpenResourceButton({ item }: { item: ResourceItemRecord }) {
    const href = itemHref(item);
    if (!href) return null;

    return (
        <Button asChild variant="secondary" className="w-fit">
            <a
                href={href}
                download={item.fileUrl ? item.fileName || true : undefined}
                target={
                    item.externalUrl && !item.fileUrl ? '_blank' : undefined
                }
                rel={
                    item.externalUrl && !item.fileUrl ? 'noreferrer' : undefined
                }
                onClick={() =>
                    trackEvent('resource_download', {
                        label: item.title,
                        resourceItemId: Number(item.id),
                    })
                }
            >
                {item.actionLabel || 'Learn more'}
            </a>
        </Button>
    );
}

function PrimarySection({
    slug,
    layout,
    items,
    categories = [],
}: {
    slug: string;
    layout?: ResourceLayout;
    items?: ResourceItemRecord[];
    categories?: { title: string; href: string; itemCount: number }[];
}) {
    if (slug === 'resources') {
        return (
            <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                <div className="grid border-t md:grid-cols-2">
                    {categories.map((collection) => (
                        <Link
                            key={collection.href}
                            href={collection.href}
                            className="group border-b p-6 md:p-8 first:md:border-r odd:md:border-r"
                        >
                            <h2 className="text-xl font-medium">
                                {collection.title}
                            </h2>
                            <p className="text-muted-foreground mt-2 max-w-sm leading-7">
                                {collection.itemCount === 1
                                    ? '1 published resource'
                                    : `${collection.itemCount} published resources`}
                            </p>
                            <span className="mt-6 inline-flex items-center gap-2 text-sm">
                                Explore{' '}
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        );
    }

    if (!items || items.length === 0) {
        return (
            <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                <p className="text-muted-foreground border-t pt-8">
                    New material for this section is on the way.
                </p>
            </section>
        );
    }

    if (layout === 'cards') {
        return (
            <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                <div className="flex flex-wrap justify-center gap-4">
                    {items.map((item) => (
                        <Card
                            key={item.id}
                            className="w-full gap-4 md:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.667rem)]"
                        >
                            {item.imageUrl ? (
                                <img
                                    src={item.imageUrl}
                                    alt={item.imageAlt}
                                    loading="lazy"
                                    className="mx-4 aspect-[4/3] rounded-lg object-cover"
                                />
                            ) : (
                                <div
                                    aria-hidden="true"
                                    className="bg-muted mx-4 aspect-[4/3] rounded-lg"
                                />
                            )}
                            <CardContent className="grid gap-4">
                                <div className="grid gap-1.5">
                                    <CardTitle className="text-lg font-medium">
                                        {item.title}
                                    </CardTitle>
                                    <p className="text-muted-foreground text-sm leading-6">
                                        {item.description}
                                    </p>
                                </div>
                                <ResourceActionButton
                                    item={item}
                                    category={slug}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
            <div className="border-t">
                {items.map((item) => (
                    <article
                        key={item.id}
                        className="grid gap-5 border-b py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:py-8"
                    >
                        <div>
                            <h3 className="text-lg font-medium">
                                {item.title}
                            </h3>
                            <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
                                {item.description}
                            </p>
                        </div>
                        <ResourceActionButton item={item} category={slug} />
                    </article>
                ))}
            </div>
        </section>
    );
}
