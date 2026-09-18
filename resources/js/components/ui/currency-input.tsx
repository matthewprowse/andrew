import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';

/**
 * An Input with a fixed currency symbol, using shadcn's affix pattern: the symbol is a positioned
 * span layered over a left-padded field, so it reads as part of the input without ever becoming
 * part of its value. Pointer events pass through, so clicking the symbol focuses the field.
 */
function CurrencyInput({
    className,
    symbol = '$',
    ...props
}: React.ComponentProps<typeof Input> & { symbol?: string }) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground select-none">
                {symbol}
            </span>
            <Input data-slot="currency-input" className={cn('pl-6', className)} {...props} />
        </div>
    );
}

export { CurrencyInput };
