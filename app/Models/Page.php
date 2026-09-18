<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Stored JSON, so its inner shape is not statically guaranteed — validated
 * defensively at read time in homeBlocksData(), not assumed here.
 *
 * @property array<string, mixed>|null $home_blocks
 * @property array<int|string, mixed>|null $blocks
 */
class Page extends Model
{
    /** A page whose content is a list of editable blocks — Home, plus any page created from the admin. */
    public const KIND_BLOCK = 'block';

    /** A fixed-field page (About, Contact, Locations) predating the block system. */
    public const KIND_LEGACY = 'legacy';

    protected $fillable = [
        'slug', 'title', 'kind', 'is_system', 'blocks',
        'hero_heading', 'hero_subheading', 'intro_heading', 'intro_body',
        'intro_image_media_id', 'sections', 'home_blocks', 'show_team_section',
        'meta_title', 'meta_description', 'og_image_media_id',
    ];

    /**
     * Default shape for the `home` slug's structured, editable homepage
     * blocks (CMS-02). Every block starts disabled with empty content, so a
     * page row with no `home_blocks` set — every row that existed before
     * this column was added, and every row for a non-home slug — resolves
     * to "use the hardcoded fallback copy": resources/js/pages/home.tsx only
     * ever reads a block's stored content when that block's `enabled` flag
     * is true, so public output cannot change until an editor explicitly
     * turns a block on.
     *
     * @var array<string, array<string, mixed>>
     */
    public const HOME_BLOCK_DEFAULTS = [
        'servicesIntro' => ['enabled' => false, 'text' => ''],
        'africanReachIntro' => ['enabled' => false, 'text' => ''],
        'audiences' => ['enabled' => false, 'items' => [
            ['title' => '', 'text' => ''],
            ['title' => '', 'text' => ''],
            ['title' => '', 'text' => ''],
        ]],
        'partnership' => ['enabled' => false, 'body' => ''],
        'resourcesIntro' => ['enabled' => false, 'text' => ''],
        'finalCta' => ['enabled' => false, 'description' => ''],
    ];

    protected function casts(): array
    {
        return ['sections' => 'array', 'home_blocks' => 'array', 'show_team_section' => 'boolean', 'blocks' => 'array', 'is_system' => 'boolean'];
    }

    public function isBlockPage(): bool
    {
        return $this->kind === self::KIND_BLOCK;
    }

    /** @return list<array<string, mixed>> */
    public function blocksData(): array
    {
        return is_array($this->blocks) ? array_values($this->blocks) : [];
    }

    /** @return BelongsTo<Media, $this> */
    public function introImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'intro_image_media_id');
    }

    /** @return BelongsTo<Media, $this> */
    public function ogImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'og_image_media_id');
    }

    /**
     * PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): the
     * append-only draft/publish history for this row. See
     * App\Services\PagePublishingService for how it's written to; this row
     * (the live `pages` table) stays the published baseline throughout and
     * is only ever updated by an explicit Publish.
     *
     * @return HasMany<PageRevision, $this>
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(PageRevision::class);
    }

    /**
     * Merges stored `home_blocks` over the full default shape so every
     * consumer (admin editor and the public home page) always receives
     * every block key with every sub-key present, even for rows created
     * before this column existed or that only ever set some blocks.
     *
     * @return array<string, array<string, mixed>>
     */
    public function homeBlocksData(): array
    {
        $stored = is_array($this->home_blocks) ? $this->home_blocks : [];
        $result = self::HOME_BLOCK_DEFAULTS;

        foreach ($result as $key => $default) {
            if (isset($stored[$key]) && is_array($stored[$key])) {
                $result[$key] = [...$default, ...$stored[$key]];
            }
        }

        return $result;
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'title' => $this->title ?? '',
            'kind' => $this->kind,
            'isSystem' => $this->is_system,
            'blocks' => $this->blocksData(),
            'heroHeading' => $this->hero_heading ?? '',
            'heroSubheading' => $this->hero_subheading ?? '',
            'introHeading' => $this->intro_heading ?? '',
            'introBody' => $this->intro_body ?? '',
            'introImage' => $this->introImage ? ['id' => (string) $this->introImage->id, 'url' => $this->introImage->url(), 'fileName' => $this->introImage->file_name] : null,
            'sections' => $this->sections ?? [],
            'homeBlocks' => $this->homeBlocksData(),
            'showTeamSection' => $this->show_team_section,
            'metaTitle' => $this->meta_title ?? '',
            'metaDescription' => $this->meta_description ?? '',
            'ogImage' => $this->ogImage ? ['id' => (string) $this->ogImage->id, 'url' => $this->ogImage->url(), 'fileName' => $this->ogImage->file_name] : null,
        ];
    }

    /** @return array<string, mixed> */
    public function publicData(): array
    {
        $data = $this->adminData();
        unset($data['showTeamSection'], $data['ogImage']);

        return [
            ...$data,
            'introImageUrl' => $this->introImage?->url() ?? '',
            'introImageAlt' => $this->introImage->alt_text ?? '',
            'ogImageUrl' => $this->ogImage?->url() ?? '',
        ];
    }
}
