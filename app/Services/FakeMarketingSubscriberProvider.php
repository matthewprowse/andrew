<?php

namespace App\Services;

use App\Contracts\MarketingSubscriberProvider;
use App\Jobs\SubscribeToMarketingList;
use Illuminate\Support\Facades\Log;

/**
 * Default MarketingSubscriberProvider until Andrew approves an ESP (Mailchimp
 * or otherwise) and supplies credentials. Never calls a real vendor; logs
 * what would have been sent so the integration point is provably wired up,
 * and records calls in memory so tests can assert against it directly.
 *
 * @see SubscribeToMarketingList
 */
class FakeMarketingSubscriberProvider implements MarketingSubscriberProvider
{
    /** @var list<array{email: string, firstName: string, lastName: string, attributes: array<string, mixed>}> */
    public array $subscriptions = [];

    public function subscribe(string $email, string $firstName, string $lastName, array $attributes = []): void
    {
        $this->subscriptions[] = compact('email', 'firstName', 'lastName', 'attributes');

        Log::info('marketing.subscribe (no ESP configured)', compact('email', 'firstName', 'lastName', 'attributes'));
    }
}
