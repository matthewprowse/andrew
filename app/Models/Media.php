<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    public const PUBLIC_DISK = 'public';

    /** Files attached to paid resources live here, outside the web root. */
    public const PRIVATE_DISK = 'local';

    protected $fillable = ['file_name', 'alt_text', 'file_path', 'disk', 'mime_type', 'size', 'kind'];

    protected $attributes = ['disk' => self::PUBLIC_DISK];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }

    public function url(): string
    {
        // Private files have no public URL; staff preview them through an
        // authenticated route instead.
        return $this->isPrivate()
            ? route('admin.media.file', $this)
            : Storage::disk(self::PUBLIC_DISK)->url($this->file_path);
    }

    public function isPrivate(): bool
    {
        return $this->disk === self::PRIVATE_DISK;
    }

    /**
     * A file is private exactly when a paid resource uses it. Moves the
     * stored file between disks when that changes (the path stays the same).
     */
    public function syncVisibility(): void
    {
        $target = ResourceItem::query()
            ->where('file_media_id', $this->id)
            ->where('access_type', ResourceItem::ACCESS_PAID)
            ->exists() ? self::PRIVATE_DISK : self::PUBLIC_DISK;

        if ($target === $this->disk) {
            return;
        }

        $from = Storage::disk($this->disk);
        $to = Storage::disk($target);

        if ($from->exists($this->file_path)) {
            $stream = $from->readStream($this->file_path);
            $to->writeStream($this->file_path, $stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
            $from->delete($this->file_path);
        }

        $this->update(['disk' => $target]);
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'fileName' => $this->file_name,
            'altText' => $this->alt_text ?? '',
            'url' => $this->url(),
            'mimeType' => $this->mime_type,
            'size' => $this->size,
            'kind' => $this->kind,
            'private' => $this->isPrivate(),
            'uploadedAt' => $this->created_at?->format('Y-m-d') ?? '',
        ];
    }

    /**
     * Usage report for a batch of media rows (MED-02/MED-03,
     * docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5). Confirmed references are
     * exact foreign-key matches — ResourceItem file/cover, Page intro/OG
     * image, TeamMember photo, Service banner (read-only against Service,
     * never written here). BlogPost stores its banner as a plain URL string
     * (`banner_image`), not a media id, so there is no way to confirm that
     * link by id — a best-effort URL-substring match is reported separately
     * as "unconfirmed" rather than folded into "confirmed" or silently
     * treated as unused. Never claim confidence the data doesn't support.
     *
     * @param  Collection<int, Media>  $mediaItems
     * @return array<int, array{confirmed: list<string>, unconfirmed: list<string>}> keyed by media id
     */
    public static function usageFor(Collection $mediaItems): array
    {
        $ids = $mediaItems->pluck('id')->all();

        /** @var array<int, list<string>> $confirmed */
        $confirmed = array_fill_keys($ids, []);
        /** @var array<int, list<string>> $unconfirmed */
        $unconfirmed = array_fill_keys($ids, []);

        if ($ids === []) {
            return [];
        }

        /** @var list<array{0: list<int|null>, 1: string}> $confirmedSources */
        $confirmedSources = [
            [ResourceItem::query()->whereIn('file_media_id', $ids)->pluck('file_media_id')->all(), 'Resource file'],
            [ResourceItem::query()->whereIn('image_media_id', $ids)->pluck('image_media_id')->all(), 'Resource cover image'],
            [Page::query()->whereIn('intro_image_media_id', $ids)->pluck('intro_image_media_id')->all(), 'Page intro image'],
            [Page::query()->whereIn('og_image_media_id', $ids)->pluck('og_image_media_id')->all(), 'Page social-share (OG) image'],
            [TeamMember::query()->whereIn('photo_media_id', $ids)->pluck('photo_media_id')->all(), 'Team member photo'],
            // Read-only against Service: only ever reads banner_media_id for
            // this report, never writes to the Service model/table.
            [Service::query()->whereIn('banner_media_id', $ids)->pluck('banner_media_id')->all(), 'Service banner'],
        ];

        foreach ($confirmedSources as [$matchedIds, $label]) {
            foreach ($matchedIds as $mediaId) {
                if ($mediaId !== null && array_key_exists($mediaId, $confirmed)) {
                    $confirmed[$mediaId][] = $label;
                }
            }
        }

        // BlogPost.banner_image is a plain URL string, not a media id — the
        // only way to relate it to a Media row at all is a URL match, which
        // is inherently best-effort (a banner could be an external URL, a
        // resized/derived copy, or predate consistent storage paths). Any
        // match is reported as unconfirmed, never confirmed.
        $bannerUrls = BlogPost::query()->whereNotNull('banner_image')->where('banner_image', '!=', '')->pluck('banner_image');
        foreach ($mediaItems as $media) {
            foreach ($bannerUrls as $bannerUrl) {
                if (str_contains($bannerUrl, $media->file_path) || $bannerUrl === $media->url()) {
                    $unconfirmed[$media->id][] = 'Possibly an article banner (could not confirm by id)';
                    break;
                }
            }
        }

        $usage = [];
        foreach ($ids as $id) {
            $usage[$id] = ['confirmed' => $confirmed[$id], 'unconfirmed' => $unconfirmed[$id]];
        }

        return $usage;
    }
}
