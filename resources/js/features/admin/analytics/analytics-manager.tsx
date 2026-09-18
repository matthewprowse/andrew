import { useState, type FormEvent } from 'react';
import { router } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/admin/date-picker';
import { Input } from '@/components/ui/input';
import { MetricLineChart } from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export type AnalyticsProps = {
    days: number | null;
    period: number | 'custom';
    startDate: string;
    endDate: string;
    search: string;
    summary: {
        pageViews: number;
        ctaClicks: number;
        resourceDownloads: number;
        uniqueSessions: number;
    };
    dailyVisits: {
        date: string;
        views: number;
        sessions: number;
        ctaClicks: number;
        resourceDownloads: number;
    }[];
    topPages: { path: string; views: number }[];
    topResources: { title: string; downloads: number }[];
    topServiceInterest: { name: string; views: number }[];
    geography: { country: string; views: number }[];
    topCities: { city: string; country: string; views: number }[];
    referrers: { referrer_host: string; views: number }[];
    devices: { device_type: string; views: number }[];
    browsers: { browser: string; views: number }[];
};

function StatCard({
    label,
    value,
    data,
    dataKey,
}: {
    label: string;
    value: number;
    data: AnalyticsProps['dailyVisits'];
    dataKey: string;
}) {
    return (
        <Card size="sm" className="overflow-hidden">
            <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-3xl">
                    {value.toLocaleString()}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <MetricLineChart data={data} dataKey={dataKey} />
            </CardContent>
        </Card>
    );
}

export function AnalyticsFilters({
    period,
    startDate,
    endDate,
    search,
}: Pick<AnalyticsProps, 'period' | 'startDate' | 'endDate' | 'search'>) {
    const [query, setQuery] = useState(search);
    const [selectedPeriod, setSelectedPeriod] = useState(String(period));
    const [customStart, setCustomStart] = useState(startDate);
    const [customEnd, setCustomEnd] = useState(endDate);

    function navigateWithFilters(
        nextPeriod: string,
        nextStart = customStart,
        nextEnd = customEnd,
    ) {
        const params =
            nextPeriod === 'custom'
                ? {
                      search: query,
                      start_date: nextStart,
                      end_date: nextEnd,
                  }
                : { search: query, days: nextPeriod };
        router.get('/admin/analytics', params, {
            preserveState: true,
            replace: true,
        });
    }

    function applyFilters(event: FormEvent) {
        event.preventDefault();
        navigateWithFilters(selectedPeriod);
    }

    function handlePeriodChange(value: string) {
        setSelectedPeriod(value);

        if (value !== 'custom') {
            navigateWithFilters(value);
        }
    }

    function handleCustomStartChange(value: string) {
        setCustomStart(value);

        if (customEnd) {
            navigateWithFilters('custom', value, customEnd);
        }
    }

    function handleCustomEndChange(value: string) {
        setCustomEnd(value);

        if (customStart) {
            navigateWithFilters('custom', customStart, value);
        }
    }

    return (
        <form
            onSubmit={applyFilters}
            className="flex flex-wrap items-center justify-end gap-2"
        >
            <Input
                aria-label="Search Analytics"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Analytics"
                className="h-8 w-96"
            />
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="h-8 w-40" aria-label="Date Range">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom Dates</SelectItem>
                    <SelectSeparator />
                    <div className="space-y-2 px-1.5 py-1">
                        <p className="text-muted-foreground text-xs font-medium">
                            Custom Date Range
                        </p>
                        <DatePicker
                            value={customStart}
                            onChange={handleCustomStartChange}
                            placeholder="Start Date"
                        />
                        <DatePicker
                            value={customEnd}
                            onChange={handleCustomEndChange}
                            placeholder="End Date"
                        />
                    </div>
                </SelectContent>
            </Select>
        </form>
    );
}

