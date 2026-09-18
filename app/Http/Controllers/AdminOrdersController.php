<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\ResourceRequest;
use App\Payments\PaymentException;
use App\Services\ResourcePurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminOrdersController extends Controller
{
    public function __construct(private readonly ResourcePurchaseService $purchases) {}

    public function index(): Response
    {
        return Inertia::render('admin/orders/index', [
            'orders' => Order::query()
                ->with(['item', 'resourceRequest', 'transactions.actor'])
                ->orderByDesc('created_at')->orderByDesc('id')
                ->get()
                ->map(fn (Order $order) => $order->adminData()),
            'resourceRequests' => ResourceRequest::with('item')
                ->whereNull('anonymized_at')
                ->orderByDesc('submitted_at')
                ->get()
                ->map(fn (ResourceRequest $resourceRequest) => $resourceRequest->adminData()),
        ]);
    }

    public function resend(Order $order): RedirectResponse
    {
        if (! $order->isPaid() || $order->anonymized_at !== null) {
            return back()->withErrors(['order' => 'Access links can only be sent for paid orders.']);
        }

        $this->purchases->sendAccessLink($order, resent: true);
        AuditLog::record('access_link_sent', 'order', $order->id, ['reference' => $order->reference]);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Access link sent to :email.', ['email' => $order->email])]);

        return to_route('admin.orders');
    }

    public function refund(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        try {
            $this->purchases->refund($order, $data['reason'] ?? null);
        } catch (PaymentException $exception) {
            return back()->withErrors(['order' => $exception->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Order :reference refunded.', ['reference' => $order->reference])]);

        return to_route('admin.orders');
    }

    public function forget(Order $order): RedirectResponse
    {
        if ($order->anonymized_at === null) {
            $order->anonymize();
            AuditLog::record('anonymized', 'order', $order->id, ['reference' => $order->reference]);
        }

        return to_route('admin.orders');
    }

    public function forgetResourceRequest(ResourceRequest $resourceRequest): RedirectResponse
    {
        if ($resourceRequest->anonymized_at === null) {
            $resourceRequest->anonymize();
            AuditLog::record('anonymized', 'resource_request', $resourceRequest->id, ['resource' => $resourceRequest->item?->title]);
        }

        return to_route('admin.orders');
    }
}
