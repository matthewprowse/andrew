import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
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
type RateEntry = { cityId: string; serviceId: string; rate: number | null };

function rateKey(cityId: string, serviceId: string) {
    return `${cityId}|${serviceId}`;
}

export function DestinationCostsMatrix({
    services,
    cities,
    rates,
}: {
    services: ServiceOption[];
    cities: CityOption[];
    rates: RateEntry[];
}) {
    const initial: Record<string, string> = {};
    for (const rate of rates) {
        initial[rateKey(rate.cityId, rate.serviceId)] =
            rate.rate === null ? '' : String(rate.rate);
    }

    const [values, setValues] = useState<Record<string, string>>(initial);
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState(false);
    const country = useFrozenColumn<HTMLTableCellElement>();

    function updateRate(cityId: string, serviceId: string, value: string) {
        setValues((current) => ({
            ...current,
            [rateKey(cityId, serviceId)]: value,
        }));
    }

    function handleSave() {
        setProcessing(true);
        const payload = {
            rates: cities.flatMap((city) =>
                services.map((service) => ({
                    cityId: Number(city.id),
                    serviceId: Number(service.id),
                    rate:
                        values[rateKey(city.id, service.id)] === ''
                            ? null
                            : Number(values[rateKey(city.id, service.id)]),
                })),
            ),
        };
        router.put('/admin/estimator/destination-costs', payload, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    }

    const query = search.trim().toLowerCase();
    const visibleCities = query
        ? cities.filter(
              (c) =>
                  c.city.toLowerCase().includes(query) ||
                  c.country.toLowerCase().includes(query),
          )
        : cities;

    if (services.length === 0) {
        return (
            <p className="text-muted-foreground">
                No destination-priced services configured yet.
            </p>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex items-center gap-4">
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
                            {services.map((service) => (
                                <TableHead
                                    key={service.id}
                                    className="frozen-edge-y bg-background sticky top-0 z-20"
                                >
                                    {service.name}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleCities.map((city) => (
                            <TableRow key={city.id}>
                                <TableCell className="frozen-cell sticky left-0 z-10 font-medium">
                                    {city.country}
                                </TableCell>
                                <TableCell
                                    className="frozen-cell frozen-edge-x sticky z-10 font-medium"
                                    style={{ left: country.width }}
                                >
                                    {city.city}
                                </TableCell>
                                {services.map((service) => (
                                    <TableCell key={service.id}>
                                        <CurrencyInput
                                            type="number"
                                            className="w-24"
                                            value={
                                                values[
                                                    rateKey(city.id, service.id)
                                                ] ?? ''
                                            }
                                            onChange={(event) =>
                                                updateRate(
                                                    city.id,
                                                    service.id,
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </table>
            </div>

            <div>
                <Button disabled={processing} onClick={handleSave}>
                    {processing ? 'Saving…' : 'Save Destination Costs'}
                </Button>
            </div>
        </div>
    );
}