export function AnalyticsManager({
    summary,
    dailyVisits,
    topPages,
    topResources,
    topServiceInterest,
    geography,
    topCities,
    referrers,
    devices,
    browsers,
}: AnalyticsProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Page Views"
                    value={summary.pageViews}
                    data={dailyVisits}
                    dataKey="views"
                />
                <StatCard
                    label="Unique Sessions"
                    value={summary.uniqueSessions}
                    data={dailyVisits}
                    dataKey="sessions"
                />
                <StatCard
                    label="CTA Clicks"
                    value={summary.ctaClicks}
                    data={dailyVisits}
                    dataKey="ctaClicks"
                />
                <StatCard
                    label="Resource Downloads"
                    value={summary.resourceDownloads}
                    data={dailyVisits}
                    dataKey="resourceDownloads"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daily visits</CardTitle>
                    <CardDescription>
                        Page views and unique sessions per day.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {dailyVisits.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            No page views recorded yet in this window.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Views</TableHead>
                                    <TableHead>Sessions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyVisits.map((day) => (
                                    <TableRow key={day.date}>
                                        <TableCell>{day.date}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="w-10">
                                                    {day.views}
                                                </span>
                                                <span
                                                    className="bg-primary/20 h-2 rounded"
                                                    style={{
                                                        width: `${Math.min(day.views * 8, 160)}px`,
                                                    }}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>{day.sessions}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Top resources</CardTitle>
                        <CardDescription>By downloads.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topResources.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No downloads recorded yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {topResources.map((resource) => (
                                    <li
                                        key={resource.title}
                                        className="flex items-center justify-between gap-4 text-sm"
                                    >
                                        <span className="min-w-0 truncate">
                                            {resource.title}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                            {resource.downloads}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top service interest</CardTitle>
                        <CardDescription>By page views.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topServiceInterest.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No service page views recorded yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {topServiceInterest.map((service) => (
                                    <li
                                        key={service.name}
                                        className="flex items-center justify-between gap-4 text-sm"
                                    >
                                        <span className="min-w-0 truncate">
                                            {service.name}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                            {service.views}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Geographic breakdown</CardTitle>
                        <CardDescription>By country.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {geography.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No page views recorded yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {geography.map((row) => (
                                    <li
                                        key={row.country}
                                        className="flex items-center justify-between gap-4 text-sm"
                                    >
                                        <span className="min-w-0 truncate">
                                            {row.country}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                            {row.views}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top cities</CardTitle>
                        <CardDescription>By page views.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topCities.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No page views recorded yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {topCities.map((row) => (
                                    <li
                                        key={`${row.city}-${row.country}`}
                                        className="flex items-center justify-between gap-4 text-sm"
                                    >
                                        <span className="min-w-0 truncate">
                                            {row.city}, {row.country}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                            {row.views}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top pages</CardTitle>
                        <CardDescription>By page views.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topPages.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No page views recorded yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {topPages.map((row) => (
                                    <li
                                        key={row.path}
                                        className="flex items-center justify-between gap-4 text-sm"
                                    >
                                        <span className="min-w-0 truncate">
                                            {row.path}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                            {row.views}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {[
                    ['Referrers', referrers, 'referrer_host'],
                    ['Devices', devices, 'device_type'],
                    ['Browsers', browsers, 'browser'],
                ].map(([title, rows, key]) => (
                    <Card key={title as string}>
                        <CardHeader>
                            <CardTitle>{title as string}</CardTitle>
                            <CardDescription>By page views.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(rows as { views: number }[]).length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No data recorded yet.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {(rows as { views: number }[]).map(
                                        (row) => (
                                            <li
                                                key={String(
                                                    (
                                                        row as Record<
                                                            string,
                                                            unknown
                                                        >
                                                    )[key as string],
                                                )}
                                                className="flex items-center justify-between gap-4 text-sm"
                                            >
                                                <span className="min-w-0 truncate">
                                                    {String(
                                                        (
                                                            row as Record<
                                                                string,
                                                                unknown
                                                            >
                                                        )[key as string],
                                                    )}
                                                </span>
                                                <span className="text-muted-foreground shrink-0">
                                                    {row.views}
                                                </span>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
