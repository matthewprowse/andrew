<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Payments\Contracts\PaymentGateway;
use App\Services\ResourcePurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The fake gateway's stand-in for PayPal's checkout page. Every route here
 * is signed and only exists while the fake driver is active outside
 * production.
 */
class TestCheckoutController extends Controller
{
    public const OUTCOMES = [
        ResourcePurchaseService::COMPLETED,
        ResourcePurchaseService::ALREADY_PAID,
        ResourcePurchaseService::FAILED,
        ResourcePurchaseService::NOT_PENDING,
        'cancelled',
    ];

    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly ResourcePurchaseService $purchases,
    ) {}

    public function show(Order $order): Response|RedirectResponse
    {
        $this->ensureTestMode();

        if ($order->status !== Order::PENDING) {
            return redirect($this->resultUrl($order, ResourcePurchaseService::NOT_PENDING));
        }

        return Inertia::render('checkout', [
            ...$this->summary($order),
            'mode' => 'test',
            'payUrl' => URL::temporarySignedRoute('checkout.test.pay', now()->addHour(), ['order' => $order->id]),
            'cancelUrl' => URL::temporarySignedRoute('checkout.test.cancel', now()->addHour(), ['order' => $order->id]),
        ]);
    }

    public function pay(Request $request, Order $order): RedirectResponse
    {
        $this->ensureTestMode();

        return redirect($this->resultUrl($order, $this->purchases->complete($order, $request)));
    }

    public function cancel(Order $order): RedirectResponse
    {
        $this->ensureTestMode();
        $this->purchases->cancel($order);

        return redirect($this->resultUrl($order, 'cancelled'));
    }

    public function result(Request $request, Order $order): Response
    {
        $outcome = $request->string('outcome')->toString();
        abort_unless(in_array($outcome, self::OUTCOMES, true), 404);

        return Inertia::render('checkout', [
            ...$this->summary($order->refresh()),
            'mode' => 'result',
            'outcome' => $outcome,
        ]);
    }

    private function resultUrl(Order $order, string $outcome): string
    {
        return URL::temporarySignedRoute('checkout.result', now()->addHour(), ['order' => $order->id, 'outcome' => $outcome]);
    }

    /** @return array<string, mixed> */
    private function summary(Order $order): array
    {
        $item = $order->item;

        return [
            'order' => [
                'reference' => $order->reference,
                'status' => $order->status,
                'amount' => $order->formattedAmount(),
                'email' => $order->email,
                'resourceTitle' => $item->title ?? 'Resource',
                'resourceUrl' => $item?->category ? '/resources/'.$item->category->slug : '/resources',
            ],
        ];
    }

    private function ensureTestMode(): void
    {
        abort_unless($this->gateway->name() === 'fake' && $this->gateway->purchasingEnabled(), 404);
    }
}
