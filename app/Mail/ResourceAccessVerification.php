<?php

namespace App\Mail;

use App\Models\ResourceRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class ResourceAccessVerification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ResourceRequest $resourceRequest) {}

    public function build(): self
    {
        $item = $this->resourceRequest->item;

        $verifyUrl = URL::temporarySignedRoute(
            'resources.access.verify',
            now()->addHours(24),
            ['resourceRequest' => $this->resourceRequest->id],
        );

        return $this->subject("Access your download: {$item->title}")
            ->markdown('mail.resource-access', [
                'name' => $this->resourceRequest->name,
                'title' => $item->title,
                'verifyUrl' => $verifyUrl,
            ]);
    }
}
