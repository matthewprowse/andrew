export type ResourceItemRecord = {
    id: string;
    categorySlug: string;
    title: string;
    description: string;
    actionLabel: string;
    fileUrl: string;
    fileName: string;
    externalUrl: string;
    imageUrl: string;
    imageAlt: string;
    sortOrder: number;
    requiresEmailVerification: boolean;
    accessType: ResourceAccessType;
    priceCents: number | null;
    formattedPrice: string;
    /** False while checkout is unavailable (e.g. before PayPal is connected). */
    purchasable: boolean;
};

export type ResourceAccessType = 'open' | 'email' | 'paid';

export const resourceAccessLabels: Record<ResourceAccessType, string> = {
    open: 'Open',
    email: 'Email required',
    paid: 'Paid',
};

export type ResourceMediaRef = {
    id: string;
    url: string;
    fileName: string;
} | null;

export type ResourceItemAdminRecord = {
    id: string;
    categorySlug: string;
    categoryTitle: string;
    title: string;
    description: string;
    actionLabel: string;
    file: ResourceMediaRef;
    image: ResourceMediaRef;
    externalUrl: string;
    sortOrder: number;
    status: 'Draft' | 'Live';
    accessType: ResourceAccessType;
    /** Decimal USD string for the form, e.g. "25.00"; empty when not paid. */
    price: string;
    formattedPrice: string;
    requiresEmailVerification: boolean;
    serviceId: string | null;
    serviceIds: string[];
    serviceNames: string[];
    updatedAt: string;
};

export type ResourceLayout = 'list' | 'cards';
