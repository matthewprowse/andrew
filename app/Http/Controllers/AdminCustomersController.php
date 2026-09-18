<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Lead;
use App\Models\Order;
use App\Models\ResourceRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class AdminCustomersController extends Controller
{
    public function index(): Response
    {
        abort_unless(
            request()->user()?->canAdmin('inquiries', 'view') ||
            request()->user()?->canAdmin('orders', 'view'),
            403,
        );

        /** @var Collection<string, array<string, mixed>> $customers */
        $customers = collect();

        $add = function (string $email, array $data) use (&$customers): void {
            $key = mb_strtolower(trim($email));
            if ($key === '') {
                return;
            }

            $customer = $customers->get($key, [
                'id' => sha1($key),
                'name' => null,
                'email' => $email,
                'company' => null,
                'inquiries' => 0,
                'orders' => 0,
                'lastActivity' => null,
                'activities' => [],
                'inquiryRecords' => [],
                'orderRecords' => [],
                'notes' => null,
            ]);

            $customer['name'] = $customer['name'] ?: ($data['name'] ?? null);
            $customer['company'] = $customer['company'] ?: ($data['company'] ?? null);
            $customer['notes'] = $customer['notes'] ?: ($data['notes'] ?? null);
            $customer['inquiries'] += $data['inquiry'] ? 1 : 0;
            $customer['orders'] += $data['order'] ? 1 : 0;
            $customer['lastActivity'] = collect([
                $customer['lastActivity'],
                $data['date'],
            ])->filter()->max();
            $customer['activities'][] = [
                'type' => $data['type'],
                'label' => $data['label'],
                'date' => $data['date'],
            ];
            if (! empty($data['record'])) {
                $customer[$data['recordKey']][] = $data['record'];
            }
            $customers->put($key, $customer);
        };

        Customer::query()->get()->each(function (Customer $customer) use ($add): void {
            $add($customer->email, [
                'name' => $customer->name,
                'company' => $customer->company,
                'notes' => $customer->notes,
                'date' => $customer->updated_at?->toIso8601String(),
                'type' => 'customer',
                'label' => 'Customer record',
                'inquiry' => false,
                'order' => false,
            ]);
        });

        if (request()->user()->canAdmin('inquiries', 'view')) {
            Lead::query()->whereNull('anonymized_at')->get()->each(function (Lead $lead) use ($add): void {
                $add($lead->email, [
                    'name' => $lead->name,
                    'date' => $lead->submitted_at->toIso8601String(),
                    'type' => 'inquiry',
                    'label' => $lead->subject ?: 'Inquiry',
                    'recordKey' => 'inquiryRecords',
                    'record' => [
                        'id' => (string) $lead->id,
                        'subject' => $lead->subject ?: 'Inquiry',
                        'message' => $lead->message,
                        'label' => $lead->subject ?: 'Inquiry',
                        'detail' => $lead->message,
                        'date' => $lead->submitted_at->toIso8601String(),
                        'status' => $lead->handled ? 'Handled' : 'Open',
                        'href' => '/admin/inquiries?lead='.$lead->id,
                    ],
                    'inquiry' => true,
                    'order' => false,
                ]);
            });

            ResourceRequest::query()->with('item')->whereNull('anonymized_at')->get()->each(function (ResourceRequest $request) use ($add): void {
                $add($request->email, [
                    'name' => $request->name ?: trim($request->first_name.' '.$request->last_name),
                    'company' => $request->company,
                    'date' => $request->submitted_at->toIso8601String(),
                    'type' => 'resource-request',
                    'label' => $request->item?->title ?: 'Resource request',
                    'recordKey' => 'inquiryRecords',
                    'record' => [
                        'id' => (string) $request->id,
                        'subject' => $request->item?->title ?: 'Resource request',
                        'message' => null,
                        'label' => $request->item?->title ?: 'Resource request',
                        'detail' => $request->company,
                        'date' => $request->submitted_at->toIso8601String(),
                        'status' => $request->verified_at ? 'Verified' : 'Unverified',
                        'href' => '/admin/inquiries?resourceRequest='.$request->id,
                    ],
                    'inquiry' => true,
                    'order' => false,
                ]);
            });
        }

        if (request()->user()->canAdmin('orders', 'view')) {
            Order::query()->with(['item', 'resourceRequest'])->whereNull('anonymized_at')->get()->each(function (Order $order) use ($add): void {
                $add($order->email, [
                    'name' => $order->buyerName(),
                    'company' => $order->resourceRequest?->company,
                    'date' => $order->created_at?->toIso8601String(),
                    'type' => 'order',
                    'label' => $order->reference ?: 'Order',
                    'recordKey' => 'orderRecords',
                    'record' => [
                        'id' => (string) $order->id,
                        'reference' => $order->reference ?: 'Order',
                        'resourceTitle' => $order->item?->title,
                        'amount' => $order->formattedAmount(),
                        'label' => $order->reference ?: 'Order',
                        'detail' => $order->item?->title,
                        'date' => $order->created_at?->toIso8601String(),
                        'status' => ucfirst($order->status),
                        'href' => '/admin/orders?order='.$order->id,
                    ],
                    'inquiry' => false,
                    'order' => true,
                ]);
            });
        }

        return Inertia::render('admin/customers/index', [
            'customers' => $customers->map(function (array $customer): array {
                usort($customer['activities'], static fn (array $left, array $right): int => strcmp((string) $right['date'], (string) $left['date']));

                return $customer;
            })->sortByDesc('lastActivity')->values()->all(),
        ]);
    }

    public function store(): RedirectResponse
    {
        abort_unless(
            request()->user()?->canAdmin('inquiries', 'edit') ||
            request()->user()?->canAdmin('orders', 'edit'),
            403,
        );

        request()->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        Customer::create(request()->only(['name', 'email', 'company', 'notes']));

        return to_route('admin.customers');
    }
}
