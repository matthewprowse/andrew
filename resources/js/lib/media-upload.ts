import { csrfFetch } from '@/lib/csrf';

export type MediaValue = {
    id: string;
    url: string;
    fileName: string;
} | null;

export type MediaAccept = 'image' | 'document';

export function mediaAcceptAttribute(accept?: MediaAccept): string | undefined {
    if (accept === 'image') return 'image/png,image/jpeg,image/webp';
    if (accept === 'document') return 'application/pdf';

    return undefined;
}

export type MediaUploadResult =
    | { ok: true; media: NonNullable<MediaValue> }
    | { ok: false; error: string };

/** Uploads a file to the media library via POST /admin/media. */
export async function uploadMedia(file: File): Promise<MediaUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await csrfFetch('/admin/media', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const json = await response.json().catch(() => null);
        return {
            ok: false,
            error: json?.errors?.file?.[0] ?? 'Upload failed.',
        };
    }

    const json = await response.json();
    const media = json.data as { id: string; url: string; fileName: string };

    return {
        ok: true,
        media: { id: media.id, url: media.url, fileName: media.fileName },
    };
}
