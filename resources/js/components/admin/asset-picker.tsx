import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCsrfToken } from '@/lib/csrf';

// New, separate asset selector for nonprotected editors (MED-01,
// docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5). Deliberately NOT a change to
// resources/js/components/admin/media-picker.tsx, which Services and
// /admin/test still use unmodified with its upload-only behavior and
// existing POST /admin/media contract. This component adds the capability
// that one lacks: browsing and choosing an already-uploaded asset, with
// server-side search/pagination/type filtering, on top of the same upload
// flow.

export type AssetPickerValue = {
    id: string;
    url: string;
    fileName: string;
} | null;

type AssetSummary = {
    id: string;
    fileName: string;
    altText: string;
    url: string;
    mimeType: string;
    kind: 'image' | 'document';
};

export function AssetPicker({
    value,
    onChange,
    accept,
    label,
}: {
    value: AssetPickerValue;
    onChange: (value: AssetPickerValue) => void;
    accept?: 'image' | 'document';
    label: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [browseOpen, setBrowseOpen] = useState(false);

    async function handleFile(file: File) {
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/admin/media', {
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
                setError(json?.errors?.file?.[0] ?? 'Upload failed.');
                return;
            }

            const json = await response.json();
            const media = json.data as {
                id: string;
                url: string;
                fileName: string;
            };
            onChange({
                id: media.id,
                url: media.url,
                fileName: media.fileName,
            });
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={
                    accept === 'image'
                        ? 'image/png,image/jpeg,image/webp'
                        : accept === 'document'
                          ? 'application/pdf'
                          : undefined
                }
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void handleFile(file);
                }}
            />
            {value ? (
                <div className="flex items-center gap-3">
                    {accept === 'document' ? (
                        <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg text-xs">
                            FILE
                        </div>
                    ) : (
                        <img
                            src={value.url}
                            alt=""
                            className="size-12 shrink-0 rounded-lg object-cover"
                        />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">
                        {value.fileName}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={uploading}
                            onClick={() => onChange(null)}
                        >
                            Remove
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={uploading}
                            onClick={() => setBrowseOpen(true)}
                        >
                            Change
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => setBrowseOpen(true)}
                    >
                        Choose Existing
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => inputRef.current?.click()}
                    >
                        {uploading
                            ? 'Uploading…'
                            : accept === 'document'
                              ? 'Upload File'
                              : 'Upload Image'}
                    </Button>
                </div>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}

            <BrowseDialog
                open={browseOpen}
                onOpenChange={setBrowseOpen}
                accept={accept}
                onSelect={(asset) => {
                    onChange({
                        id: asset.id,
                        url: asset.url,
                        fileName: asset.fileName,
                    });
                    setBrowseOpen(false);
                }}
            />
        </div>
    );
}

function BrowseDialog({
    open,
    onOpenChange,
    accept,
    onSelect,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accept?: 'image' | 'document';
    onSelect: (asset: AssetSummary) => void;
}) {
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<AssetSummary[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setItems([]);
        setPage(1);
        void load(1, search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const timeout = setTimeout(() => {
            setItems([]);
            setPage(1);
            void load(1, search);
        }, 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    async function load(targetPage: number, term: string) {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(targetPage) });
            if (term) params.set('search', term);
            if (accept) params.set('type', accept);

            const response = await fetch(`/admin/media?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            const json = await response.json();
            setItems((current) =>
                targetPage === 1 ? json.data : [...current, ...json.data],
            );
            setHasMore(json.nextPage !== null);
            setPage(targetPage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        Choose {accept === 'document' ? 'A File' : 'An Image'}
                    </DialogTitle>
                </DialogHeader>
                <Input
                    placeholder="Search by file name or alt text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    autoFocus
                />
                <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="group focus-visible:ring-ring flex flex-col gap-1 rounded-lg outline-none focus-visible:ring-2"
                            onClick={() => onSelect(item)}
                        >
                            {item.kind === 'image' ? (
                                <img
                                    src={item.url}
                                    alt={item.altText}
                                    className="aspect-square w-full rounded-lg object-cover group-hover:opacity-80"
                                />
                            ) : (
                                <div className="bg-muted text-muted-foreground flex aspect-square items-center justify-center rounded-lg text-xs group-hover:opacity-80">
                                    FILE
                                </div>
                            )}
                            <span className="truncate text-xs">
                                {item.fileName}
                            </span>
                        </button>
                    ))}
                    {items.length === 0 && !loading && (
                        <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
                            No results.
                        </p>
                    )}
                </div>
                <DialogFooter className="border-t-0 bg-transparent pt-0">
                    {hasMore && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={loading}
                            onClick={() => load(page + 1, search)}
                        >
                            {loading ? 'Loading…' : 'Load More'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
