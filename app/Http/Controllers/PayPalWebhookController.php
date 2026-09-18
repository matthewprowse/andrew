<?php

namespace App\Http\Controllers;

use App\Payments\Contracts\PaymentGateway;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Receives PayPal webhooks (PAYMENT.CAPTURE.COMPLETED / REFUNDED). Rejects
 * everything until PayPalGateway can verify signatures — see
 * App\Payments\PayPalGateway for what to implement.
 */
class PayPalWebhookController extends Controller
{
    public function __invoke(Request $request, PaymentGateway $gateway): Response
    {
        abort_unless($gateway->name() === 'paypal' && $gateway->verifyWebhook($request), 400);

        return response()->noContent();
    }
}
