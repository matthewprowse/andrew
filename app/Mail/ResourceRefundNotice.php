<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResourceRefundNotice extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function build(): self
    {
        $title = $this->order->item->title ?? 'your resource';

        return $this->subject("Refund issued: {$title}")
            ->markdown('mail.resource-refund', [
                'name' => $this->order->buyerName(),
                'title' => $title,
                'reference' => $this->order->reference,
                'amount' => $this->order->formattedAmount(),
            ]);
    }
}
