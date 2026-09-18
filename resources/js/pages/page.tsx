import { PublicBlock } from '@/components/blocks/public-blocks';
import { PageMeta } from '@/components/page-meta';
import { PreviewBanner } from '@/components/preview-banner';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import type { PageBlock } from '@/types/blocks';

export default function Page({
    title,
    metaTitle,
    metaDescription,
    ogImageUrl,
    blocks,
    preview = false,
}: {
    slug: string;
    title: string;
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
    blocks: PageBlock[];
    preview?: boolean;
}) {
    return (
        <>
            <PageMeta
                title={metaTitle || title}
                description={metaDescription}
                image={ogImageUrl}
                noindex={preview}
            />
            {preview && <PreviewBanner />}
            <SiteHeader />
            <main>
                {blocks.map((block) => (
                    <PublicBlock key={block.id} block={block} />
                ))}
            </main>
            <SiteFooter />
        </>
    );
}
