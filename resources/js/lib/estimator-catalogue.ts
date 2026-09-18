/**
 * The service catalogue, shared by the estimator admin screens and the public estimator.
 *
 * 'Costs' are the move itself (the public planner's "Services" group); 'Services' are the
 * destination support offering (its "Destination services" group). Descriptions, default ticks
 * and the active flag all come from here, so the public planner never restates them.
 *
 * Tiered pricing adjusts a service by party size: no adjustment up to firstThreshold,
 * adjustmentAboveThreshold percent beyond it, and adjustmentAboveNextThreshold percent beyond
 * nextThreshold. See partySizeAdjustment in estimator-pricing.ts.
 */

export type ServiceCategory = 'Costs' | 'Services';

export interface Service {
    id: string;
    category: ServiceCategory;
    name: string;
    description: string;
    selectedByDefault: boolean;
    active: boolean;
    tieredPricing: boolean;
    firstThreshold: number;
    adjustmentAboveThreshold: number;
    nextThreshold: number;
    adjustmentAboveNextThreshold: number;
}

const emptyTiers = {
    tieredPricing: false,
    firstThreshold: 0,
    adjustmentAboveThreshold: 0,
    nextThreshold: 0,
    adjustmentAboveNextThreshold: 0,
};

export const SERVICES: Service[] = [
    {
        id: '1',
        category: 'Costs',
        name: 'Flights',
        description: 'Flexible economy, per person',
        selectedByDefault: true,
        active: true,
        ...emptyTiers,
    },
    {
        id: '2',
        category: 'Costs',
        name: 'Airport Transfer',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '3',
        category: 'Costs',
        name: 'Temporary Accommodation',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '4',
        category: 'Costs',
        name: 'Household Goods Shipping',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '5',
        category: 'Costs',
        name: 'Transit Insurance',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '6',
        category: 'Costs',
        name: 'Storage',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '7',
        category: 'Costs',
        name: 'Pet Relocation',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '8',
        category: 'Costs',
        name: 'Visas & Immigration',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '9',
        category: 'Services',
        name: 'Pre-Departure Briefing',
        description: 'Full consultation briefing',
        selectedByDefault: true,
        active: true,
        tieredPricing: true,
        firstThreshold: 2,
        adjustmentAboveThreshold: 0,
        nextThreshold: 5,
        adjustmentAboveNextThreshold: 30,
    },
    {
        id: '10',
        category: 'Services',
        name: 'Home Search Program',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '11',
        category: 'Services',
        name: 'Area Orientation',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '12',
        category: 'Services',
        name: 'Education & Childcare',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '13',
        category: 'Services',
        name: 'Settling-In Service',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '14',
        category: 'Services',
        name: 'Partner Support Program',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '15',
        category: 'Services',
        name: 'Two Day Home Search',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
    {
        id: '16',
        category: 'Services',
        name: 'Three Day Bundle Package',
        description: '',
        selectedByDefault: false,
        active: true,
        ...emptyTiers,
    },
];

export const MOVE_COSTS = SERVICES.filter(
    (s) => s.active && s.category === 'Costs',
);
export const DESTINATION_SERVICES = SERVICES.filter(
    (s) => s.active && s.category === 'Services',
);
