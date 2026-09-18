import {
    MediaLibraryManager,
    type MediaItem,
} from '@/features/admin/media-library/media-library-manager';

export default function MediaLibraryIndex({
    media,
    hasMorePages,
}: {
    media: MediaItem[];
    hasMorePages: boolean;
}) {
    return <MediaLibraryManager media={media} hasMorePages={hasMorePages} />;
}
