<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * The new FAQ store (LIB-06, docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4) — a
 * separate table from the legacy `services.faqs` json column, which stays
 * exactly as-is (see App\Models\Service, never edited by this work). This
 * model's `service` association is read-only: it is used only to display an
 * optional "which service is this related to" tag/dropdown, never to write
 * back to the Service model/table.
 *
 * @property Carbon|null $review_date
 */
class Faq extends Model
{
    protected $fillable = ['question', 'answer', 'service_id', 'status', 'source', 'review_date'];

    protected function casts(): array
    {
        return ['service_id' => 'integer', 'review_date' => 'date'];
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** @return BelongsToMany<Service, $this> */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'faq_service');
    }

    /**
     * FAQs eligible for any future public consumer: already-public
     * (imported) rows, or internal rows an editor has deliberately marked
     * public — but only once published too. No public route/prop reads this
     * scope yet in this batch (that is explicitly deferred); it exists so
     * the "internal excluded, public+published included" rule is testable
     * and ready for the later ticket that wires up a public display.
     *
     * @return Builder<static>
     */
    public static function publicEligible(): Builder
    {
        return static::query()->where('status', 'published');
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'question' => $this->question,
            'answer' => $this->answer,
            'serviceId' => $this->service_id ? (string) $this->service_id : null,
            'serviceIds' => $this->services->pluck('id')->map(fn ($id) => (string) $id)->all(),
            'serviceNames' => $this->services->pluck('name')->all(),
            'serviceName' => $this->service?->name,
            'status' => $this->status === 'published' ? 'Live' : 'Draft',
            'reviewDate' => $this->review_date?->format('Y-m-d'),
            'updatedAt' => $this->updated_at->format('Y-m-d'),
        ];
    }
}
