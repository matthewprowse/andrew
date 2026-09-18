export type FeatureGridItem = {
    title: string;
    description?: string;
    items?: string[];
};

export function FeatureGrid({
    items,
    className,
}: {
    items: FeatureGridItem[];
    className?: string;
}) {
    return (
        <div
            className={`grid border-t md:grid-cols-2 md:gap-x-12 ${className ?? ''}`}
        >
            {items.map((item, index) => (
                <article key={index} className="border-b py-6 md:py-8">
                    <h3 className="text-lg font-medium">{item.title}</h3>
                    {item.description && (
                        <p className="text-muted-foreground mt-2 max-w-xl leading-7">
                            {item.description}
                        </p>
                    )}
                    {item.items && (
                        <ul className="text-muted-foreground mt-2 max-w-xl list-disc space-y-1 pl-5 leading-7">
                            {item.items.map((bullet, bulletIndex) => (
                                <li key={bulletIndex}>{bullet}</li>
                            ))}
                        </ul>
                    )}
                </article>
            ))}
        </div>
    );
}
