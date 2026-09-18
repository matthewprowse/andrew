<?php

namespace App\Jobs;

use App\Contracts\MarketingSubscriberProvider;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Adds a verified lead to the marketing list without blocking the request
 * that triggered it, and retries automatically per the queue's backoff
 * policy if the ESP call fails.
 */
class SubscribeToMarketingList implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @param  array<string, mixed>  $attributes */
    public function __construct(
        public readonly string $email,
        public readonly string $firstName,
        public readonly string $lastName,
        public readonly array $attributes = [],
    ) {}

    public function handle(MarketingSubscriberProvider $provider): void
    {
        $provider->subscribe($this->email, $this->firstName, $this->lastName, $this->attributes);
    }

    public function failed(?Throwable $exception): void
    {
        // Recorded for admin review; also lands in the queue's failed_jobs
        // table via Laravel's normal failed-job handling.
        Log::error('marketing.subscribe.failed', [
            'email' => $this->email,
            'error' => $exception?->getMessage(),
        ]);
    }
}
