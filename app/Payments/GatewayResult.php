<?php

namespace App\Payments;

final readonly class GatewayResult
{
    /** @param  array<string, mixed>  $payload  Raw provider response, kept on the ledger row. */
    public function __construct(
        public bool $successful,
        public ?string $transactionId = null,
        public ?string $payerName = null,
        public ?string $payerEmail = null,
        public array $payload = [],
        public ?string $message = null,
    ) {}

    /** @param  array<string, mixed>  $payload */
    public static function failed(string $message, array $payload = []): self
    {
        return new self(successful: false, payload: $payload, message: $message);
    }
}
