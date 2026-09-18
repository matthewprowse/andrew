<?php

namespace App\Models;

use App\Support\Money;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One money movement against an order. Append-only: never updated or
 * deleted once written.
 *
 * @property int $amount_cents
 * @property string $currency
 * @property string $type
 * @property string $status
 */
class PaymentTransaction extends Model
{
    public const UPDATED_AT = null;

    public const CAPTURE = 'capture';

    public const REFUND = 'refund';

    public const COMPLETED = 'completed';

    public const FAILED = 'failed';

    protected $fillable = [
        'order_id', 'type', 'status', 'amount_cents', 'currency', 'gateway',
        'gateway_transaction_id', 'reason', 'actor_id', 'payload',
    ];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'payload' => 'array', 'created_at' => 'datetime'];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'type' => $this->type,
            'status' => $this->status,
            'amount' => Money::format($this->amount_cents, $this->currency),
            'gatewayTransactionId' => $this->gateway_transaction_id ?? '',
            'reason' => $this->reason ?? '',
            'actorName' => $this->actor?->name,
            'date' => $this->created_at?->toIso8601String() ?? '',
        ];
    }
}
