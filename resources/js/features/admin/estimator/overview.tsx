import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
    EstimatorSettingsRecord,
    EstimatorStats,
} from '@/types/estimator';

export function EstimatorOverview({
    stats,
    settings,
}: {
    stats: EstimatorStats;
    settings: EstimatorSettingsRecord;
}) {
    const form = useForm({
        currency: settings.currency,
        vatRate: String(settings.vatRate),
        contingencyRate: String(settings.contingencyRate),
        transitInsuranceShare: String(settings.transitInsuranceShare),
        validityDays: String(settings.validityDays),
    });

    const cards = [
        { label: 'Active Services', value: String(stats.activeServices) },
        {
            label: 'Active Cities (Inactive)',
            value: `${stats.activeCities} (${stats.inactiveCities})`,
        },
        { label: 'Priced Routes', value: String(stats.pricedRoutes) },
    ];

    function save() {
        form.transform((data) => ({
            currency: data.currency,
            vatRate: Number(data.vatRate),
            contingencyRate: Number(data.contingencyRate),
            transitInsuranceShare: Number(data.transitInsuranceShare),
            validityDays: Number(data.validityDays),
        }));
        form.put('/admin/estimator/overview', { preserveScroll: true });
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
                {cards.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                {stat.value}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm">
                                {stat.label}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>Estimate settings</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="setting-currency">Currency</Label>
                        <Input
                            id="setting-currency"
                            value={form.data.currency}
                            onChange={(event) =>
                                form.setData('currency', event.target.value)
                            }
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="setting-vat">VAT Rate (0–1)</Label>
                            <Input
                                id="setting-vat"
                                type="number"
                                step="0.01"
                                min={0}
                                max={1}
                                value={form.data.vatRate}
                                onChange={(event) =>
                                    form.setData('vatRate', event.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="setting-contingency">
                                Contingency rate (0–1)
                            </Label>
                            <Input
                                id="setting-contingency"
                                type="number"
                                step="0.01"
                                min={0}
                                max={1}
                                value={form.data.contingencyRate}
                                onChange={(event) =>
                                    form.setData(
                                        'contingencyRate',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="setting-transit">
                                Transit insurance share of shipping (0–1)
                            </Label>
                            <Input
                                id="setting-transit"
                                type="number"
                                step="0.01"
                                min={0}
                                max={1}
                                value={form.data.transitInsuranceShare}
                                onChange={(event) =>
                                    form.setData(
                                        'transitInsuranceShare',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="setting-validity">
                                Quote validity (days)
                            </Label>
                            <Input
                                id="setting-validity"
                                type="number"
                                min={1}
                                value={form.data.validityDays}
                                onChange={(event) =>
                                    form.setData(
                                        'validityDays',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <div role="alert" className="text-destructive text-sm">
                            {Object.entries(form.errors).map(
                                ([field, message]) => (
                                    <p key={field}>{message}</p>
                                ),
                            )}
                        </div>
                    )}
                    <Button
                        disabled={form.processing}
                        onClick={save}
                        className="w-fit"
                    >
                        {form.processing ? 'Saving…' : 'Save Settings'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
