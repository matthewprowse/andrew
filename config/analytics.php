<?php

return [
    // How long an analytics event is kept before `analytics:prune` deletes it.
    // No retention period was specified by Andrew; 13 months is a common,
    // conservative analytics-industry default, adjustable via .env.
    'retention_days' => (int) env('ANALYTICS_RETENTION_DAYS', 395),

    // Local MaxMind-DB-format database used to resolve country/city/postal
    // code from an IP address. Refreshed monthly by `geoip:update`, which
    // downloads the free DB-IP City Lite release — no account, no cost, no
    // third-party lookups at request time. See docs/analytics-privacy-decision.md.
    'geoip_database_path' => env('ANALYTICS_GEOIP_DB_PATH', storage_path('app/geoip/dbip-city-lite.mmdb')),
];
