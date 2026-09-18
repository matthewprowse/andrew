<?php

namespace App\Http\Middleware;

use App\Models\Service;
use App\Services\AnalyticsRecorder;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records a page_view event for public marketing pages only. Runs in
 * terminate() so analytics writes never delay the response.
 */
class TrackPageView
{
    private const EXCLUDED_PREFIXES = ['admin', 'estimator', 'up', 'storage', 'build', 'login', 'register', 'settings'];

    private const EXCLUDED_PATHS = ['robots.txt', 'sitemap.xml'];

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (! $request->isMethod('get') || ! $response->isSuccessful()) {
            return;
        }

        $path = trim($request->path(), '/');

        if (in_array($path, self::EXCLUDED_PATHS, true)) {
            return;
        }

        foreach (self::EXCLUDED_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return;
            }
        }

        $serviceId = str_starts_with($path, 'services/')
            ? Service::query()->where('slug', substr($path, strlen('services/')))->where('status', 'published')->value('id')
            : null;

        app(AnalyticsRecorder::class)->record($request, [
            'event_type' => 'page_view',
            'path' => '/'.$path,
            'service_id' => $serviceId,
        ]);
    }
}
