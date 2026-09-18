<?php

namespace Tests\Feature;

use App\Mail\ResourcePurchaseAccess;
use App\Mail\ResourceRefundNotice;
use App\Models\AuditLog;
use App\Models\Media;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Models\Role;
use App\Models\User;
use App\Payments\Contracts\PaymentGateway;
use App\Payments\FakePaymentGateway;
use App\Payments\GatewayResult;
use App\Services\ResourcePurchaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrdersAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function staff(): User
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);

        return $user;
    }

    /** @param  array<string, bool>  $abilities */
    private function ordersRole(array $abilities): void
    {
        $role = Role::create(['name' => 'Orders '.implode('-', array_keys(array_filter($abilities))), 'permissions' => [
            'orders' => ['view' => false, 'edit' => false, 'delete' => false, ...$abilities],
        ]]);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
    }

    private function paidOrder(): Order
    {
        $category = ResourceCategory::firstOrCreate(['slug' => 'books'], ['title' => 'Books', 'layout' => 'list']);
        $item = ResourceItem::create([
            'resource_category_id' => $category->id, 'title' => 'Relocation Handbook', 'external_url' => 'https://example.com/book',
            'access_type' => 'paid', 'price_cents' => 4900, 'status' => 'published', 'sort_order' => 1,
        ]);
        $request = ResourceRequest::create(['resource_item_id' => $item->id, 'name' => 'Ada Lovelace', 'email' => 'ada@example.com', 'submitted_at' => now()]);
        $order = Order::create([
            'resource_item_id' => $item->id, 'resource_request_id' => $request->id, 'email' => 'ada@example.com',
            'amount_cents' => 4900, 'currency' => 'USD', 'status' => Order::PENDING, 'gateway' => 'fake',
        ]);
        app(ResourcePurchaseService::class)->complete($order, Request::create('/'));
        Mail::fake();

        return $order->refresh();
    }

    public function test_orders_are_listed_for_viewers_only(): void
    {
        $order = $this->paidOrder();

        $this->get('/admin/orders')->assertRedirect('/login');

        $this->ordersRole(['view' => false]);
        $this->get('/admin/orders')->assertForbidden();

        $this->ordersRole(['view' => true]);
        $this->get('/admin/orders')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/orders/index')
            ->has('orders', 1)
            ->where('orders.0.reference', $order->reference)
            ->where('orders.0.amount', 'US$49.00')
            ->where('orders.0.status', 'paid')
            ->where('orders.0.buyerName', 'Ada Lovelace')
            ->has('orders.0.transactions', 1));
    }

    public function test_orders_permission_is_available_to_roles(): void
    {
        $this->assertArrayHasKey('orders', config('admin.sections'));
    }

    public function test_refunding_ends_access_records_the_refund_and_emails_the_buyer(): void
    {
        $order = $this->paidOrder();
        $admin = $this->staff();

        $this->post("/admin/orders/{$order->id}/refund", ['reason' => 'Bought by mistake'])->assertRedirect('/admin/orders');

        $order->refresh();
        $this->assertSame(Order::REFUNDED, $order->status);
        $this->assertNotNull($order->refunded_at);
        $this->assertNull($order->paid_key);
        $refund = PaymentTransaction::where('type', 'refund')->sole();
        $this->assertSame([PaymentTransaction::COMPLETED, 4900, 'Bought by mistake', $admin->id], [$refund->status, $refund->amount_cents, $refund->reason, $refund->actor_id]);
        Mail::assertSent(ResourceRefundNotice::class, fn (ResourceRefundNotice $mail) => $mail->hasTo('ada@example.com'));
        $this->assertTrue(AuditLog::where('action', 'refunded')->where('subject_id', $order->id)->exists());

        $link = URL::temporarySignedRoute('resources.purchase.access', now()->addDay(), ['order' => $order->id]);
        $this->get($link)->assertForbidden();
    }

    public function test_a_refunded_buyer_can_buy_again(): void
    {
        $order = $this->paidOrder();
        $this->staff();
        $this->post("/admin/orders/{$order->id}/refund")->assertRedirect();
        auth()->logout();

        $this->post("/resources/books/{$order->resource_item_id}/purchase", [
            'first_name' => 'Ada', 'last_name' => 'Lovelace', 'email' => 'ada@example.com', 'consent' => true,
        ])->assertRedirect();

        $this->assertSame(2, Order::count());
        $this->assertSame(Order::PENDING, Order::latest('id')->first()->status);
    }

    public function test_only_paid_orders_can_be_refunded_and_only_once(): void
    {
        $order = $this->paidOrder();
        $this->staff();

        $this->post("/admin/orders/{$order->id}/refund")->assertRedirect('/admin/orders');
        $this->post("/admin/orders/{$order->id}/refund")->assertSessionHasErrors('order');

        $this->assertSame(1, PaymentTransaction::where('type', 'refund')->count());
    }

    public function test_a_declined_refund_is_recorded_and_the_order_stays_paid(): void
    {
        $order = $this->paidOrder();
        $this->app->instance(PaymentGateway::class, new class extends FakePaymentGateway
        {
            public function refund(Order $order, PaymentTransaction $capture, ?string $reason): GatewayResult
            {
                return GatewayResult::failed('Refund window has closed.');
            }
        });
        $this->staff();

        $this->post("/admin/orders/{$order->id}/refund")->assertSessionHasErrors(['order' => 'Refund window has closed.']);

        $this->assertSame(Order::PAID, $order->refresh()->status);
        $this->assertSame(PaymentTransaction::FAILED, PaymentTransaction::where('type', 'refund')->sole()->status);
        Mail::assertNothingSent();
    }

    public function test_refunds_need_delete_permission_and_resends_need_edit(): void
    {
        $order = $this->paidOrder();

        $this->ordersRole(['view' => true, 'edit' => true]);
        $this->post("/admin/orders/{$order->id}/refund")->assertForbidden();
        $this->patch("/admin/orders/{$order->id}/forget")->assertForbidden();
        $this->post("/admin/orders/{$order->id}/resend")->assertRedirect('/admin/orders');
        Mail::assertSent(ResourcePurchaseAccess::class, fn (ResourcePurchaseAccess $mail) => $mail->resent);

        $this->ordersRole(['view' => true]);
        $this->post("/admin/orders/{$order->id}/resend")->assertForbidden();

        $this->ordersRole(['view' => true, 'delete' => true]);
        $this->post("/admin/orders/{$order->id}/refund")->assertRedirect('/admin/orders');
        $this->assertSame(Order::REFUNDED, $order->refresh()->status);
    }

    public function test_resend_is_refused_for_orders_that_are_not_paid(): void
    {
        $order = $this->paidOrder();
        $order->update(['status' => Order::CANCELLED, 'paid_key' => null]);
        $this->staff();

        $this->post("/admin/orders/{$order->id}/resend")->assertSessionHasErrors('order');
        Mail::assertNothingSent();
    }

    public function test_forgetting_a_buyer_keeps_the_amounts(): void
    {
        $order = $this->paidOrder();
        $this->staff();

        $this->patch("/admin/orders/{$order->id}/forget")->assertRedirect('/admin/orders');

        $order->refresh();
        $this->assertNotNull($order->anonymized_at);
        $this->assertStringStartsWith('anonymized-', $order->email);
        $this->assertSame(4900, $order->amount_cents);
        $this->assertSame(Order::PAID, $order->status);
        $this->assertNotNull($order->resourceRequest->anonymized_at);
        $this->assertSame(1, PaymentTransaction::count());
    }

    public function test_the_admin_resource_form_saves_access_type_and_price(): void
    {
        $this->staff();
        ResourceCategory::create(['slug' => 'books', 'title' => 'Books', 'layout' => 'list']);
        $media = Media::create(['file_name' => 'guide.pdf', 'file_path' => 'media/guide.pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);
        $fields = ['title' => 'Handbook', 'file_media_id' => $media->id, 'status' => 'published', 'sort_order' => 1];

        $this->post('/admin/resources/books', [...$fields, 'access_type' => 'paid'])->assertSessionHasErrors('price');
        $this->post('/admin/resources/books', [...$fields, 'access_type' => 'paid', 'price' => '0.50'])->assertSessionHasErrors('price');
        $this->post('/admin/resources/books', [...$fields, 'access_type' => 'paid', 'price' => '25.5x'])->assertSessionHasErrors('price');
        $this->post('/admin/resources/books', [...$fields, 'access_type' => 'free'])->assertSessionHasErrors('access_type');

        $this->post('/admin/resources/books', [...$fields, 'access_type' => 'paid', 'price' => '25.5'])->assertRedirect();
        $item = ResourceItem::sole();
        $this->assertSame([ResourceItem::ACCESS_PAID, 2550, 'USD'], [$item->access_type, $item->price_cents, $item->currency]);

        $this->get('/admin/resources/books')->assertInertia(fn (Assert $page) => $page
            ->where('items.0.accessType', 'paid')
            ->where('items.0.price', '25.50')
            ->where('items.0.formattedPrice', 'US$25.50'));

        $this->patch("/admin/resources/books/{$item->id}", [...$fields, 'access_type' => 'email', 'price' => '99'])->assertRedirect();
        $this->assertSame([ResourceItem::ACCESS_EMAIL, null], [$item->refresh()->access_type, $item->price_cents]);

        // Omitting access_type keeps the current value.
        $this->patch("/admin/resources/books/{$item->id}", $fields)->assertRedirect();
        $this->assertSame(ResourceItem::ACCESS_EMAIL, $item->refresh()->access_type);
    }
}
