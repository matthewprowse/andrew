import { Link, usePage } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const FEEDBACK_TYPES = [
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'other', label: 'Other' },
] as const;

const MAX_PHOTOS = 5;

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Global feedback FAB for the admin tool itself (not site content) — lives
 * in AdminWorkspaceLayout, so it appears on every non-Services admin page.
 * Gated by publicSettings.site.feedbackEnabled, an admin-configurable
 * setting (see Settings → Site, or Company → Company Settings) that can
 * turn this off across the whole app. Deliberately NOT added to
 * admin-layout.tsx or admin-test-layout.tsx — those stay exactly as they
 * are.
 */
export function FeedbackFab() {
    const { publicSettings, auth, url } = usePage<{
        publicSettings: { site: { feedbackEnabled: boolean } };
        auth: { user: { name: string } | null; canAdmin: boolean };
    }>().props;

    const [open, setOpen] = useState(false);
    const [type, setType] = useState<string>('bug');
    const [message, setMessage] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const urls = photos.map((photo) => URL.createObjectURL(photo));
        setPreviews(urls);
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [photos]);

    if (!publicSettings.site.feedbackEnabled || !auth.user) {
        return null;
    }

    function addPhotos(files: FileList | null) {
        if (!files) return;
        setPhotos((current) =>
            [...current, ...Array.from(files)].slice(0, MAX_PHOTOS),
        );
    }

    function removePhoto(index: number) {
        setPhotos((current) => current.filter((_, i) => i !== index));
    }

    function resetForm() {
        setType('bug');
        setMessage('');
        setPhotos([]);
    }

    async function submit() {
        if (!message.trim()) return;
        setSubmitting(true);
        setError('');

        const formData = new FormData();
        formData.append('type', type);
        formData.append('message', message);
        formData.append('page_url', String(url));
        photos.forEach((photo) => formData.append('photos[]', photo));

        try {
            const response = await fetch('/admin/feedback', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: formData,
            });

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                setError(
                    json?.errors?.message?.[0] ??
                        json?.errors?.photos?.[0] ??
                        'Could not send feedback.',
                );
                return;
            }

            setSent(true);
            resetForm();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    // Reset once the popover fully closes, not while the
                    // user might still be re-reading the confirmation.
                    setTimeout(() => {
                        setSent(false);
                        setError('');
                    }, 200);
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    className="fixed right-6 bottom-4 z-50 rounded-md"
                    aria-label="Give feedback on this tool"
                >
                    Feedback
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                side="top"
                sideOffset={12}
                className="w-80 p-4"
                onOpenAutoFocus={(event) => {
                    if (sent) event.preventDefault();
                }}
            >
                {sent ? (
                    <div className="grid gap-2">
                        <p className="text-sm font-medium">
                            Thanks for the feedback.
                        </p>
                        <p className="text-muted-foreground text-sm">
                            It's been recorded for review.
                        </p>
                        {auth.canAdmin && (
                            <Link
                                href="/admin/feedback"
                                className="text-sm underline underline-offset-4"
                            >
                                View submitted feedback
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        <div className="grid gap-1">
                            <p className="text-sm font-medium">Feedback</p>
                            <p className="text-muted-foreground text-sm">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit.
                            </p>
                        </div>

                        <div className="grid gap-1.5">
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger
                                    id="feedback-type"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FEEDBACK_TYPES.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            rows={4}
                            autoFocus
                        />

                        <div className="grid gap-1.5">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                multiple
                                className="hidden"
                                onChange={(event) => {
                                    addPhotos(event.target.files);
                                    event.target.value = '';
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                disabled={photos.length >= MAX_PHOTOS}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Select Images
                            </Button>
                            {photos.length > 0 && (
                                <ul className="grid grid-cols-4 gap-1.5">
                                    {photos.map((photo, index) => (
                                        <li
                                            key={`${photo.name}-${index}`}
                                            className="relative aspect-square overflow-hidden rounded-md border"
                                        >
                                            <img
                                                src={previews[index]}
                                                alt={photo.name}
                                                className="size-full object-cover"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={() =>
                                                    removePhoto(index)
                                                }
                                                aria-label={`Remove ${photo.name}`}
                                                className="absolute top-0.5 right-0.5"
                                            >
                                                <X />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {error && (
                            <p className="text-destructive text-sm">{error}</p>
                        )}
                        <Button
                            type="button"
                            disabled={!message.trim() || submitting}
                            onClick={submit}
                        >
                            {submitting ? 'Sending…' : 'Send Feedback'}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
