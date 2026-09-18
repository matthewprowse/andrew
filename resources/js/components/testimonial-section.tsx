type Testimonial = {
    id: string;
    quote: string;
    author: string;
    company: string;
};

export function TestimonialSection({
    testimonials,
}: {
    testimonials: Testimonial[];
}) {
    if (testimonials.length === 0) return null;

    return (
        <section className="bg-muted/30 border-y">
            <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-8 md:py-24">
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                    What Our Clients Say
                </h2>
                <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {testimonials.map((testimonial) => (
                        <figure
                            key={testimonial.id}
                            className="bg-background rounded-xl border p-6"
                        >
                            <blockquote className="leading-7">
                                “{testimonial.quote}”
                            </blockquote>
                            <figcaption className="text-muted-foreground mt-6 text-sm">
                                <span className="text-foreground font-medium">
                                    {testimonial.author}
                                </span>
                                {testimonial.company && (
                                    <> · {testimonial.company}</>
                                )}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}
