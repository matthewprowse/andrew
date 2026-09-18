<?php

namespace App\Services;

use App\Mail\ResourcePurchaseAccess;
use App\Mail\ResourceRefundNotice;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Payments\Contracts\PaymentGateway;
use App\Payments\GatewayResult;
use App\Payments\PaymentException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

/**
 * Everything that happens to an order: starting checkout, confirming
 * payment, refunds, cancellations and access links. Provider calls go
 * through PaymentGateway only.
 */
class ResourcePurchaseService
{
    public const COMPLETED = 'completed';

    public const ALREADY_PAID = 'already_paid';

    public const FAILED = 'failed';

    public const NOT_PENDING = 'not_pending';

    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly AnalyticsRecorder $analytics,
    ) {}

    /**
     * Records the buyer's details and either resends access (this email has
     * already paid for the resource) or starts checkout.
     *
     * @param  array{first_name: string, last_name: string, email: string, company?: string|null}  $buyer
     * @return string|null The checkout URL, or null when the access link was resent instead.
     */
    public function start(ResourceItem $item, array $buyer): ?string
    {
        if (! $item->isPaid() || $item->price_cents === null) {
            throw new PaymentException('This resource is not for sale.');
        }

        $email = Order::normalizeEmail($buyer['email']);

        $resourceRequest = ResourceRequest::create([
            'resource_item_id' => $item->id,
            'first_name' => $buyer['first_name'],
            'last_name' => $buyer['last_name'],
            'name' => trim($buyer['first_name'].' '.$buyer['last_name']),
            'email' => $email,
            'company' => $buyer['company'] ?? null,
            'consent_given_at' => now(),
            'submitted_at' => now(),
        ]);

        if ($existing = $this->paidOrderFor($item, $email)) {
            $this->sendAccessLink($existing, resent: true);

            return null;
        }

        $order = Order::create([
            'resource_item_id' => $item->id,
            'resource_request_id' => $resourceRequest->id,
            'email' => $email,
            'amount_cents' => $item->price_cents,
            'currency' => $item->currency,
            'status' => Order::PENDING,
            'gateway' => $this->gateway->name(),
        ]);

        $session = $this->gateway->createOrder($order);
        $order->update(['gateway_order_id' => $session->gatewayOrderId]);

        return $session->redirectUrl;
    }

    public function paidOrderFor(ResourceItem $item, string $email): ?Order
    {
        return Order::query()->where('paid_key', Order::paidKey($item->id, $email))->first();
    }

    /**
     * Captures payment for a pending order. Only a capture the provider
     * confirms marks the order paid — never the buyer's return redirect
     * alone.
     *
     * @return self::COMPLETED|self::ALREADY_PAID|self::FAILED|self::NOT_PENDING
     */
    public function complete(Order $order, Request $request): string
    {
        [$outcome, $order] = DB::transaction(function () use ($order): array {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->status !== Order::PENDING) {
                return [self::NOT_PENDING, $order];
            }

            $paidKey = Order::paidKey((int) $order->resource_item_id, $order->email);

            // Paid for in another tab while this checkout was open: cancel
            // this one before capturing so the buyer is never charged twice.
            if (Order::query()->where('paid_key', $paidKey)->exists()) {
                $order->update(['status' => Order::CANCELLED, 'cancelled_at' => now()]);

                return [self::ALREADY_PAID, $order];
            }

            $result = $this->gateway->capture($order);
            $this->recordTransaction($order, PaymentTransaction::CAPTURE, $result);

            if (! $result->successful) {
                return [self::FAILED, $order];
            }

            $order->update([
                'status' => Order::PAID,
                'paid_at' => now(),
                'paid_key' => $paidKey,
                'payer_name' => $result->payerName,
                'payer_email' => $result->payerEmail,
            ]);

            return [self::COMPLETED, $order];
        });

        if ($outcome === self::COMPLETED) {
            $this->sendAccessLink($order);
            $this->analytics->record($request, [
                'event_type' => 'resource_purchase',
                'label' => $order->item?->title,
                'resource_item_id' => $order->resource_item_id,
            ]);
        }

        if ($outcome === self::ALREADY_PAID && $order->item && ($existing = $this->paidOrderFor($order->item, $order->email))) {
            $this->sendAccessLink($existing, resent: true);
        }

        return $outcome;
    }

    public function cancel(Order $order): void
    {
        Order::query()->whereKey($order->id)->where('status', Order::PENDING)
            ->update(['status' => Order::CANCELLED, 'cancelled_at' => now()]);
    }

    /**
     * Refunds a paid order in full and ends access immediately. The attempt
     * is recorded on the ledger whether or not the provider accepts it.
     *
     * @throws PaymentException
     */
    public function refund(Order $order, ?string $reason): void
    {
        [$order, $result] = DB::transaction(function () use ($order, $reason): array {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->status !== Order::PAID) {
                throw new PaymentException('Only paid orders can be refunded.');
            }

            $capture = $order->transactions()
                ->where('type', PaymentTransaction::CAPTURE)
                ->where('status', PaymentTransaction::COMPLETED)
                ->latest('id')
                ->first();

            if (! $capture) {
                throw new PaymentException('This order has no completed payment to refund.');
            }

            $result = $this->gateway->refund($order, $capture, $reason);
            $this->recordTransaction($order, PaymentTransaction::REFUND, $result, $reason);

            if ($result->successful) {
                $order->update([
                    'status' => Order::REFUNDED,
                    'refunded_at' => now(),
                    'paid_key' => null,
                ]);
            }

            return [$order, $result];
        });

        if (! $result->successful) {
            throw new PaymentException($result->message ?? 'The refund could not be completed.');
        }

        AuditLog::record('refunded', 'order', $order->id, [
            'reference' => $order->reference,
            'amount_cents' => $order->amount_cents,
            'reason' => $reason,
        ]);

        if ($order->anonymized_at === null) {
            Mail::to($order->email)->send(new ResourceRefundNotice($order));
        }
    }

    /** Emails a buyer with paid access for this resource a fresh link. Silent otherwise. */
    public function resendForEmail(ResourceItem $item, string $email): void
    {
        if ($order = $this->paidOrderFor($item, $email)) {
            $this->sendAccessLink($order, resent: true);
        }
    }

    public function sendAccessLink(Order $order, bool $resent = false): void
    {
        Mail::to($order->email)->send(new ResourcePurchaseAccess($order, $this->accessUrl($order), $resent));
    }

    public function accessUrl(Order $order): string
    {
        return URL::temporarySignedRoute(
            'resources.purchase.access',
            now()->addDays((int) config('payments.access_link_days')),
            ['order' => $order->id],
        );
    }

    private function recordTransaction(Order $order, string $type, GatewayResult $result, ?string $reason = null): void
    {
        PaymentTransaction::create([
            'order_id' => $order->id,
            'type' => $type,
            'status' => $result->successful ? PaymentTransaction::COMPLETED : PaymentTransaction::FAILED,
            'amount_cents' => $order->amount_cents,
            'currency' => $order->currency,
            'gateway' => $this->gateway->name(),
            'gateway_transaction_id' => $result->transactionId,
            'reason' => $reason,
            'actor_id' => Auth::id(),
            'payload' => $result->payload + ($result->message ? ['message' => $result->message] : []),
        ]);
    }
}
