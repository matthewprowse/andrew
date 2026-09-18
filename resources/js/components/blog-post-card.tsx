import { Link } from '@inertiajs/react';
import { CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatPublishDate, type BlogPost } from '@/data/blog-posts';

export function BlogPostCard({ post }: { post: BlogPost }) {
    return (
        <Card className="w-full gap-4 md:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.667rem)]">
            {post.bannerImageUrl ? (
                <img
                    src={post.bannerImageUrl}
                    alt={post.bannerImageAlt}
                    className="mx-4 aspect-[4/3] rounded-lg object-cover"
                />
            ) : (
                <div
                    aria-hidden="true"
                    className="bg-muted mx-4 aspect-[4/3] rounded-lg"
                />
            )}
            <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid gap-1.5">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
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
                    <CardTitle className="text-lg font-medium">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </CardTitle>
                    <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
                        {post.excerpt}
                    </p>
                </div>
                <Button asChild variant="secondary" className="mt-auto w-fit">
                    <Link href={`/blog/${post.slug}`}>Read Article</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
