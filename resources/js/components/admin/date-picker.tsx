import { useState } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

// Matches the `DD Mon YYYY` convention used across the admin tables/dialogs
// (see formatDate() in blog-manager.tsx / careers-manager.tsx) so the picker's
// trigger label reads the same as everywhere else this date shows up.
function formatDisplayDate(value: string): string {
    if (!value) return '';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return '';
    return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
}

function toIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseIso(value: string): Date | undefined {
    if (!value) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return undefined;
    return new Date(year, month - 1, day);
}

// DayPicker relies on the native change event to update its visible month.
// Keep its native select here; Calendar's styles hide the control and show
// the styled caption label underneath it.
function CalendarDropdown({
    options,
    className,
    ...props
}: {
    options?: { value: number; label: string; disabled: boolean }[];
    className?: string;
    [key: string]: unknown;
}) {
    return (
        <select
            {...props}
            className={cn(
                'h-8 rounded-md bg-transparent px-2 text-sm font-medium outline-none',
                className,
            )}
        >
            {options?.map((option) => (
                <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                >
                    {option.label}
                </option>
            ))}
        </select>
    );
}

export function DatePicker({
    id,
    value,
    onChange,
    placeholder = 'Pick a date',
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    className={cn(
                        'w-full justify-start font-normal',
                        !value && 'text-muted-foreground',
                    )}
                >
                    {value ? formatDisplayDate(value) : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={parseIso(value)}
                    captionLayout="dropdown"
                    components={{ Dropdown: CalendarDropdown }}
                    onSelect={(date) => {
                        if (!date) return;
                        onChange(toIso(date));
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
