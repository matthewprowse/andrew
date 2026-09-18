<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * An immutable, append-only analytics event. Stores the visitor's raw IP
 * and resolved coarse geography — see docs/analytics-privacy-decision.md.
 */
class AnalyticsEvent extends Model
{
    public const UPDATED_AT = null;

    public const CREATED_AT = null;

    protected $fillable = [
        'event_type', 'path', 'label', 'service_id', 'resource_item_id',
        'device_type', 'browser', 'referrer_host', 'ip_address', 'country',
        'city', 'session_hash', 'occurred_at',
    ];

    protected function casts(): array
    {
        return ['occurred_at' => 'datetime'];
    }
}
