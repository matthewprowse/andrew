export default function Heading({
    title,
    description,
    variant = 'default',
    as: HeadingTag = 'h2',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small' | 'large';
    as?: 'h1' | 'h2';
}) {
    return (
        <header className={variant === 'small' ? '' : 'mb-8 space-y-0.5'}>
            <HeadingTag
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-base font-medium'
                        : variant === 'large'
                          ? 'text-2xl font-semibold'
                          : 'text-xl font-semibold'
                }
            >
                {title}
            </HeadingTag>
            {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
            )}
        </header>
    );
}
