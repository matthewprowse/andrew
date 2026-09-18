<?php

namespace App\Models;

use App\Support\Money;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A purchase of one paid resource by one email address.
 *
 * @property int $id
 * @property string|null $reference
 * @property string $email
 * @property int $amount_cents
 * @property string $currency
 * @property string $status
 * @property string $gateway
 * @property Carbon|null $paid_at
 * @property Carbon|null $refunded_at
 * @property Carbon|null $cancelled_at
 * @property Carbon|null $anonymized_at
 */
class Order extends Model
{
    public const PENDING = 'pending';

    public const PAID = 'paid';

    public const REFUNDED = 'refunded';

    public const CANCELLED = 'cancelled';

    protected $fillable = [
        'reference', 'resource_item_id', 'resource_request_id', 'email', 'amount_cents', 'currency',
        'status', 'gateway', 'gateway_order_id', 'payer_name', 'payer_email', 'paid_key',
        'paid_at', 'refunded_at', 'cancelled_at', 'anonymized_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'anonymized_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (Order $order) {
            $order->forceFill(['reference' => sprintf('RA-%06d', $order->id)])->saveQuietly();
        });
    }

    public static function paidKey(int $resourceItemId, string $email): string
    {
        return $resourceItemId.':'.self::normalizeEmail($email);
    }

    public static function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    /** @return BelongsTo<ResourceItem, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(ResourceItem::class, 'resource_item_id');
    }

    /** @return BelongsTo<ResourceRequest, $this> */
    public function resourceRequest(): BelongsTo
    {
        return $this->belongsTo(ResourceRequest::class);
    }

    /** @return HasMany<PaymentTransaction, $this> */
    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class)->orderBy('id');
    }

    public function isPaid(): bool
    {
        return $this->status === self::PAID;
    }

    public function formattedAmount(): string
    {
        return Money::format($this->amount_cents, $this->currency);
    }

    public function buyerName(): ?string
    {
        return $this->resourceRequest->name ?? $this->payer_name;
    }

    /**
     * Breaks the link to the buyer's identity while keeping the amounts and
     * transaction history for accounting — the same "forget me" approach as
     * Lead and ResourceRequest (see docs/data-subject-requests.md).
     */
    public function anonymize(): void
    {
        $this->update([
            'email' => 'anonymized-'.$this->id.'@example.invalid',
            'payer_name' => null,
            'payer_email' => null,
            'paid_key' => $this->paid_key === null ? null : 'anonymized:'.$this->id,
            'anonymized_at' => now(),
        ]);

        if ($this->resourceRequest && $this->resourceRequest->anonymized_at === null) {
            $this->resourceRequest->anonymize();
        }
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'reference' => $this->reference ?? '',
            'resourceTitle' => $this->item->title ?? 'Deleted resource',
            'buyerName' => $this->buyerName() ?? '',
            'email' => $this->email,
            'company' => $this->resourceRequest->company ?? '',
            'payerName' => $this->payer_name ?? '',
            'payerEmail' => $this->payer_email ?? '',
            'amountCents' => $this->amount_cents,
            'amount' => $this->formattedAmount(),
            'status' => $this->status,
            'gateway' => $this->gateway,
            'gatewayOrderId' => $this->gateway_order_id ?? '',
            'date' => $this->created_at?->toIso8601String() ?? '',
            'paidAt' => $this->paid_at?->toIso8601String(),
            'refundedAt' => $this->refunded_at?->toIso8601String(),
            'anonymized' => $this->anonymized_at !== null,
            'transactions' => $this->transactions->map(fn (PaymentTransaction $transaction) => $transaction->adminData())->values()->all(),
        ];
    }
}
