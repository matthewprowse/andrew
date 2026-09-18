<?php

namespace App\Console\Commands;

use App\Models\AnalyticsEvent;
use Illuminate\Console\Command;

/**
 * Enforces the analytics retention period defined in config/analytics.php.
 * See docs/analytics-privacy-decision.md for why a period exists at all.
 */
class PruneAnalyticsEvents extends Command
{
    protected $signature = 'analytics:prune';

    protected $description = 'Delete analytics events older than the configured retention period';

    public function handle(): int
    {
        $days = (int) config('analytics.retention_days');
        $cutoff = now()->subDays($days);

        $deleted = AnalyticsEvent::where('occurred_at', '<', $cutoff)->delete();

        $this->info("Deleted {$deleted} analytics event(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
