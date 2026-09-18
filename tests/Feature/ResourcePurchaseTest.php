<?php

namespace Tests\Feature;

use App\Mail\ResourcePurchaseAccess;
use App\Models\AnalyticsEvent;
use App\Models\Media;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Payments\Contracts\PaymentGateway;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Support\SessionKey;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ResourcePurchaseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake('public');
        Storage::fake('local');
        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (Macintosh)']);
    }

    private function paidItem(array $overrides = []): ResourceItem
    {
        $category = ResourceCategory::firstOrCreate(['slug' => 'books'], ['title' => 'Books', 'layout' => 'list']);
        Storage::disk('local')->put('media/guide.pdf', 'PDF-CONTENT');
        $media = Media::create(['file_name' => 'guide.pdf', 'file_path' => 'media/guide.pdf', 'disk' => 'local', 'mime_type' => 'application/pdf', 'size' => 11, 'kind' => 'document']);

        return ResourceItem::create([
            'resource_category_id' => $category->id, 'title' => 'Relocation Handbook', 'file_media_id' => $media->id,
            'access_type' => 'paid', 'price_cents' => 2500, 'status' => 'published', 'sort_order' => 1,
            ...$overrides,
        ]);
    }

    /** @return array<string, mixed> */
    private function buyer(string $email = 'Buyer@Example.com'): array
    {
        return ['first_name' => 'Ada', 'last_name' => 'Lovelace', 'email' => $email, 'company' => 'Acme', 'consent' => true];
    }

    private function startPurchase(ResourceItem $item, string $email = 'Buyer@Example.com'): string
    {
        $response = $this->post("/resources/books/{$item->id}/purchase", $this->buyer($email))->assertRedirect();

        return (string) $response->headers->get('Location');
    }

    private function pay(Order $order): void
    {
        $this->post(URL::temporarySignedRoute('checkout.test.pay', now()->addHour(), ['order' => $order->id]))->assertRedirect();
    }

    public function test_paid_items_show_a_price_but_never_a_download_link(): void
    {
        $this->paidItem();

        $this->get('/resources/books')->assertInertia(fn (Assert $page) => $page
            ->where('items.0.accessType', 'paid')
            ->where('items.0.formattedPrice', 'US$25.00')
            ->where('items.0.priceCents', 2500)
            ->where('items.0.purchasable', true)
            ->where('items.0.fileUrl', '')
            ->where('items.0.externalUrl', ''));
    }

    public function test_buying_creates_a_pending_order_and_opens_the_test_checkout(): void
    {
        $item = $this->paidItem();
        $checkoutUrl = $this->startPurchase($item);

        $order = Order::sole();
        $this->assertSame(Order::PENDING, $order->status);
        $this->assertSame('buyer@example.com', $order->email);
        $this->assertSame(2500, $order->amount_cents);
        $this->assertSame('USD', $order->currency);
        $this->assertSame('fake', $order->gateway);
        $this->assertSame(sprintf('RA-%06d', $order->id), $order->reference);
        $this->assertNotNull($order->gateway_order_id);
        $this->assertSame('Acme', ResourceRequest::sole()->company);
        $this->assertStringContainsString("/checkout/{$order->id}/test", $checkoutUrl);

        $this->get($checkoutUrl)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('checkout')->where('mode', 'test')->where('order.amount', 'US$25.00')
            ->has('payUrl')->has('cancelUrl'));
        Mail::assertNothingSent();
    }

    public function test_paying_marks_the_order_paid_records_the_capture_and_emails_the_link(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $order = Order::sole();

        $this->pay($order);

        $order->refresh();
        $this->assertSame(Order::PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(Order::paidKey($item->id, 'buyer@example.com'), $order->paid_key);
        $capture = PaymentTransaction::sole();
        $this->assertSame([PaymentTransaction::CAPTURE, PaymentTransaction::COMPLETED, 2500], [$capture->type, $capture->status, $capture->amount_cents]);
        Mail::assertSent(ResourcePurchaseAccess::class, fn (ResourcePurchaseAccess $mail) => $mail->hasTo('buyer@example.com') && ! $mail->resent);
        $this->assertSame(1, AnalyticsEvent::where('event_type', 'resource_purchase')->count());
    }

    public function test_the_result_page_confirms_payment(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $order = Order::sole();

        $response = $this->post(URL::temporarySignedRoute('checkout.test.pay', now()->addHour(), ['order' => $order->id]));
        $this->get((string) $response->headers->get('Location'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('checkout')->where('mode', 'result')->where('outcome', 'completed')->where('order.status', 'paid'));
    }

    public function test_an_email_that_already_paid_gets_a_new_link_instead_of_a_second_charge(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $this->pay(Order::sole());

        $this->post("/resources/books/{$item->id}/purchase", $this->buyer('  BUYER@example.com '))
            ->assertRedirect()->assertSessionMissing('errors');

        $this->assertSame(1, Order::count());
        $this->assertSame(1, PaymentTransaction::count());
        Mail::assertSent(ResourcePurchaseAccess::class, fn (ResourcePurchaseAccess $mail) => $mail->resent);
    }

    public function test_a_second_open_checkout_is_cancelled_instead_of_charged(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $this->startPurchase($item);
        [$first, $second] = Order::orderBy('id')->get()->all();

        $this->pay($first);
        $response = $this->post(URL::temporarySignedRoute('checkout.test.pay', now()->addHour(), ['order' => $second->id]));

        $this->assertStringContainsString('outcome=already_paid', (string) $response->headers->get('Location'));
        $this->assertSame(Order::CANCELLED, $second->refresh()->status);
        $this->assertSame(1, PaymentTransaction::count());
    }

    public function test_a_cancelled_checkout_cannot_be_paid(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $order = Order::sole();

        $this->post(URL::temporarySignedRoute('checkout.test.cancel', now()->addHour(), ['order' => $order->id]))->assertRedirect();
        $this->assertSame(Order::CANCELLED, $order->refresh()->status);

        $response = $this->post(URL::temporarySignedRoute('checkout.test.pay', now()->addHour(), ['order' => $order->id]));
        $this->assertStringContainsString('outcome=not_pending', (string) $response->headers->get('Location'));
        $this->assertSame(0, PaymentTransaction::count());
        Mail::assertNothingSent();
    }

    public function test_checkout_routes_require_a_valid_signature(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $order = Order::sole();

        $this->get("/checkout/{$order->id}/test")->assertForbidden();
        $this->post("/checkout/{$order->id}/test/pay")->assertForbidden();
        $this->assertSame(Order::PENDING, $order->refresh()->status);
    }

    public function test_the_emailed_link_downloads_the_private_file_only_while_the_order_is_paid(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $order = Order::sole();
        $this->pay($order);

        $link = URL::temporarySignedRoute('resources.purchase.access', now()->addDays(7), ['order' => $order->id]);
        $response = $this->get($link)->assertOk();
        $this->assertSame('PDF-CONTENT', $response->streamedContent());

        $this->get("/resources/access/order/{$order->id}")->assertForbidden();
        $this->travel(8)->days();
        $this->get($link)->assertForbidden();
        $this->travelBack();

        $order->update(['status' => Order::REFUNDED, 'paid_key' => null]);
        $this->get($link)->assertForbidden();
    }

    public function test_pending_orders_cannot_download(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $order = Order::sole();

        $this->get(URL::temporarySignedRoute('resources.purchase.access', now()->addDay(), ['order' => $order->id]))->assertForbidden();
    }

    public function test_resend_gives_the_same_answer_whether_or_not_the_email_bought_it(): void
    {
        $item = $this->paidItem();
        $this->startPurchase($item);
        $this->pay(Order::sole());
        Mail::fake();

        $this->post("/resources/books/{$item->id}/resend-access", ['email' => 'stranger@example.com'])->assertRedirect();
        $strangerMessage = session(SessionKey::FLASH_DATA)['toast']['message'] ?? null;
        Mail::assertNothingSent();

        $this->post("/resources/books/{$item->id}/resend-access", ['email' => 'buyer@example.com'])->assertRedirect();
        $ownerMessage = session(SessionKey::FLASH_DATA)['toast']['message'] ?? null;
        Mail::assertSent(ResourcePurchaseAccess::class, 1);

        $this->assertNotNull($strangerMessage);
        $this->assertSame(str_replace('stranger@', 'buyer@', $strangerMessage), $ownerMessage);
    }

    public function test_only_published_paid_items_in_the_right_category_can_be_bought(): void
    {
        $item = $this->paidItem(['status' => 'draft']);
        $this->post("/resources/books/{$item->id}/purchase", $this->buyer())->assertNotFound();

        $item->update(['status' => 'published', 'access_type' => 'email']);
        $this->post("/resources/books/{$item->id}/purchase", $this->buyer())->assertNotFound();

        $item->update(['access_type' => 'paid']);
        $this->post("/resources/webinars/{$item->id}/purchase", $this->buyer())->assertNotFound();

        $this->assertSame(0, Order::count());
    }

    public function test_the_buyer_form_is_validated(): void
    {
        $item = $this->paidItem();

        $this->post("/resources/books/{$item->id}/purchase", ['email' => 'not-an-email'])
            ->assertSessionHasErrors(['first_name', 'last_name', 'email', 'consent']);
        $this->assertSame(0, Order::count());
    }

    public function test_email_verification_links_never_unlock_paid_items(): void
    {
        $item = $this->paidItem();

        $this->post("/resources/books/{$item->id}/request-access", $this->buyer())->assertNotFound();

        $request = ResourceRequest::create(['resource_item_id' => $item->id, 'email' => 'x@example.com', 'submitted_at' => now()]);
        $this->get(URL::temporarySignedRoute('resources.access.verify', now()->addHour(), ['resourceRequest' => $request->id]))->assertForbidden();
    }

    public function test_purchasing_is_switched_off_in_production_with_the_fake_gateway(): void
    {
        $item = $this->paidItem();
        $this->app->detectEnvironment(fn () => 'production');
        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->get('/resources/books')->assertInertia(fn (Assert $page) => $page
            ->where('items.0.purchasable', false)
            ->where('items.0.formattedPrice', 'US$25.00'));

        $this->post("/resources/books/{$item->id}/purchase", $this->buyer())->assertRedirect();
        $this->assertSame(0, Order::count());

        $order = Order::create(['resource_item_id' => $item->id, 'email' => 'a@example.com', 'amount_cents' => 2500, 'currency' => 'USD', 'gateway' => 'fake']);
        $this->get(URL::temporarySignedRoute('checkout.test', now()->addHour(), ['order' => $order->id]))->assertNotFound();
    }

    public function test_purchasing_is_off_while_the_paypal_driver_is_not_implemented(): void
    {
        config(['payments.driver' => 'paypal']);
        $this->app->forgetInstance(PaymentGateway::class);
        $item = $this->paidItem();

        $this->get('/resources/books')->assertInertia(fn (Assert $page) => $page->where('items.0.purchasable', false));
        $this->post("/resources/books/{$item->id}/purchase", $this->buyer())->assertRedirect();
        $this->assertSame(0, Order::count());
    }

    public function test_the_paypal_webhook_rejects_unverified_requests_without_a_csrf_token(): void
    {
        // CSRF is only enforced outside the testing environment.
        $this->app->detectEnvironment(fn () => 'production');

        $this->postJson('/webhooks/paypal', ['event_type' => 'PAYMENT.CAPTURE.COMPLETED'])->assertStatus(400);
        $this->postJson('/contact', [])->assertStatus(419);
    }
}
