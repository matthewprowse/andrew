<?php

namespace App\Models;

use App\Payments\Contracts\PaymentGateway;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResourceItem extends Model
{
    public const ACCESS_OPEN = 'open';

    public const ACCESS_EMAIL = 'email';

    public const ACCESS_PAID = 'paid';

    public const ACCESS_TYPES = [self::ACCESS_OPEN, self::ACCESS_EMAIL, self::ACCESS_PAID];

    protected $fillable = [
        'resource_category_id', 'service_id', 'author_id', 'title', 'description', 'action_label',
        'file_media_id', 'image_media_id', 'external_url', 'access_type', 'price_cents', 'currency',
        'sort_order', 'status', 'published_at',
    ];

    protected $attributes = [
        'access_type' => self::ACCESS_OPEN,
        'currency' => 'USD',
    ];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'published_at' => 'datetime', 'price_cents' => 'integer', 'service_id' => 'integer', 'author_id' => 'integer'];
    }

    public function isGated(): bool
    {
        return $this->access_type !== self::ACCESS_OPEN;
    }

    public function isPaid(): bool
    {
        return $this->access_type === self::ACCESS_PAID;
    }

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** @return BelongsTo<ResourceCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ResourceCategory::class, 'resource_category_id');
    }

    /**
     * Read-only association added for LIB-03 (docs/ADMIN_UX_SEO_BUILD_PLAN.md
     * §Phase 4) so resources can be tagged to a service the same way
     * BlogPost already is. Never writes to the Service model/table — see
     * ResourceController::fields(), which only ever stores the foreign key.
     *
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** @return BelongsToMany<Service, $this> */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'resource_item_service');
    }

    /** @return BelongsTo<Media, $this> */
    public function file(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'file_media_id');
    }

    /** @return BelongsTo<Media, $this> */
    public function image(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'image_media_id');
    }

    /** @return Builder<static> */
    public static function publiclyVisible(): Builder
    {
        return static::query()->where('status', 'published');
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'categorySlug' => data_get($this->category, 'slug', ''),
            'categoryTitle' => data_get($this->category, 'title', ''),
            'title' => $this->title,
            'description' => $this->description ?? '',
            'actionLabel' => $this->action_label ?? '',
            'file' => $this->file ? ['id' => (string) $this->file->id, 'url' => $this->file->url(), 'fileName' => $this->file->file_name] : null,
            'image' => $this->image ? ['id' => (string) $this->image->id, 'url' => $this->image->url(), 'fileName' => $this->image->file_name] : null,
            'externalUrl' => $this->external_url ?? '',
            'sortOrder' => $this->sort_order,
            'status' => $this->status === 'published' ? 'Live' : 'Draft',
            'accessType' => $this->access_type,
            'price' => Money::toDecimal($this->price_cents),
            'formattedPrice' => $this->price_cents !== null ? Money::format($this->price_cents, $this->currency) : '',
            'serviceId' => $this->service_id ? (string) $this->service_id : null,
            'serviceIds' => $this->services->pluck('id')->map(fn ($id) => (string) $id)->all(),
            'serviceNames' => $this->services->pluck('name')->all(),
            'authorId' => $this->author_id ? (string) $this->author_id : null,
            'authorName' => $this->author?->name,
            'updatedAt' => $this->updated_at?->format('Y-m-d') ?? '',
        ];
    }

    /** @return array<string, mixed> */
    public function publicData(): array
    {
        $gated = $this->isGated();
        $paid = $this->isPaid() && $this->price_cents !== null;

        return [
            'id' => (string) $this->id,
            'categorySlug' => data_get($this->category, 'slug', ''),
            'title' => $this->title,
            'description' => $this->description ?? '',
            'actionLabel' => $this->action_label ?? '',
            'fileUrl' => $gated ? '' : ($this->file?->url() ?? ''),
            'fileName' => $this->file->file_name ?? '',
            'externalUrl' => $gated ? '' : ($this->external_url ?? ''),
            'imageUrl' => $this->image?->url() ?? '',
            'imageAlt' => $this->image?->alt_text ?: $this->title,
            'sortOrder' => $this->sort_order,
            'accessType' => $this->access_type,
            'priceCents' => $paid ? $this->price_cents : null,
            'formattedPrice' => $paid ? Money::format($this->price_cents, $this->currency) : '',
            // Prices stay visible while checkout is unavailable (e.g. before
            // PayPal is connected in production); the button says so instead.
            'purchasable' => $paid && app(PaymentGateway::class)->purchasingEnabled(),
        ];
    }
}
