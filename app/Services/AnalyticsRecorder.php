<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use Illuminate\Http\Request;

/**
 * Records analytics events. Bot traffic and Do-Not-Track opted-out visitors
 * are excluded before anything is written. Persists the visitor's raw IP
 * and resolves coarse geography (country/city) from it — see
 * docs/analytics-privacy-decision.md for when and why that changed.
 */
class AnalyticsRecorder
{
    private const BOT_SIGNATURES = [
        'bot', 'crawl', 'spider', 'slurp', 'bingpreview', 'facebookexternalhit',
        'whatsapp', 'telegrambot', 'discordbot', 'slackbot', 'curl/', 'wget/',
        'python-requests', 'go-http-client', 'headlesschrome', 'phantomjs',
        'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot', 'petalbot',
    ];

    public function __construct(private readonly GeoIpResolver $geoIp) {}

    /** @param  array<string, mixed>  $attributes  event_type, path, label, service_id, resource_item_id */
    public function record(Request $request, array $attributes): void
    {
        if ($this->shouldSkip($request)) {
            return;
        }

        $userAgent = (string) $request->userAgent();
        $ip = $request->ip();
        $geo = $this->geoIp->resolve($ip);

        AnalyticsEvent::create([
            ...$attributes,
            'device_type' => $this->deviceType($userAgent),
            'browser' => $this->browser($userAgent),
            'referrer_host' => $this->refererHost($request),
            'ip_address' => $ip,
            'country' => $geo['country'],
            'city' => $geo['city'],
            // Server-to-server calls (e.g. payment webhooks) have no session.
            'session_hash' => $request->hasSession() ? hash('sha256', $request->session()->getId()) : null,
            'occurred_at' => now(),
        ]);
    }

    private function shouldSkip(Request $request): bool
    {
        // Do Not Track: a visitor-level opt-out we can honour cheaply and
        // unambiguously without needing a cookie-consent banner first.
        if ($request->header('DNT') === '1') {
            return true;
        }

        $userAgent = strtolower((string) $request->userAgent());

        if ($userAgent === '') {
            return true;
        }

        foreach (self::BOT_SIGNATURES as $signature) {
            if (str_contains($userAgent, $signature)) {
                return true;
            }
        }

        return false;
    }

    private function deviceType(string $userAgent): string
    {
        $userAgent = strtolower($userAgent);

        if (str_contains($userAgent, 'ipad') || (str_contains($userAgent, 'tablet') && ! str_contains($userAgent, 'mobile'))) {
            return 'tablet';
        }

        if (str_contains($userAgent, 'mobi') || str_contains($userAgent, 'iphone') || str_contains($userAgent, 'android')) {
            return 'mobile';
        }

        return 'desktop';
    }

    private function browser(string $userAgent): string
    {
        $userAgent = strtolower($userAgent);

        return match (true) {
            str_contains($userAgent, 'edg/') => 'Edge',
            str_contains($userAgent, 'opr/') || str_contains($userAgent, 'opera') => 'Opera',
            str_contains($userAgent, 'chrome') && ! str_contains($userAgent, 'chromium') => 'Chrome',
            str_contains($userAgent, 'crios') => 'Chrome',
            str_contains($userAgent, 'fxios') || str_contains($userAgent, 'firefox') => 'Firefox',
            str_contains($userAgent, 'safari') => 'Safari',
            default => 'Other',
        };
    }

    private function refererHost(Request $request): ?string
    {
        $referer = $request->headers->get('referer');

        if (! $referer) {
            return null;
        }

        $host = parse_url($referer, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : null;
    }
}
