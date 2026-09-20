import { useState } from 'react';
import { EstimatorAccessDialog } from '@/components/estimator/estimator-access-dialog';
import { PageMeta } from '@/components/page-meta';
import { csrfFetch } from '@/lib/csrf';
import { formatMoney } from '@/lib/format-money';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    EstimatorEstimate,
    EstimatorPublicCity,
    EstimatorPublicService,
} from '@/types/estimator';

const howItWorks = [
    {
        title: 'Tell us about your move',
        description:
            'Enter your origin, destination, move date, and how many people are relocating.',
    },
    {
        title: 'Choose your services',
        description:
            'Select the relocation services you need, from shipping to temporary accommodation.',
    },
    {
        title: 'Get an instant estimate',
        description:
            'See an itemized cost breakdown for your move in seconds — no waiting for a callback.',
    },
    {
        title: 'Save or share your quote',
        description:
            'Print or save your estimate, and reach out when you are ready to move forward.',
    },
];

type FormState = {
    originCityId: string;
    destinationCityId: string;
    people: string;
    moveDate: string;
    tier: 'Standard' | 'Premium';
    selected: string[];
    bedrooms: string;
    weeks: string;
    container: '20ft container' | '40ft container';
    pets: string;
    visaAmount: string;
};

function Calculator({
    cities,
    services,
}: {
    cities: EstimatorPublicCity[];
    services: EstimatorPublicService[];
}) {
    const costServices = services.filter((s) => s.category === 'costs');
    const destinationServices = services.filter(
        (s) => s.category === 'services',
    );

    const [form, setForm] = useState<FormState>({
        originCityId: cities[0]?.id ?? '',
        destinationCityId: cities[1]?.id ?? cities[0]?.id ?? '',
        people: '2',
        moveDate: '',
        tier: 'Standard',
        selected: services
            .filter((s) => s.selectedByDefault)
            .map((s) => s.name),
        bedrooms: '1',
        weeks: '4',
        container: '20ft container',
        pets: '0',
        visaAmount: '',
    });
    const [estimate, setEstimate] = useState<EstimatorEstimate | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState('');

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function toggleService(name: string) {
        setForm((current) => ({
            ...current,
            selected: current.selected.includes(name)
                ? current.selected.filter((s) => s !== name)
                : [...current.selected, name],
        }));
    }

    async function calculate() {
        setCalculating(true);
        setError('');
        try {
            const response = await csrfFetch('/estimator/calculate', {
                method: 'POST',
                json: {
                    origin_city_id: Number(form.originCityId),
                    destination_city_id: Number(form.destinationCityId),
                    people: Number(form.people) || 1,
                    tier: form.tier,
                    selected: form.selected,
                    bedrooms: Number(form.bedrooms) || 1,
                    weeks: Number(form.weeks) || 1,
                    container: form.container,
                    pets: Number(form.pets) || 0,
                    visa_amount: form.visaAmount || null,
                },
            });

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                setError(
                    json?.message ??
                        'Could not calculate an estimate. Check your selections and try again.',
                );
                return;
            }

            setEstimate(await response.json());
        } catch {
            setError('Could not reach the estimator. Please try again.');
        } finally {
            setCalculating(false);
        }
    }

    const needsBedrooms = form.selected.includes('Temporary Accommodation');
    const needsWeeks =
        form.selected.includes('Temporary Accommodation') ||
        form.selected.includes('Storage');
    const needsContainer = form.selected.includes('Household Goods Shipping');
    const needsPets = form.selected.includes('Pet Relocation');
    const needsVisa = form.selected.includes('Visas & Immigration');

    return (
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="grid gap-6 print:hidden">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label>Moving from</Label>
                        <Select
                            value={form.originCityId}
                            onValueChange={(v) => update('originCityId', v)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                        {city.city}, {city.country}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Moving to</Label>
                        <Select
                            value={form.destinationCityId}
                            onValueChange={(v) =>
                                update('destinationCityId', v)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                        {city.city}, {city.country}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="est-people">Number of people</Label>
                        <Input
                            id="est-people"
                            type="number"
                            min={1}
                            value={form.people}
                            onChange={(event) =>
                                update('people', event.target.value)
                            }
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="est-date">Move date</Label>
                        <Input
                            id="est-date"
                            type="date"
                            value={form.moveDate}
                            onChange={(event) =>
                                update('moveDate', event.target.value)
                            }
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Service tier</Label>
                        <Select
                            value={form.tier}
                            onValueChange={(v) =>
                                update('tier', v as FormState['tier'])
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Standard">
                                    Standard
                                </SelectItem>
                                <SelectItem value="Premium">Premium</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-3">
                    <h2 className="text-lg font-medium">Relocation costs</h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {costServices.map((service) => (
                            <label
                                key={service.id}
                                className="flex items-start gap-2 text-sm"
                            >
                                <Checkbox
                                    checked={form.selected.includes(
                                        service.name,
                                    )}
                                    onCheckedChange={() =>
                                        toggleService(service.name)
                                    }
                                />
                                <span>{service.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3">
                    <h2 className="text-lg font-medium">
                        Destination services
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {destinationServices.map((service) => (
                            <label
                                key={service.id}
                                className="flex items-start gap-2 text-sm"
                            >
                                <Checkbox
                                    checked={form.selected.includes(
                                        service.name,
                                    )}
                                    onCheckedChange={() =>
                                        toggleService(service.name)
                                    }
                                />
                                <span>{service.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {(needsBedrooms ||
                    needsWeeks ||
                    needsContainer ||
                    needsPets ||
                    needsVisa) && (
                    <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                        {needsBedrooms && (
                            <div className="grid gap-2">
                                <Label>Bedrooms</Label>
                                <Select
                                    value={form.bedrooms}
                                    onValueChange={(v) => update('bedrooms', v)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4].map((n) => (
                                            <SelectItem
                                                key={n}
                                                value={String(n)}
                                            >
                                                {n}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {needsWeeks && (
                            <div className="grid gap-2">
                                <Label htmlFor="est-weeks">Weeks</Label>
                                <Input
                                    id="est-weeks"
                                    type="number"
                                    min={1}
                                    value={form.weeks}
                                    onChange={(event) =>
                                        update('weeks', event.target.value)
                                    }
                                />
                            </div>
                        )}
                        {needsContainer && (
                            <div className="grid gap-2">
                                <Label>Container size</Label>
                                <Select
                                    value={form.container}
                                    onValueChange={(v) =>
                                        update(
                                            'container',
                                            v as FormState['container'],
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="20ft container">
                                            20ft container
                                        </SelectItem>
                                        <SelectItem value="40ft container">
                                            40ft container
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {needsPets && (
                            <div className="grid gap-2">
                                <Label htmlFor="est-pets">Number of pets</Label>
                                <Input
                                    id="est-pets"
                                    type="number"
                                    min={0}
                                    value={form.pets}
                                    onChange={(event) =>
                                        update('pets', event.target.value)
                                    }
                                />
                            </div>
                        )}
                        {needsVisa && (
                            <div className="grid gap-2">
                                <Label htmlFor="est-visa">
                                    Approved visa amount
                                </Label>
                                <Input
                                    id="est-visa"
                                    type="number"
                                    min={0}
                                    value={form.visaAmount}
                                    onChange={(event) =>
                                        update('visaAmount', event.target.value)
                                    }
                                />
                            </div>
                        )}
                    </div>
                )}

                {error && <p className="text-destructive text-sm">{error}</p>}

                <Button
                    type="button"
                    disabled={
                        calculating ||
                        form.selected.length === 0 ||
                        !form.originCityId ||
                        !form.destinationCityId
                    }
                    onClick={calculate}
                    className="w-fit"
                >
                    {calculating ? 'Calculating…' : 'Calculate estimate'}
                </Button>
            </div>

            <div className="print:w-full">
                {!estimate && (
                    <Card className="h-full">
                        <CardContent className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
                            Select your services and calculate to see an
                            estimate here.
                        </CardContent>
                    </Card>
                )}
                {estimate && (
                    <Card>
                        <CardContent className="grid gap-6">
                            {estimate.groups.map((group) => (
                                <div key={group.title} className="grid gap-3">
                                    <h3 className="font-medium">
                                        {group.title}
                                    </h3>
                                    <div className="divide-y border-y">
                                        {group.lines.length === 0 && (
                                            <p className="text-muted-foreground py-3 text-sm">
                                                Nothing selected.
                                            </p>
                                        )}
                                        {group.lines.map((line) => (
                                            <div
                                                key={line.name}
                                                className="flex items-start justify-between gap-4 py-3"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {line.name}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {line.detail}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-medium whitespace-nowrap">
                                                    {line.amount === null
                                                        ? 'POA'
                                                        : formatMoney(
                                                              line.amount,
                                                              estimate.currency,
                                                          )}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Relocation costs subtotal
                                    </span>
                                    <span>
                                        {formatMoney(
                                            estimate.moveSubtotal,
                                            estimate.currency,
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Destination services subtotal
                                    </span>
                                    <span>
                                        {formatMoney(
                                            estimate.servicesSubtotal,
                                            estimate.currency,
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Contingency
                                    </span>
                                    <span>
                                        {formatMoney(
                                            estimate.contingency,
                                            estimate.currency,
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        VAT
                                    </span>
                                    <span>
                                        {formatMoney(
                                            estimate.vat,
                                            estimate.currency,
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                                    <span>Total</span>
                                    <span>
                                        {formatMoney(
                                            estimate.total,
                                            estimate.currency,
                                        )}
                                    </span>
                                </div>
                            </div>

                            {estimate.unpriced > 0 && (
                                <p className="text-muted-foreground text-xs">
                                    {estimate.unpriced} selected{' '}
                                    {estimate.unpriced === 1
                                        ? 'item needs'
                                        : 'items need'}{' '}
                                    a rate before it can be priced — shown as
                                    "POA" (price on application) above and
                                    excluded from the total.
                                </p>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                className="w-fit print:hidden"
                                onClick={() => window.print()}
                            >
                                Print this estimate
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function Estimator({
    cities,
    services,
}: {
    cities: EstimatorPublicCity[];
    services: EstimatorPublicService[];
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [unlocked, setUnlocked] = useState(false);

    return (
        <>
            <PageMeta
                title="Relocation Cost Planner"
                description="Get an instant, itemized estimate for your relocation — select your services and see real costs in seconds."
            />
            <div className="print:hidden">
                <SiteHeader />
            </div>
            <main>
                <section className="mx-auto w-full max-w-7xl px-6 py-16 text-center md:px-8 md:py-24 print:hidden">
                    <p className="text-muted-foreground text-sm">
                        Relocation Planner
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                        Estimator
                    </h1>
                    <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-lg leading-8">
                        Get an instant, itemized estimate for your relocation —
                        select your services and see real costs in seconds.
                    </p>
                </section>
                <section
                    aria-label="Estimator status"
                    className="mx-auto w-full max-w-7xl px-6 pb-16 text-center md:px-8 md:pb-24 print:hidden"
                >
                    <p className="text-muted-foreground text-sm">Coming Soon</p>
                </section>
                <section
                    aria-label="How it works"
                    className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24 print:hidden"
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {howItWorks.map((step) => (
                            <Card key={step.title} className="gap-4">
                                <CardContent>
                                    <h2 className="text-lg font-medium">
                                        {step.title}
                                    </h2>
                                    <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                                        {step.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
                <section
                    aria-label="Relocation cost calculator"
                    className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 md:pb-24 print:px-0 print:pb-0"
                >
                    {!unlocked ? (
                        <Card className="gap-4">
                            <CardContent className="flex flex-col items-center gap-3 text-center">
                                <h2 className="text-lg font-medium">
                                    Get Your Estimate by Email
                                </h2>
                                <p className="text-muted-foreground max-w-xl text-base leading-7">
                                    Pop in your email and we&apos;ll send a
                                    one-time code so you can unlock the full
                                    cost calculator.
                                </p>
                                <Button
                                    type="button"
                                    className="mt-2"
                                    onClick={() => setDialogOpen(true)}
                                >
                                    Unlock The Calculator
                                </Button>
                            </CardContent>
                        </Card>
                    ) : cities.length < 2 ? (
                        <p className="text-muted-foreground text-center">
                            The calculator needs at least two active cities
                            configured before it can run.
                        </p>
                    ) : (
                        <Calculator cities={cities} services={services} />
                    )}
                    <EstimatorAccessDialog
                        open={dialogOpen}
                        onOpenChange={setDialogOpen}
                        onVerified={() => {
                            setDialogOpen(false);
                            setUnlocked(true);
                        }}
                    />
                </section>
            </main>
            <div className="print:hidden">
                <SiteFooter />
            </div>
        </>
    );
}
