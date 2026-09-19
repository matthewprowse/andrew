import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type RelatedServiceOption = { id: string; name: string };

type RelatedServicesFieldProps = {
    services: RelatedServiceOption[];
    value: string[];
    onChange: (value: string[]) => void;
    description?: string;
    error?: string;
};

export function RelatedServicesField({
    services,
    value,
    onChange,
    description = 'Choose the services where this content should appear.',
    error,
}: RelatedServicesFieldProps) {
    const selectedServices = services.filter((service) =>
        value.includes(service.id),
    );

    const toggleService = (serviceId: string) => {
        onChange(
            value.includes(serviceId)
                ? value.filter((id) => id !== serviceId)
                : [...value, serviceId],
        );
    };

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
                <Label>Related Services</Label>
                {value.length > 0 && (
                    <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                        onClick={() => onChange([])}
                    >
                        Clear all
                    </button>
                )}
            </div>
            <Select value={undefined} onValueChange={() => undefined}>
                <SelectTrigger
                    className="w-full"
                    aria-invalid={Boolean(error)}
                    aria-label="Related services"
                >
                    <SelectValue
                        placeholder={
                            value.length === 0
                                ? 'Select related services'
                                : selectedServices
                                      .map((service) => service.name)
                                      .join(', ')
                        }
                    />
                </SelectTrigger>
                <SelectContent>
                    {services.map((service) => {
                        const selected = value.includes(service.id);

                        return (
                            <SelectItem
                                key={service.id}
                                value={service.id}
                                onSelect={(event) => {
                                    // Keep the default Select menu open so this
                                    // behaves as a true multi-select.
                                    event.preventDefault();
                                    toggleService(service.id);
                                }}
                            >
                                {service.name}
                                <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                                    {selected && <Check className="size-4" />}
                                </span>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
            {selectedServices.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedServices.map((service) => (
                        <Badge
                            key={service.id}
                            variant="secondary"
                            className="gap-1 rounded-md px-2 py-1 font-normal"
                        >
                            {service.name}
                            <button
                                type="button"
                                aria-label={`Remove ${service.name}`}
                                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-1 rounded-sm outline-none focus-visible:ring-2"
                                onClick={() => toggleService(service.id)}
                            >
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <p className="text-muted-foreground text-sm">{description}</p>
            {error && (
                <p className="text-destructive text-sm" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
