<?php

namespace App\Http\Controllers;

use App\Http\Requests\RequestResourceAccessRequest;
use App\Models\Order;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Payments\Contracts\PaymentGateway;
use App\Services\AnalyticsRecorder;
use App\Services\ResourcePurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ResourcePurchaseController extends Controller
{
    public function __construct(private readonly ResourcePurchaseService $purchases) {}

    public function store(RequestResourceAccessRequest $request, PaymentGateway $gateway, string $category, ResourceItem $item): Response
    {
        $this->ensureForSale($category, $item);

        if (! $gateway->purchasingEnabled()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('This resource is not available to buy yet.')]);

            return back();
        }

        /** @var array{first_name: string, last_name: string, email: string, company?: string|null} $buyer */
        $buyer = $request->validated();
        $checkoutUrl = $this->purchases->start($item, $buyer);

        if ($checkoutUrl === null) {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => __('Check :email for a link to access :title.', ['email' => $buyer['email'], 'title' => $item->title]),
            ]);

            return back();
        }

        return Inertia::location($checkoutUrl);
    }

    public function resend(Request $request, string $category, ResourceItem $item): RedirectResponse
    {
        $this->ensureForSale($category, $item);
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);

        $this->purchases->resendForEmail($item, $data['email']);

        // The same message whether or not this email bought the resource, so
        // the form can't be used to find out who has.
        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('If :email has bought :title, we\'ve emailed a new access link.', ['email' => $data['email'], 'title' => $item->title]),
        ]);

        return back();
    }

    public function access(Request $request, Order $order, AnalyticsRecorder $recorder): Response
    {
        $item = $order->item;
        abort_unless($order->isPaid() && $item !== null, 403);

        $recorder->record($request, [
            'event_type' => 'resource_download',
            'label' => $item->title,
            'resource_item_id' => $item->id,
        ]);

        if ($file = $item->file) {
            return Storage::disk($file->disk)->download($file->file_path, $file->file_name);
        }

        abort_unless(filled($item->external_url), 404);

        return redirect()->away((string) $item->external_url);
    }

    private function ensureForSale(string $category, ResourceItem $item): void
    {
        $categoryId = ResourceCategory::query()->where('slug', $category)->value('id');

        abort_unless(
            $item->isPaid() && $item->price_cents !== null && $item->status === 'published' && $item->resource_category_id === $categoryId,
            404,
        );
    }
}
