import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { Spinner } from '@/components/ui/spinner';

export type ServiceContactField = {
    key: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'textarea';
    required?: boolean;
    placeholder?: string;
};

export function ServiceContactDialog({
    open,
    onOpenChange,
    serviceId,
    serviceName,
    buttonLabel = 'Send Message',
    fields = [],
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serviceId: number;
    serviceName: string;
    buttonLabel?: string;
    fields?: ServiceContactField[];
}) {
    const form = useForm({
        name: '',
        email: '',
        subject: `${serviceName} enquiry`,
        message: '',
        service_id: serviceId,
        custom_fields: {} as Record<string, string>,
    });

    function close(nextOpen: boolean) {
        if (!nextOpen && !form.processing) onOpenChange(false);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/contact', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-x-hidden overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Contact Us</DialogTitle>
                    <DialogDescription>
                        Tell us how we can help with {serviceName}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid min-w-0 gap-4">
                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="service-contact-name">Name</Label>
                        <Input id="service-contact-name" name="name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />
                        <InputError message={form.errors.name} />
                    </div>
                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="service-contact-email">Email Address</Label>
                        <Input id="service-contact-email" name="email" type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} required />
                        <InputError message={form.errors.email} />
                    </div>
                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="service-contact-subject">Subject</Label>
                        <Input id="service-contact-subject" name="subject" value={form.data.subject} onChange={(event) => form.setData('subject', event.target.value)} required />
                        <InputError message={form.errors.subject} />
                    </div>
                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="service-contact-message">Message</Label>
                        <Textarea id="service-contact-message" name="message" value={form.data.message} onChange={(event) => form.setData('message', event.target.value)} required />
                        <InputError message={form.errors.message} />
                    </div>
                    {fields.map((field) => {
                        const value = form.data.custom_fields[field.key] ?? '';
                        const setValue = (next: string) => form.setData('custom_fields', { ...form.data.custom_fields, [field.key]: next });
                        return (
                            <div key={field.key} className="grid min-w-0 gap-2">
                                <Label htmlFor={`service-contact-${field.key}`}>{field.label}</Label>
                                {field.type === 'textarea' ? (
                                    <Textarea id={`service-contact-${field.key}`} value={value} placeholder={field.placeholder} required={field.required} onChange={(event) => setValue(event.target.value)} />
                                ) : (
                                    <Input id={`service-contact-${field.key}`} type={field.type} value={value} placeholder={field.placeholder} required={field.required} onChange={(event) => setValue(event.target.value)} />
                                )}
                                <InputError message={form.errors[`custom_fields.${field.key}`]} />
                            </div>
                        );
                    })}
                    <Button type="submit" disabled={form.processing} className="w-full sm:w-fit">
                        {form.processing && <Spinner />}
                        {buttonLabel}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
