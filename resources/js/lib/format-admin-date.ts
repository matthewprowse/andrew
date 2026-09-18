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

export function formatAdminDate(date: string) {
    if (!date) return '—';

    const [year, month, day] = date.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day || month < 1 || month > 12) return '—';

    return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
}
