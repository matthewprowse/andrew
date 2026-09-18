<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Testimonial extends Model
{
    protected $fillable = ['quote', 'author', 'company', 'service_id', 'sort_order', 'status', 'published_at'];

    protected function casts(): array
    {
        return ['service_id' => 'integer', 'sort_order' => 'integer', 'published_at' => 'datetime'];
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** @param Builder<Testimonial> $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', 'published');
    }

    /** @return array{id: string, quote: string, author: string, company: string} */
    public function publicData(): array
    {
        return ['id' => (string) $this->id, 'quote' => $this->quote, 'author' => $this->author, 'company' => $this->company ?? ''];
    }

    /** @return array{id: string, quote: string, author: string, company: string, serviceId: string|null, sortOrder: int, status: 'Draft'|'Live', updatedAt: string} */
    public function adminData(): array
    {
        return [...$this->publicData(), 'serviceId' => $this->service_id ? (string) $this->service_id : null, 'sortOrder' => $this->sort_order, 'status' => $this->status === 'published' ? 'Live' : 'Draft', 'updatedAt' => $this->updated_at->format('Y-m-d')];
    }
}
