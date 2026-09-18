<?php

namespace App\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Payments\Contracts\PaymentGateway;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * PayPal Orders API v2 — to be implemented once the client's credentials
 * are available (config/payments.php → paypal). Until then purchasing stays
 * off, so none of the methods below can be reached from the public site.
 *
 * Implementation notes:
 * - createOrder: POST /v2/checkout/orders (intent CAPTURE, amount in USD),
 *   return the "approve" link as the redirect URL.
 * - capture: POST /v2/checkout/orders/{id}/capture on the buyer's return;
 *   only a COMPLETED capture counts as paid.
 * - refund: POST /v2/payments/captures/{capture_id}/refund.
 * - verifyWebhook: POST /v1/notifications/verify-webhook-signature using
 *   PAYPAL_WEBHOOK_ID; handle PAYMENT.CAPTURE.COMPLETED and
 *   PAYMENT.CAPTURE.REFUNDED.
 */
class PayPalGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'paypal';
    }

    public function purchasingEnabled(): bool
    {
        return false;
    }

    public function createOrder(Order $order): CheckoutSession
    {
        throw $this->notConfigured();
    }

    public function capture(Order $order): GatewayResult
    {
        throw $this->notConfigured();
    }

    public function refund(Order $order, PaymentTransaction $capture, ?string $reason): GatewayResult
    {
        return GatewayResult::failed('PayPal refunds are not connected yet. Refund this order in PayPal directly.');
    }

    public function verifyWebhook(Request $request): bool
    {
        return false;
    }

    private function notConfigured(): RuntimeException
    {
        return new RuntimeException('PayPal is not connected yet.');
    }
}
