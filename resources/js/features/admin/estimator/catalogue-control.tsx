import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { EstimatorStats } from '@/types/estimator';

function downloadCatalogueSummary(stats: EstimatorStats) {
    const rows = [
        ['Metric', 'Value'],
        ['Active Services', String(stats.activeServices)],
        ['Active Cities', String(stats.activeCities)],
        ['Inactive Cities', String(stats.inactiveCities)],
        ['Priced Routes', String(stats.pricedRoutes)],
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'catalogue-summary.csv';
    link.click();
    URL.revokeObjectURL(url);
}

export function CatalogueControl({ stats }: { stats: EstimatorStats }) {
    return (
        <div className="flex flex-col gap-4">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Export Catalogue Summary</CardTitle>
                    <CardDescription>
                        Download a CSV summary of active services, cities, and
                        priced routes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        onClick={() => downloadCatalogueSummary(stats)}
                    >
                        Download CSV
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
