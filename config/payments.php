<?php

return [
    // `fake` simulates checkout with a test payment page; `paypal` uses the
    // PayPal Orders API once credentials are available. Purchasing is
    // always switched off in production while the fake driver is active.
    'driver' => env('PAYMENTS_DRIVER', 'fake'),

    'currency' => 'USD',

    // How long an emailed access link stays valid. Access itself never
    // expires — a buyer can request a fresh link at any time.
    'access_link_days' => 7,

    'paypal' => [
        'mode' => env('PAYPAL_MODE', 'sandbox'),
        'client_id' => env('PAYPAL_CLIENT_ID'),
        'client_secret' => env('PAYPAL_CLIENT_SECRET'),
        'webhook_id' => env('PAYPAL_WEBHOOK_ID'),
    ],
];
