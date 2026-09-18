<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/** @property Carbon|null $publish_date */
class BlogPost extends Model
{
    protected $fillable = ['title', 'slug', 'author_id', 'excerpt', 'body', 'banner_image', 'banner_media_id', 'status', 'publish_date', 'meta_title', 'meta_description'];

    protected function casts(): array
    {
        return ['author_id' => 'integer', 'banner_media_id' => 'integer', 'publish_date' => 'date'];
    }

    /** @return BelongsToMany<Service, $this> */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'blog_post_service');
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** @return BelongsTo<Media, $this> */
    public function bannerImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'banner_media_id');
    }

    /** @return Builder<static> */
    public static function publiclyVisible(): Builder
    {
        return static::query()->where('status', 'published')->whereDate('publish_date', '<=', today());
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return ['id' => (string) $this->id, 'title' => $this->title, 'slug' => $this->slug,
            'excerpt' => $this->excerpt, 'body' => $this->body,
            'bannerImage' => $this->bannerImage ? ['id' => (string) $this->bannerImage->id, 'url' => $this->bannerImage->url(), 'fileName' => $this->bannerImage->file_name] : null,
            'status' => $this->status === 'published' ? 'Live' : 'Draft', 'publishDate' => $this->publish_date?->format('Y-m-d') ?? '',
            'metaTitle' => $this->meta_title ?? '', 'metaDescription' => $this->meta_description ?? '',
            'serviceIds' => $this->services->pluck('id')->map(fn ($id) => (string) $id)->all(),
            'serviceNames' => $this->services->pluck('name')->all(),
            'authorId' => $this->author_id ? (string) $this->author_id : null,
            'authorName' => $this->author->name ?? ($this->author_id ? 'Deleted user' : null)];
    }

    /** @return array<string, mixed> */
    public function publicData(): array
    {
        return [...$this->adminData(), 'body' => preg_split('/\R\s*\R/u', trim($this->body)) ?: [],
            // A selected library image takes precedence, while existing URL-based
            // banners remain a supported fallback for previously entered content.
            'bannerImageUrl' => $this->bannerImage?->url() ?? ($this->banner_image ?? ''),
            'bannerImageAlt' => $this->bannerImage?->alt_text ?: "{$this->title} banner"];
    }
}
