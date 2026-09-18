<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResourcePurchaseAccess extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public string $accessUrl,
        public bool $resent = false,
    ) {}

    public function build(): self
    {
        $title = $this->order->item->title ?? 'your resource';

        return $this->subject($this->resent ? "Your access link: {$title}" : "Payment received: {$title}")
            ->markdown('mail.resource-purchase', [
                'name' => $this->order->buyerName(),
                'title' => $title,
                'reference' => $this->order->reference,
                'amount' => $this->order->formattedAmount(),
                'accessUrl' => $this->accessUrl,
                'resent' => $this->resent,
                'days' => (int) config('payments.access_link_days'),
            ]);
    }
}
