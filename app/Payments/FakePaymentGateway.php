<?php

namespace App\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Payments\Contracts\PaymentGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Stands in for PayPal until credentials exist. Checkout goes to a clearly
 * labelled test payment page, and captures/refunds always succeed, so the
 * whole order, ledger and email flow can be exercised end to end. Never
 * enabled in production.
 */
class FakePaymentGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'fake';
    }

    public function purchasingEnabled(): bool
    {
        return ! app()->isProduction();
    }

    public function createOrder(Order $order): CheckoutSession
    {
        return new CheckoutSession(
            gatewayOrderId: 'FAKE-'.Str::upper(Str::random(12)),
            redirectUrl: URL::temporarySignedRoute('checkout.test', now()->addHour(), ['order' => $order->id]),
        );
    }

    public function capture(Order $order): GatewayResult
    {
        $request = $order->resourceRequest;

        return new GatewayResult(
            successful: true,
            transactionId: 'FAKE-CAP-'.Str::upper(Str::random(10)),
            payerName: $request?->name,
            payerEmail: $order->email,
            payload: ['simulated' => true],
        );
    }

    public function refund(Order $order, PaymentTransaction $capture, ?string $reason): GatewayResult
    {
        return new GatewayResult(
            successful: true,
            transactionId: 'FAKE-REF-'.Str::upper(Str::random(10)),
            payload: ['simulated' => true, 'capture_id' => $capture->gateway_transaction_id],
        );
    }

    public function verifyWebhook(Request $request): bool
    {
        return false;
    }
}
