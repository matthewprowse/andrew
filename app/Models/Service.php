<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Service extends Model
{
    protected $fillable = ['name', 'headline', 'slug', 'intro', 'body', 'rich_content', 'icon', 'banner_image', 'banner_media_id', 'cta_text', 'cta_description', 'cta_button_label', 'cta_link', 'contact_fields', 'scope', 'countries', 'featured_primary', 'featured_services', 'faqs', 'sort_order', 'status', 'published_at', 'meta_title', 'meta_description'];

    protected function casts(): array
    {
        return ['banner_media_id' => 'integer', 'scope' => 'array', 'countries' => 'array', 'featured_primary' => 'array', 'featured_services' => 'array', 'contact_fields' => 'array', 'faqs' => 'array', 'sort_order' => 'integer', 'published_at' => 'datetime'];
    }

    /** @return BelongsTo<Media, $this> */
    public function bannerImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'banner_media_id');
    }

    /** @return BelongsToMany<BlogPost, $this> */
    public function blogPosts(): BelongsToMany
    {
        return $this->belongsToMany(BlogPost::class, 'blog_post_service');
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'headline' => $this->headline,
            'slug' => $this->slug,
            'intro' => $this->intro ?? '',
            'body' => $this->body ?? '',
            'rich_content' => $this->rich_content ?? '',
            'icon' => $this->icon ?? '',
            'banner_image' => $this->banner_image ?? '',
            'banner_media_id' => $this->banner_media_id,
            'bannerImage' => $this->bannerImage ? ['id' => (string) $this->bannerImage->id, 'url' => $this->bannerImage->url(), 'fileName' => $this->bannerImage->file_name] : null,
            'cta_text' => $this->cta_text ?? '',
            'cta_description' => $this->cta_description ?? '',
            'cta_button_label' => $this->cta_button_label ?? '',
            'cta_link' => $this->cta_link ?? '',
            'contact_fields' => $this->contact_fields ?? [],
            'scope' => $this->scope ?? [],
            'countries' => $this->countries ?? [],
            'featured_primary' => $this->featured_primary ?? [],
            'featured_services' => $this->featured_services ?? [],
            'faqs' => $this->faqs ?? [],
            'sort_order' => $this->sort_order,
            'status' => $this->status === 'published' ? 'Live' : 'Draft',
            'updatedAt' => $this->updated_at?->format('Y-m-d') ?? '',
            'metaTitle' => $this->meta_title ?? '',
            'metaDescription' => $this->meta_description ?? '',
        ];
    }

    /** @return array<string, mixed> */
    public function publicData(): array
    {
        return [
            ...$this->adminData(),
            // A selected library image takes precedence, while existing URL-based
            // banners remain a supported fallback for previously entered content.
            'bannerImageUrl' => $this->bannerImage?->url() ?? ($this->banner_image ?? ''),
            'bannerImageAlt' => $this->bannerImage?->alt_text ?: "{$this->name} service banner",
        ];
    }
}
