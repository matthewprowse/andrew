<?php

namespace App\Payments\Contracts;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Payments\CheckoutSession;
use App\Payments\GatewayResult;
use Illuminate\Http\Request;

/**
 * The one seam between the purchase flow and a payment provider. The fake
 * gateway implements it today; PayPalGateway implements it once the client's
 * credentials are available. Nothing outside App\Payments talks to a
 * provider directly.
 */
interface PaymentGateway
{
    /** Stored on each order and transaction, e.g. "fake" or "paypal". */
    public function name(): string;

    /** Whether visitors can currently buy paid resources. */
    public function purchasingEnabled(): bool;

    /** Creates the provider-side order and returns where to send the buyer. */
    public function createOrder(Order $order): CheckoutSession;

    /** Captures an approved order's payment. */
    public function capture(Order $order): GatewayResult;

    /** Refunds a completed capture in full. */
    public function refund(Order $order, PaymentTransaction $capture, ?string $reason): GatewayResult;

    /** Confirms an incoming webhook really came from the provider. */
    public function verifyWebhook(Request $request): bool;
}
