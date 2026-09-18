<?php

namespace App\Support;

class Money
{
    /** Formats an amount in cents for display, e.g. 2500 USD → "US$25.00". */
    public static function format(int $cents, string $currency = 'USD'): string
    {
        $prefix = $currency === 'USD' ? 'US$' : $currency.' ';

        return $prefix.number_format($cents / 100, 2, '.', ',');
    }

    /** Converts a validated decimal string such as "25" or "25.5" to cents. */
    public static function toCents(string $amount): int
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '');

        return ((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0');
    }

    /** Converts cents to the plain decimal string an admin form edits, e.g. 2500 → "25.00". */
    public static function toDecimal(?int $cents): string
    {
        return $cents === null ? '' : number_format($cents / 100, 2, '.', '');
    }
}
