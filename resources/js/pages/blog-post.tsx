import { usePage } from '@inertiajs/react';
import { CalendarDays } from 'lucide-react';
import { BlogPostCard } from '@/components/blog-post-card';
import { PageMeta, toAbsoluteUrl } from '@/components/page-meta';
import { SiteCta } from '@/components/site-cta';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { type BlogPost as Post, formatPublishDate } from '@/data/blog-posts';

export default function BlogPost({
    post,
    otherPosts,
}: {
    post: Post;
    otherPosts: Post[];
}) {
    const { canonicalUrl } = usePage<{ canonicalUrl: string }>().props;
    const origin = canonicalUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1');
    const absoluteBanner = toAbsoluteUrl(post.bannerImageUrl, origin);

    // Article markup uses only fields the BlogPost model actually stores
    // (title, excerpt, banner image, publish date). There is no author field
    // on the model, so no `author` claim is made here — inventing one would
    // be an unsupported structured-data claim.
    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.metaDescription || post.excerpt,
        datePublished: post.publishDate,
        mainEntityOfPage: canonicalUrl,
        ...(absoluteBanner ? { image: [absoluteBanner] } : {}),
    };

    return (
        <>
            <PageMeta
                title={post.metaTitle || post.title}
                description={post.metaDescription || post.excerpt}
                image={post.bannerImageUrl}
                type="article"
                structuredData={articleSchema}
            />
            <SiteHeader />
            <main>
                <section className="mx-auto w-full max-w-7xl px-6 py-16 text-center md:px-8 md:py-24">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {post.serviceNames.map((name) => (
                            <Badge key={name} variant="secondary">
                                {name}
                            </Badge>
                        ))}
                        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                            <CalendarDays className="size-3.5" />
                            {formatPublishDate(post.publishDate)}
                        </span>
                    </div>
                    <h1 className="mt-4 text-4xl font-semibold text-balance md:text-5xl">
                        {post.title}
                    </h1>
                    <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-lg leading-8">
                        {post.excerpt}
                    </p>
                </section>

                <section className="mx-auto w-full max-w-7xl px-6 md:px-8">
                    {post.bannerImageUrl ? (
                        <img
                            src={post.bannerImageUrl}
                            alt={post.bannerImageAlt}
                            className="aspect-[16/9] w-full rounded-xl object-cover"
                        />
                    ) : (
                        <div
                            aria-hidden="true"
                            className="bg-muted aspect-[16/9] rounded-xl"
                        />
                    )}
                </section>

                <section className="mx-auto w-full max-w-7xl px-6 py-16 md:px-8 md:py-24">
                    <div className="mx-auto grid w-full max-w-3xl gap-6">
                        {post.body.map((paragraph, index) => (
                            <p
                                key={index}
                                className="text-muted-foreground leading-7"
                            >
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </section>

                {otherPosts.length > 0 && (
                    <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                        <h2 className="text-2xl font-medium">More Insights</h2>
                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            {otherPosts.map((item) => (
                                <BlogPostCard key={item.slug} post={item} />
                            ))}
                        </div>
                    </section>
                )}

                <SiteCta />
            </main>
            <SiteFooter />
        </>
    );
}
