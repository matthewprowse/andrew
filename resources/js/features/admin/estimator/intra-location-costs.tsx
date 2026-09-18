import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useFrozenColumn } from '@/hooks/use-frozen-column';

type ServiceOption = { id: string; name: string };
type CityOption = { id: string; city: string; country: string };
type RouteRateEntry = {
    originCityId: string;
    destinationCityId: string;
    serviceId: string;
    economyRate: number | null;
    businessRate: number | null;
};
type Rate = { economy: string; business: string };

function rateKey(serviceId: string, originId: string, destinationId: string) {
    return `${serviceId}|${originId}|${destinationId}`;
}

export function IntraLocationCostsMatrix({
    services,
    cities,
    rates,
}: {
    services: ServiceOption[];
    cities: CityOption[];
    rates: RouteRateEntry[];
}) {
    const initial: Record<string, Rate> = {};
    for (const rate of rates) {
        initial[
            rateKey(rate.serviceId, rate.originCityId, rate.destinationCityId)
        ] = {
            economy: rate.economyRate === null ? '' : String(rate.economyRate),
            business:
                rate.businessRate === null ? '' : String(rate.businessRate),
        };
    }

    const [selectedServiceId, setSelectedServiceId] = useState(
        services[0]?.id ?? '',
    );
    const [values, setValues] = useState<Record<string, Rate>>(initial);
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState(false);
    const country = useFrozenColumn<HTMLTableCellElement>();

    function updateRate(
        originId: string,
        destinationId: string,
        field: keyof Rate,
        value: string,
    ) {
        const key = rateKey(selectedServiceId, originId, destinationId);
        setValues((current) => ({
            ...current,
            [key]: {
                ...(current[key] ?? { economy: '', business: '' }),
                [field]: value,
            },
        }));
    }

    function handleSave() {
        setProcessing(true);
        const payload = {
            rates: Object.entries(values).map(([key, rate]) => {
                const [serviceId, originCityId, destinationCityId] =
                    key.split('|');
                return {
                    originCityId: Number(originCityId),
                    destinationCityId: Number(destinationCityId),
                    serviceId: Number(serviceId),
                    economyRate:
                        rate.economy === '' ? null : Number(rate.economy),
                    businessRate:
                        rate.business === '' ? null : Number(rate.business),
                };
            }),
        };
        router.put('/admin/estimator/intra-location-costs', payload, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    }

    const query = search.trim().toLowerCase();
    const origins = query
        ? cities.filter(
              (c) =>
                  c.city.toLowerCase().includes(query) ||
                  c.country.toLowerCase().includes(query),
          )
        : cities;

    if (services.length === 0) {
        return (
            <p className="text-muted-foreground">
                No route-priced services configured yet.
            </p>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex items-center gap-4">
                <Select
                    value={selectedServiceId}
                    onValueChange={setSelectedServiceId}
                >
                    <SelectTrigger className="w-56">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                                {service.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    placeholder="Search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="relative min-h-0 flex-1 overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <TableHeader className="[&_tr]:border-b-0">
                        <TableRow className="hover:bg-transparent">
                            <TableHead
                                ref={country.ref}
                                className="frozen-cell frozen-edge-y sticky top-0 left-0 z-30"
                            >
                                Country
                            </TableHead>
                            <TableHead
                                className="frozen-cell frozen-edge-corner sticky top-0 z-30"
                                style={{ left: country.width }}
                            >
                                City
                            </TableHead>
                            {cities.map((destination) => (
                                <TableHead
                                    key={destination.id}
                                    className="frozen-edge-y bg-background sticky top-0 z-20"
                                >
                                    {destination.city}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {origins.map((origin) => (
                            <TableRow key={origin.id}>
                                <TableCell className="frozen-cell sticky left-0 z-10 font-medium">
                                    {origin.country}
                                </TableCell>
                                <TableCell
                                    className="frozen-cell frozen-edge-x sticky z-10 font-medium"
                                    style={{ left: country.width }}
                                >
                                    {origin.city}
                                </TableCell>
                                {cities.map((destination) => {
                                    if (origin.id === destination.id) {
                                        return (
                                            <TableCell
                                                key={destination.id}
                                                className="text-muted-foreground"
                                            >
                                                —
                                            </TableCell>
                                        );
                                    }
                                    const rate = values[
                                        rateKey(
                                            selectedServiceId,
                                            origin.id,
                                            destination.id,
                                        )
                                    ] ?? {
                                        economy: '',
                                        business: '',
                                    };
                                    return (
                                        <TableCell key={destination.id}>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-muted-foreground w-8 text-xs">
                                                        Eco
                                                    </span>
                                                    <CurrencyInput
                                                        type="number"
                                                        className="w-24"
                                                        value={rate.economy}
                                                        onChange={(event) =>
                                                            updateRate(
                                                                origin.id,
                                                                destination.id,
                                                                'economy',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-muted-foreground w-8 text-xs">
                                                        Bus
                                                    </span>
                                                    <CurrencyInput
                                                        type="number"
                                                        className="w-24"
                                                        value={rate.business}
                                                        onChange={(event) =>
                                                            updateRate(
                                                                origin.id,
                                                                destination.id,
                                                                'business',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </table>
            </div>

            <div>
                <Button disabled={processing} onClick={handleSave}>
                    {processing ? 'Saving…' : 'Save Intra-Location Costs'}
                </Button>
            </div>
        </div>
    );
}
