import { SocialLinks } from '@/components/social-links';
import { Form } from '@inertiajs/react';
import { Mail, MapPin, Phone } from 'lucide-react';
import InputError from '@/components/input-error';
import { PageMeta } from '@/components/page-meta';
import { PreviewBanner } from '@/components/preview-banner';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import contact from '@/routes/contact';
import type { PageContent } from '@/types/page-content';

type Office = {
    id: string;
    officeName: string;
    address: string;
    phone: string;
    email: string;
};

export default function Contact({
    content,
    defaultSubject = '',
    offices,
    preview = false,
}: {
    content: PageContent;
    defaultSubject?: string;
    offices: Office[];
    /** PUB-01: true only when rendered via the authenticated draft preview. */
    preview?: boolean;
}) {
    return (
        <>
            <PageMeta
                title={content.metaTitle || 'Contact Us'}
                description={
                    content.metaDescription ||
                    content.heroSubheading ||
                    "Get in touch with Relocation Africa's team."
                }
                image={content.ogImageUrl}
                noindex={preview}
            />
            {preview && <PreviewBanner />}
            <SiteHeader />
            <main>
                <section className="mx-auto w-full max-w-7xl px-6 py-16 text-center md:px-8 md:py-24">
                    <p className="text-muted-foreground text-sm">Contact Us</p>
                    <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                        {content.heroHeading || 'Contact Us'}
                    </h1>
                    <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-lg leading-8">
                        {content.heroSubheading ||
                            "Get in touch with our team — we're here to help with your relocation."}
                    </p>
                </section>

                <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                    <div className="mx-auto w-full max-w-3xl">
                        <Form
                            {...contact.store.form()}
                            resetOnSuccess
                            disableWhileProcessing
                            className="grid min-w-0 gap-5 sm:grid-cols-2"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid min-w-0 gap-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            required
                                            autoComplete="name"
                                            name="name"
                                            aria-invalid={!!errors.name}
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid min-w-0 gap-2">
                                        <Label htmlFor="email">
                                            Email Address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            name="email"
                                            aria-invalid={!!errors.email}
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label htmlFor="subject">Subject</Label>
                                        <Input
                                            id="subject"
                                            type="text"
                                            required
                                            name="subject"
                                            defaultValue={defaultSubject}
                                            key={defaultSubject}
                                            aria-invalid={!!errors.subject}
                                        />
                                        <InputError message={errors.subject} />
                                    </div>

                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label htmlFor="message">Message</Label>
                                        <Textarea
                                            id="message"
                                            required
                                            name="message"
                                            aria-invalid={!!errors.message}
                                        />
                                        <InputError message={errors.message} />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-fit sm:col-span-2"
                                    >
                                        {processing && <Spinner />}
                                        Send Message
                                    </Button>
                                </>
                            )}
                        </Form>
                    </div>

                    <section
                        aria-label="Office and social links"
                        className="mx-auto mt-16 w-full max-w-3xl"
                    >
                        <Card>
                            <CardContent className="grid gap-8 sm:grid-cols-2">
                                <div className="grid gap-6">
                                    {offices.map((office) => (
                                        <div
                                            key={office.id}
                                            className="grid gap-3"
                                        >
                                            <h2 className="text-sm font-medium">
                                                {office.officeName}
                                            </h2>
                                            <address className="text-muted-foreground flex items-start gap-3 text-sm leading-6 not-italic">
                                                <MapPin
                                                    className="mt-0.5 size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span className="whitespace-pre-line">
                                                    {office.address}
                                                </span>
                                            </address>
                                            {office.phone && (
                                                <a
                                                    href={`tel:${office.phone.replace(/\s/g, '')}`}
                                                    className="text-muted-foreground hover:text-foreground flex items-start gap-3 text-sm leading-6"
                                                >
                                                    <Phone
                                                        className="mt-0.5 size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    {office.phone}
                                                </a>
                                            )}
                                            {office.email && (
                                                <a
                                                    href={`mailto:${office.email}`}
                                                    className="text-muted-foreground hover:text-foreground flex items-start gap-3 text-sm leading-6"
                                                >
                                                    <Mail
                                                        className="mt-0.5 size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="break-all">
                                                        {office.email}
                                                    </span>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid content-start gap-3">
                                    <h2 className="text-sm font-medium">
                                        Follow Us
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        <SocialLinks />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </section>
            </main>
            <SiteFooter />
        </>
    );
}
