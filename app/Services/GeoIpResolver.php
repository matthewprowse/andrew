<?php

namespace App\Services;

use GeoIp2\Database\Reader;
use GeoIp2\Exception\AddressNotFoundException;
use Illuminate\Support\Facades\Log;
use MaxMind\Db\Reader\InvalidDatabaseException;

/**
 * Resolves an IP to coarse geography (country, city) using a
 * local, self-hosted DB-IP City Lite database — no third-party service is
 * called at request time. See docs/analytics-privacy-decision.md and
 * `geoip:update` for how the database file is obtained and refreshed.
 */
class GeoIpResolver
{
    /** @return array{country: ?string, city: ?string} */
    public function resolve(?string $ip): array
    {
        $empty = ['country' => null, 'city' => null];

        if (! $ip || ! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return $empty;
        }

        $path = config('analytics.geoip_database_path');

        if (! is_string($path) || ! is_file($path)) {
            return $empty;
        }

        try {
            $record = (new Reader($path))->city($ip);

            return [
                'country' => $record->country->name,
                'city' => $record->city->name,
            ];
        } catch (AddressNotFoundException) {
            return $empty;
        } catch (InvalidDatabaseException $e) {
            Log::warning('GeoIP database is unreadable or corrupt.', ['error' => $e->getMessage()]);

            return $empty;
        }
    }
}
