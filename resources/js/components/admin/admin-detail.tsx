export function AdminDetail({
    label,
    value,
    multiline = false,
}: {
    label: string;
    value: string;
    multiline?: boolean;
}) {
    return (
        <div className="grid gap-1">
            <span className="text-muted-foreground">{label}</span>
            <span className={multiline ? 'whitespace-pre-wrap' : undefined}>
                {value || '—'}
            </span>
        </div>
    );
}
