import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type MediaPickerValue = {
    id: string;
    url: string;
    fileName: string;
} | null;

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export function MediaPicker({
    value,
    onChange,
    accept,
    label,
}: {
    value: MediaPickerValue;
    onChange: (value: MediaPickerValue) => void;
    accept?: 'image' | 'document';
    label: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

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
                            onClick={() => inputRef.current?.click()}
                        >
                            {uploading ? 'Uploading…' : 'Replace'}
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading
                        ? 'Uploading…'
                        : accept === 'document'
                          ? 'Select File'
                          : 'Select Image'}
                </Button>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
    );
}
