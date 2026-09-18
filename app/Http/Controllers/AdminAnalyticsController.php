<?php

namespace App\Http\Controllers;

use App\Models\AnalyticsEvent;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminAnalyticsController extends Controller
{
    public function show(Request $request): Response
    {
        [$since, $until, $period] = $this->period($request);
        $search = trim((string) $request->input('search', ''));
        $events = $this->eventsSince($since, $until, $search);
        $daily = (clone $events)->where('event_type', 'page_view')
            ->selectRaw('DATE(occurred_at) as date, COUNT(*) as views, COUNT(DISTINCT session_hash) as sessions')
            ->groupBy('date')->orderBy('date')->get()->keyBy('date');
        $dailyEvents = (clone $events)
            ->selectRaw('DATE(occurred_at) as date, event_type, COUNT(*) as total')
            ->groupBy('date', 'event_type')->get()
            ->groupBy('date');
        $dailyVisits = collect(iterator_to_array(CarbonPeriod::create($since->copy()->startOfDay(), $until->copy()->startOfDay())))->map(function (CarbonInterface $date) use ($daily, $dailyEvents): array {
            $dayEvents = $dailyEvents->get($date->format('Y-m-d')) ?? collect();

            return [
                'date' => $date->format('Y-m-d'),
                'views' => (int) data_get($daily->get($date->format('Y-m-d')), 'views', 0),
                'sessions' => (int) data_get($daily->get($date->format('Y-m-d')), 'sessions', 0),
                'ctaClicks' => (int) data_get($dayEvents->firstWhere('event_type', 'cta_click'), 'total', 0),
                'resourceDownloads' => (int) data_get($dayEvents->firstWhere('event_type', 'resource_download'), 'total', 0),
            ];
        })->values();

        return Inertia::render('admin/analytics/index', [
            'days' => $period === 'custom' ? null : (int) $period,
            'period' => $period,
            'startDate' => $since->toDateString(),
            'endDate' => $until->toDateString(),
            'search' => $search,
            'summary' => [
                'pageViews' => (clone $events)->where('event_type', 'page_view')->count(),
                'ctaClicks' => (clone $events)->where('event_type', 'cta_click')->count(),
                'resourceDownloads' => (clone $events)->where('event_type', 'resource_download')->count(),
                'uniqueSessions' => (clone $events)->where('event_type', 'page_view')->whereNotNull('session_hash')->distinct()->count('session_hash'),
            ],
            'dailyVisits' => $dailyVisits,
            'topPages' => $this->ranked($events, 'page_view', 'path', 'views', true),
            'topResources' => (clone $events)->where('event_type', 'resource_download')->join('resource_items', 'resource_items.id', '=', 'analytics_events.resource_item_id')->selectRaw('resource_items.title as title, COUNT(*) as downloads')->groupBy('resource_items.id', 'resource_items.title')->orderByDesc('downloads')->orderBy('resource_items.title')->limit(10)->get(),
            'topServiceInterest' => (clone $events)->where('event_type', 'page_view')->join('services', 'services.id', '=', 'analytics_events.service_id')->selectRaw('services.name as name, COUNT(*) as views')->groupBy('services.id', 'services.name')->orderByDesc('views')->orderBy('services.name')->limit(10)->get(),
            'geography' => (clone $events)->where('event_type', 'page_view')->selectRaw('COALESCE(country, ?) as country, COUNT(*) as views', ['Unknown'])->groupBy('country')->orderByDesc('views')->orderBy('country')->limit(10)->get(),
            'topCities' => (clone $events)->where('event_type', 'page_view')->whereNotNull('city')->selectRaw('city, COALESCE(country, ?) as country, COUNT(*) as views', ['Unknown'])->groupBy('city', 'country')->orderByDesc('views')->orderBy('city')->limit(10)->get(),
            'referrers' => $this->ranked($events, 'page_view', 'referrer_host', 'views', true),
            'devices' => $this->ranked($events, 'page_view', 'device_type', 'views', true),
            'browsers' => $this->ranked($events, 'page_view', 'browser', 'views', true),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        [$since, $until, $period] = $this->period($request);
        $events = $this->eventsSince($since, $until, trim((string) $request->input('search', '')));
        $label = $period === 'custom' ? $since->toDateString().' to '.$until->toDateString() : $period.'-days';

        return response()->streamDownload(function () use ($events): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fputcsv($out, ['Metric', 'Value']);
            foreach (['Page views' => (clone $events)->where('event_type', 'page_view')->count(), 'Unique sessions' => (clone $events)->where('event_type', 'page_view')->whereNotNull('session_hash')->distinct()->count('session_hash'), 'CTA clicks' => (clone $events)->where('event_type', 'cta_click')->count(), 'Resource downloads' => (clone $events)->where('event_type', 'resource_download')->count()] as $metric => $value) {
                fputcsv($out, [$metric, $value]);
            }
            fputcsv($out, []);
            fputcsv($out, ['Page', 'Views']);
            foreach ($this->ranked($events, 'page_view', 'path', 'views', true) as $row) {
                fputcsv($out, [$row['path'], $row['views']]);
            }
            fclose($out);
        }, "analytics-{$label}.csv", ['Content-Type' => 'text/csv']);
    }

    /** @return array{0: CarbonInterface, 1: CarbonInterface, 2: int|string} */
    private function period(Request $request): array
    {
        $start = $this->parseDate($request->input('start_date'));
        $end = $this->parseDate($request->input('end_date'));
        if ($start && $end && $start->lte($end)) {
            return [$start->startOfDay(), $end->endOfDay(), 'custom'];
        }

        $days = min(max((int) $request->integer('days', 30), 7), 90);
        $end = now()->endOfDay();

        return [$end->copy()->subDays($days - 1)->startOfDay(), $end, $days];
    }

    private function parseDate(mixed $value): ?CarbonInterface
    {
        if (! is_string($value) || $value === '') {
            return null;
        }
        try {
            return Carbon::createFromFormat('Y-m-d', $value)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    /** @return Builder<AnalyticsEvent> */
    private function eventsSince(CarbonInterface $since, CarbonInterface $until, string $search = ''): Builder
    {
        $query = AnalyticsEvent::query()->whereBetween('occurred_at', [$since, $until]);
        if ($search !== '') {
            $query->where(fn ($query) => $query
                ->where('path', 'like', "%{$search}%")
                ->orWhere('label', 'like', "%{$search}%")
                ->orWhere('country', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")
                ->orWhere('referrer_host', 'like', "%{$search}%"));
        }

        return $query;
    }

    /**
     * @param  Builder<AnalyticsEvent>  $events
     * @return Collection<int, array<string, mixed>>
     */
    private function ranked(Builder $events, string $type, string $field, string $alias, bool $excludeEmpty = false): Collection
    {
        $query = (clone $events)->where('event_type', $type);
        if ($excludeEmpty) {
            $query->whereNotNull($field)->where($field, '<>', '');
        }

        $select = match ($field) {
            'path' => 'path as path, COUNT(*) as views',
            'referrer_host' => 'referrer_host as referrer_host, COUNT(*) as views',
            'device_type' => 'device_type as device_type, COUNT(*) as views',
            'browser' => 'browser as browser, COUNT(*) as views',
            default => throw new \InvalidArgumentException("Unsupported analytics field: {$field}"),
        };

        return $query->selectRaw($select)->groupBy($field)->orderByDesc($alias)->orderBy($field)->limit(10)->get()
            ->map(fn (Model $row): array => $row->getAttributes())->values()->toBase();
    }
}
