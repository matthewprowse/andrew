import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { PALETTE_OPTIONS } from '@/lib/marketing-theme';

export function PalettePicker({
    value,
    defaultValue,
    defaultLabel,
    onChange,
}: {
    value: string;
    defaultValue: string;
    defaultLabel: string;
    onChange: (value: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const selected = PALETTE_OPTIONS.find(
        (option) => option.hex.toUpperCase() === value.toUpperCase(),
    );
    const filtered = useMemo(
        () =>
            PALETTE_OPTIONS.filter((option) =>
                option.label.toLowerCase().includes(search.toLowerCase()),
            ),
        [search],
    );

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setSearch('');
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 font-normal"
                >
                    <span
                        className="size-4 shrink-0 rounded-sm border"
                        style={{ backgroundColor: value || defaultValue }}
                    />
                    <span className="truncate">
                        {selected?.label ??
                            (value
                                ? 'Custom Colour'
                                : `Default · ${defaultLabel}`)}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
                <div className="mb-2">
                    <Input
                        autoFocus
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search Palettes"
                        className="h-8"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto">
                    <button
                        type="button"
                        className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                        onClick={() => {
                            onChange(null);
                            setOpen(false);
                        }}
                    >
                        <span
                            className="size-4 shrink-0 rounded-sm border"
                            style={{ backgroundColor: defaultValue }}
                        />
                        <span>Default · {defaultLabel}</span>
                    </button>
                    {filtered.map((option) => (
                        <button
                            type="button"
                            key={option.name}
                            className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                            onClick={() => {
                                onChange(option.hex);
                                setOpen(false);
                            }}
                        >
                            <span
                                className="size-4 shrink-0 rounded-sm border"
                                style={{ backgroundColor: option.hex }}
                            />
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
