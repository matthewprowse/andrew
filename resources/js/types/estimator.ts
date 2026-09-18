export type EstimatorServiceCategory = 'Costs' | 'Services';

export type EstimatorServiceRecord = {
    id: string;
    category: EstimatorServiceCategory;
    name: string;
    description: string;
    selectedByDefault: boolean;
    active: boolean;
    tieredPricing: boolean;
    firstThreshold: number;
    adjustmentAboveThreshold: number;
    nextThreshold: number;
    adjustmentAboveNextThreshold: number;
    sortOrder: number;
};

export type EstimatorCityRecord = {
    id: string;
    city: string;
    country: string;
    continent: string;
    status: 'Active' | 'Inactive';
    sortOrder: number;
};

export type EstimatorPublicCity = {
    id: string;
    city: string;
    country: string;
    continent: string;
};

export type EstimatorPublicService = {
    id: string;
    category: 'costs' | 'services';
    name: string;
    description: string;
    selectedByDefault: boolean;
};

export type EstimatorLineItem = {
    name: string;
    detail: string;
    amount: number | null;
};

export type EstimatorEstimate = {
    groups: { title: string; lines: EstimatorLineItem[] }[];
    moveSubtotal: number;
    servicesSubtotal: number;
    contingency: number;
    vat: number;
    total: number;
    unpriced: number;
    currency: string;
};

export type EstimatorSettingsRecord = {
    currency: string;
    vatRate: number;
    contingencyRate: number;
    transitInsuranceShare: number;
    validityDays: number;
};

export type EstimatorStats = {
    activeServices: number;
    activeCities: number;
    inactiveCities: number;
    pricedRoutes: number;
};
