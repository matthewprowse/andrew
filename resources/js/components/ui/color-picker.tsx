import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function ColorPicker({
    value,
    onChange,
    defaultValue,
    label,
}: {
    value: string;
    onChange: (value: string) => void;
    defaultValue: string;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState((value || defaultValue).toUpperCase());
    const displayValue = (value || defaultValue).toUpperCase();

    const [hsl, setHsl] = useState(() => hexToHsl(displayValue));

    useEffect(() => {
        setDraft((value || defaultValue).toUpperCase());
        setHsl(hexToHsl(displayValue));
    }, [value, displayValue]);

    function update(next: string) {
        setDraft(next.toUpperCase());
        if (/^#[0-9a-fA-F]{6}$/.test(next)) {
            setHsl(hexToHsl(next));
            onChange(next.toUpperCase());
        }
    }

    function updateHsl(next: { h?: number; s?: number; l?: number }) {
        const nextHsl = { ...hsl, ...next };
        setHsl(nextHsl);
        const nextHex = hslToHex(nextHsl.h, nextHsl.s, nextHsl.l);
        setDraft(nextHex.toUpperCase());
        onChange(nextHex);
    }

    return (
        <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) setDraft(value || defaultValue); }}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal">
                    <span className="size-4 shrink-0 rounded-sm border" style={{ backgroundColor: displayValue }} />
                    <span className="truncate">{value || 'Custom Colour'}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
                <div className="grid gap-3">
                    <div
                        role="slider"
                        aria-label={`${label} saturation and lightness`}
                        tabIndex={0}
                        className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-md"
                        style={{ backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsl.h} 100% 50%))` }}
                        onPointerDown={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            updateHsl({ s: ((event.clientX - rect.left) / rect.width) * 100, l: 50 - ((event.clientY - rect.top) / rect.height) * 50 });
                        }}
                    >
                        <span className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#000,0_0_0_2px_#fff]" style={{ left: `${Math.max(0, Math.min(100, hsl.s))}%`, top: `${Math.max(0, Math.min(100, 100 - hsl.l * 2))}%`, backgroundColor: displayValue }} />
                    </div>
                    <input aria-label={`${label} hue`} type="range" min="0" max="360" value={hsl.h} onChange={(event) => updateHsl({ h: Number(event.target.value) })} className="w-full accent-primary" />
                    <div className="flex items-center gap-2">
                        <span className="size-8 shrink-0 rounded-md border" style={{ backgroundColor: draft || displayValue }} />
                        <Input value={draft} onChange={(event) => update(event.target.value)} placeholder="#000000" maxLength={7} />
                    </div>
                    <Button type="button" variant="ghost" className={cn('justify-start', !value && 'text-muted-foreground')} onClick={() => { onChange(''); setDraft(defaultValue.toUpperCase()); setOpen(false); }}>
                        Use Default Colour
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const value = hex.replace('#', '');
    const red = parseInt(value.slice(0, 2), 16) / 255;
    const green = parseInt(value.slice(2, 4), 16) / 255;
    const blue = parseInt(value.slice(4, 6), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    let hue = 0;
    if (delta) {
        if (max === red) hue = 60 * (((green - blue) / delta) % 6);
        else if (max === green) hue = 60 * ((blue - red) / delta + 2);
        else hue = 60 * ((red - green) / delta + 4);
    }
    const lightness = (max + min) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
    return { h: hue < 0 ? hue + 360 : hue, s: saturation * 100, l: lightness * 100 };
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
    const s = saturation / 100;
    const l = lightness / 100;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - chroma / 2;
    const [red, green, blue] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
    return `#${[red, green, blue].map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
