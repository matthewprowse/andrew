export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small' | 'large';
}) {
    return (
        <header className={variant === 'small' ? '' : 'mb-8 space-y-0.5'}>
            <h2
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-base font-medium'
                        : variant === 'large'
                          ? 'text-2xl font-semibold'
                          : 'text-xl font-semibold'
                }
            >
                {title}
            </h2>
            {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
            )}
        </header>
    );
}
