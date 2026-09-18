export type BlogPost = {
    bannerImageUrl: string;
    bannerImageAlt: string;
    slug: string;
    title: string;
    serviceNames: string[];
    excerpt: string;
    publishDate: string;
    body: string[];
    metaTitle?: string;
    metaDescription?: string;
};

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

export function formatPublishDate(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
}
