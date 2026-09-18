export function MediaContent({
    title,
    description,
    hasImage = false,
    imagePosition = 'right',
    imageUrl,
    imageAlt = '',
}: {
    title: string;
    description: string;
    hasImage?: boolean;
    imagePosition?: 'left' | 'right';
    imageUrl?: string;
    imageAlt?: string;
}) {
    const copy = (
        <div className={hasImage ? '' : 'mx-auto max-w-3xl text-center'}>
            <h2 className="text-2xl font-medium">{title}</h2>
            <p
                className={`text-muted-foreground mt-4 leading-7 whitespace-pre-line ${hasImage ? 'max-w-xl' : 'mx-auto max-w-3xl'}`}
            >
                {description}
            </p>
        </div>
    );
    const image = imageUrl ? (
        <img
            src={imageUrl}
            alt={imageAlt}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-xl object-cover"
        />
    ) : (
        <div aria-hidden="true" className="bg-muted aspect-[4/3] rounded-xl" />
    );

    if (!hasImage) return copy;

    return (
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
            {imagePosition === 'left' && image}
            {copy}
            {imagePosition === 'right' && image}
        </div>
    );
}
