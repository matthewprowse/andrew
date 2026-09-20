export function formatMoney(amount: number, currency = 'USD'): string {
    return `${currency === 'USD' ? '$' : currency + ' '}${Math.round(amount).toLocaleString('en-US')}`;
}
