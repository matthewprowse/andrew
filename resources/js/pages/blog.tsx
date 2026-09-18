import { BlogPostCard } from '@/components/blog-post-card';
import { PageMeta } from '@/components/page-meta';
import { SiteCta } from '@/components/site-cta';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { type BlogPost } from '@/data/blog-posts';

export default function Blog({ blogPosts }: { blogPosts: BlogPost[] }) {
    return (
        <>
            <PageMeta
                title="Insights"
                description="Practical insights on corporate relocation, immigration, remuneration and global mobility across Africa from Relocation Africa."
            />
            <SiteHeader />
            <main>
                <section className="mx-auto w-full max-w-7xl px-6 py-16 text-center md:px-8 md:py-24">
                    <p className="text-muted-foreground text-sm">Insights</p>
                    <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                        Insights
                    </h1>
                    <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-lg leading-8">
                        Practical perspectives for organisations and people
                        navigating mobility across Africa.
                    </p>
                </section>

                <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
                    <div className="flex flex-wrap justify-center gap-4">
                        {blogPosts.length === 0 && (
                            <p className="text-muted-foreground">
                                No articles have been published yet.
                            </p>
                        )}
                        {blogPosts.map((post) => (
                            <BlogPostCard key={post.slug} post={post} />
                        ))}
                    </div>
                </section>

                <SiteCta />
            </main>
            <SiteFooter />
        </>
    );
}
