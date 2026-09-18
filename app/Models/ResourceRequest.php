<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $submitted_at
 * @property Carbon|null $verified_at
 * @property Carbon|null $consent_given_at
 * @property Carbon|null $anonymized_at
 */
class ResourceRequest extends Model
{
    protected $fillable = ['resource_item_id', 'name', 'first_name', 'last_name', 'email', 'company', 'consent_given_at', 'verified_at', 'submitted_at', 'anonymized_at'];

    protected function casts(): array
    {
        return ['consent_given_at' => 'datetime', 'verified_at' => 'datetime', 'submitted_at' => 'datetime', 'anonymized_at' => 'datetime'];
    }

    /** @return BelongsTo<ResourceItem, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(ResourceItem::class, 'resource_item_id');
    }

    /**
     * Breaks the link to the person's identity while keeping the row for
     * business reporting — a POPIA/GDPR-style "forget me" action, not a
     * hard delete. See docs/data-subject-requests.md.
     */
    public function anonymize(): void
    {
        $this->update([
            'name' => null,
            'first_name' => null,
            'last_name' => null,
            'email' => 'anonymized-'.$this->id.'@example.invalid',
            'company' => null,
            'anonymized_at' => now(),
        ]);
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'resourceTitle' => $this->item->title ?? 'Deleted item',
            'name' => $this->name,
            'email' => $this->email,
            'company' => $this->company ?? '',
            'date' => $this->submitted_at->toIso8601String(),
            'verified' => $this->verified_at !== null,
            'consentGiven' => $this->consent_given_at !== null,
        ];
    }
}
