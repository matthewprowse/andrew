export function formatDateTime(iso: string): string {
    if (!iso) return '';

    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
