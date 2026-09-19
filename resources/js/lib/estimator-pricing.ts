import {
    DESTINATION_SERVICES,
    MOVE_COSTS,
    type Service,
} from './estimator-catalogue';
import type { City } from './estimator-cities';
import {
    destinationRate,
    relocationServiceRate,
    routeRate,
} from './estimator-rates';

/**
 * Turns a planner selection into an estimate.
 *
 * The rate tables hold one figure per city (or per route) per service. Everything that varies with
 * the shape of the move — party size, weeks, bedrooms, container size, pets — is applied here as an
 * explicit multiplier, so the admin only ever captures a unit rate. Every assumption below is a
 * named constant precisely because they are assumptions: they were inferred from the service
 * descriptions, not supplied by the mobility team, and should be confirmed before this is quoted
 * from. See also the placeholder-rate warning in estimator-rates.ts.
 */

export const SETTINGS = {
    currency: 'USD',
    /** Applied to the whole estimate. */
    vatRate: 0.15,
    /** Applied to the move costs only — the variable half the disclaimer refers to. */
    contingencyRate: 0.1,
    validityDays: 90,
};

/**
 * Cost services priced by the route (origin matters) rather than by destination alone. The rate
 * tables currently list all of these under both Intra-Location and Destination Costs; this is the
 * split that decides which table the estimator believes. Trimming the duplicate columns in the
 * admin is a separate change — until then, the other table's figures are simply unused.
 */
const ROUTE_PRICED = new Set([
    'Flights',
    'Household Goods Shipping',
    'Transit Insurance',
    'Pet Relocation',
]);

const CONTAINER_FACTOR: Record<string, number> = {
    '20ft container': 1,
    '40ft container': 1.75,
};
const BEDROOM_FACTOR: Record<number, number> = { 1: 1, 2: 1.35, 3: 1.7, 4: 2 };
const WEEKS_PER_MONTH = 4.33;
const LARGE_PARTY_SIZE = 4;
const LARGE_PARTY_TRANSFER_UPLIFT = 1.25;
const INSURANCE_SHARE_OF_SHIPPING = 0.1;

export type Tier = 'Standard' | 'Premium';

export interface PlannerInput {
    origin: City;
    destination: City;
    people: number;
    moveDate: string;
    tier: Tier;
    selected: string[];
    bedrooms: number;
    weeks: number;
    container: string;
    pets: number;
    /** Visas are entered as an approved amount rather than read from a rate table. */
    visaAmount: string;
}

export interface LineItem {
    name: string;
    /** What the figure covers, e.g. "2 bedrooms, 4 weeks". Shown under the service name. */
    detail: string;
    /** null means no rate is available — the line renders as "POA" (price on application). */
    amount: number | null;
}

export interface Estimate {
    groups: { title: string; lines: LineItem[] }[];
    moveSubtotal: number;
    servicesSubtotal: number;
    contingency: number;
    vat: number;
    total: number;
    unpriced: number;
}

