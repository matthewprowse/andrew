import { BlogManager, type BlogPost } from '@/features/admin/blog/blog-manager';

type ServiceOption = { id: string; name: string };

export default function BlogIndex({
    posts,
    services,
}: {
    posts: BlogPost[];
    services: ServiceOption[];
}) {
    return <BlogManager posts={posts} services={services} />;
}
