<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/**
 * Downloads the latest free DB-IP City Lite database (MaxMind-DB format)
 * used by GeoIpResolver to resolve country/city from an IP
 * address. No account or payment is required; releases are published
 * monthly at a predictable URL. Data is licensed CC BY 4.0 — see
 * https://db-ip.com/db/lite.php — attribution is credited in
 * docs/analytics-privacy-decision.md.
 */
class UpdateGeoIpDatabase extends Command
{
    protected $signature = 'geoip:update';

    protected $description = 'Download the latest free DB-IP City Lite GeoIP database';

    public function handle(): int
    {
        $destination = config('analytics.geoip_database_path');
        File::ensureDirectoryExists(dirname($destination));
        $gzPath = $destination.'.gz.tmp';
        $tempPath = $destination.'.tmp';

        foreach ([now(), now()->subMonth()] as $release) {
            $url = sprintf('https://download.db-ip.com/free/dbip-city-lite-%s.mmdb.gz', $release->format('Y-m'));

            // Stream both the download and the decompression to disk — the
            // decompressed database is ~100MB, too large to hold in memory
            // as a single string alongside the compressed response body.
            $response = Http::timeout(120)->withOptions(['sink' => $gzPath])->get($url);

            if (! $response->ok()) {
                continue;
            }

            if (! $this->decompress($gzPath, $tempPath)) {
                $this->error("Downloaded file for {$release->format('Y-m')} could not be decompressed.");
                File::delete([$gzPath, $tempPath]);

                return self::FAILURE;
            }

            File::move($tempPath, $destination);
            File::delete($gzPath);

            $this->info("GeoIP database updated to the {$release->format('Y-m')} release.");

            return self::SUCCESS;
        }

        File::delete($gzPath);
        $this->error('Could not download a GeoIP database release for this month or last month.');

        return self::FAILURE;
    }

    private function decompress(string $gzPath, string $tempPath): bool
    {
        $in = gzopen($gzPath, 'rb');
        $out = fopen($tempPath, 'wb');

        if ($in === false || $out === false) {
            return false;
        }

        while (! gzeof($in)) {
            fwrite($out, gzread($in, 1024 * 1024));
        }

        gzclose($in);
        fclose($out);

        return true;
    }
}