function toAmount(value: string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Party-size uplift from the catalogue's tiered pricing fields. */
export function partySizeAdjustment(service: Service, people: number): number {
    if (!service.tieredPricing) return 1;
    if (service.nextThreshold > 0 && people > service.nextThreshold) {
        return 1 + service.adjustmentAboveNextThreshold / 100;
    }
    if (service.firstThreshold > 0 && people > service.firstThreshold) {
        return 1 + service.adjustmentAboveThreshold / 100;
    }
    return 1;
}

/** Premium reads the Business column; only route-priced services have two figures to choose from. */
function routeAmount(service: string, input: PlannerInput): number | null {
    const rate = routeRate(service, input.origin, input.destination);
    return toAmount(input.tier === 'Premium' ? rate.business : rate.economy);
}

function destinationAmount(
    service: string,
    input: PlannerInput,
): number | null {
    return toAmount(destinationRate(input.destination, service));
}

function shippingAmount(input: PlannerInput): number | null {
    const base = routeAmount('Household Goods Shipping', input);
    if (base === null) return null;
    return base * (CONTAINER_FACTOR[input.container] ?? 1);
}

function moveCostLine(service: Service, input: PlannerInput): LineItem {
    const { name } = service;
    const weekly = (monthly: number) => monthly / WEEKS_PER_MONTH;

    switch (name) {
        case 'Flights': {
            const base = routeAmount(name, input);
            return {
                name,
                detail: `${input.people} × ${input.tier === 'Premium' ? 'business' : 'economy'}`,
                amount: base === null ? null : base * input.people,
            };
        }
        case 'Airport Transfer': {
            const base = destinationAmount(name, input);
            const uplift =
                input.people > LARGE_PARTY_SIZE
                    ? LARGE_PARTY_TRANSFER_UPLIFT
                    : 1;
            return {
                name,
                detail:
                    input.people > LARGE_PARTY_SIZE
                        ? 'Larger vehicle for the party'
                        : 'On arrival',
                amount: base === null ? null : base * uplift,
            };
        }
        case 'Temporary Accommodation': {
            const base = destinationAmount(name, input);
            const bedrooms = BEDROOM_FACTOR[input.bedrooms] ?? 1;
            return {
                name,
                detail: `${input.bedrooms} bedroom${input.bedrooms > 1 ? 's' : ''}, ${input.weeks} weeks`,
                amount:
                    base === null
                        ? null
                        : weekly(base) * input.weeks * bedrooms,
            };
        }
        case 'Household Goods Shipping':
            return {
                name,
                detail: input.container,
                amount: shippingAmount(input),
            };
        case 'Transit Insurance': {
            const shipping = shippingAmount(input);
            return {
                name,
                detail: '10% of household goods shipping',
                amount:
                    shipping === null
                        ? null
                        : shipping * INSURANCE_SHARE_OF_SHIPPING,
            };
        }
        case 'Storage': {
            const base = destinationAmount(name, input);
            return {
                name,
                detail: `${input.weeks} weeks, following temporary accommodation`,
                amount: base === null ? null : weekly(base) * input.weeks,
            };
        }
        case 'Pet Relocation': {
            const base = routeAmount(name, input);
            return {
                name,
                detail: `${input.pets} pet${input.pets === 1 ? '' : 's'}`,
                amount:
                    base === null || input.pets < 1 ? null : base * input.pets,
            };
        }
        case 'Visas & Immigration':
            return {
                name,
                detail: 'Approved Amount',
                amount: toAmount(input.visaAmount),
            };
        default: {
            const base = ROUTE_PRICED.has(name)
                ? routeAmount(name, input)
                : destinationAmount(name, input);
            return { name, detail: service.description || '', amount: base };
        }
    }
}

function destinationServiceLine(
    service: Service,
    input: PlannerInput,
): LineItem {
    const base = toAmount(
        relocationServiceRate(input.destination, service.name),
    );
    const adjustment = partySizeAdjustment(service, input.people);
    return {
        name: service.name,
        detail:
            adjustment === 1
                ? service.description || 'Per assignment'
                : `${service.description || 'Per assignment'} · +${Math.round((adjustment - 1) * 100)}% for party size`,
        amount: base === null ? null : base * adjustment,
    };
}

export function buildEstimate(input: PlannerInput): Estimate {
    const chosen = new Set(input.selected);

    const moveLines = MOVE_COSTS.filter((service) =>
        chosen.has(service.name),
    ).map((service) => moveCostLine(service, input));
    const serviceLines = DESTINATION_SERVICES.filter((service) =>
        chosen.has(service.name),
    ).map((service) => destinationServiceLine(service, input));

    const sum = (lines: LineItem[]) =>
        lines.reduce((total, line) => total + (line.amount ?? 0), 0);

    const moveSubtotal = sum(moveLines);
    const servicesSubtotal = sum(serviceLines);
    const contingency = moveSubtotal * SETTINGS.contingencyRate;
    const vat =
        (moveSubtotal + servicesSubtotal + contingency) * SETTINGS.vatRate;

    return {
        groups: [
            { title: 'Relocation Costs', lines: moveLines },
            { title: 'Destination Services', lines: serviceLines },
        ],
        moveSubtotal,
        servicesSubtotal,
        contingency,
        vat,
        total: moveSubtotal + servicesSubtotal + contingency + vat,
        unpriced: [...moveLines, ...serviceLines].filter(
            (line) => line.amount === null,
        ).length,
    };
}

export function formatMoney(amount: number, currency = 'USD'): string {
    return `${currency === 'USD' ? '$' : currency + ' '}${Math.round(amount).toLocaleString('en-US')}`;
}
