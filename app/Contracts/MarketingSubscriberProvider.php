<?php

namespace App\Contracts;

/**
 * Adapter boundary for adding a verified lead to the marketing/newsletter
 * list. Whichever ESP Andrew approves (Mailchimp or otherwise) implements
 * this against its own API; callers never depend on a specific vendor.
 */
interface MarketingSubscriberProvider
{
    /** @param  array<string, mixed>  $attributes  Vendor-agnostic context, e.g. ['source' => 'resource-download'] */
    public function subscribe(string $email, string $firstName, string $lastName, array $attributes = []): void;
}
