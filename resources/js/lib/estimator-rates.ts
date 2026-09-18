/**
 * PLACEHOLDER PRICING — NOT REAL QUOTES.
 *
 * These figures are generated, not sourced. They exist so the estimator grids read like real data
 * while the UI is being built, and they are in plausible ballparks for corporate relocation, but no
 * carrier, shipping line, insurer or immigration schedule was consulted. Do not quote a client from
 * them. Replace this module with the real rate source before the estimator goes anywhere near a
 * customer.
 *
 * Rates are derived rather than stored: the route grid alone is 103 origins x 103 destinations x 8
 * services x 2 service levels (~170k values), which is far past what is sensible to hold as data.
 * Deriving them also keeps the grids internally consistent — a long-haul route costs more than a
 * domestic one, and an expensive city costs more than a cheap one, everywhere it appears.
 */

interface CountryProfile {
    /** Approximate capital coordinates, used as a distance proxy for route pricing. */
    lat: number;
    lng: number;
    /** Local cost multiplier, roughly 0.75 (lowest cost) to 1.6 (highest). */
    tier: number;
}

// Keyed on the exact country strings used by the city lists in the matrix components — including
// their spellings (e.g. 'Morrocco'), since a mismatch would silently fall back to the default.
const COUNTRIES: Record<string, CountryProfile> = {
    Algeria: { lat: 36.8, lng: 3.1, tier: 0.9 },
    Angola: { lat: -8.8, lng: 13.2, tier: 1.25 },
    Botswana: { lat: -24.6, lng: 25.9, tier: 0.95 },
    'Burkina Faso': { lat: 12.4, lng: -1.5, tier: 0.8 },
    Burundi: { lat: -3.4, lng: 29.4, tier: 0.75 },
    Cameroon: { lat: 3.9, lng: 11.5, tier: 0.95 },
    'Central African Republic': { lat: 4.4, lng: 18.6, tier: 1.05 },
    China: { lat: 39.9, lng: 116.4, tier: 1.2 },
    Congo: { lat: -4.3, lng: 15.3, tier: 1.15 },
    'Democratic Republic of Congo': { lat: -4.4, lng: 15.3, tier: 1.2 },
    Djibouti: { lat: 11.6, lng: 43.1, tier: 1.05 },
    Egypt: { lat: 30.0, lng: 31.2, tier: 0.85 },
    'Equatorial Guinea': { lat: 3.75, lng: 8.8, tier: 1.3 },
    Ethiopia: { lat: 9.0, lng: 38.7, tier: 0.85 },
    Gabon: { lat: 0.4, lng: 9.5, tier: 1.2 },
    Ghana: { lat: 5.6, lng: -0.2, tier: 0.95 },
    Guinea: { lat: 9.5, lng: -13.7, tier: 0.9 },
    'Ivory Coast': { lat: 5.3, lng: -4.0, tier: 1.0 },
    Kenya: { lat: -1.3, lng: 36.8, tier: 0.95 },
    Lesotho: { lat: -29.3, lng: 27.5, tier: 0.8 },
    Liberia: { lat: 6.3, lng: -10.8, tier: 0.9 },
    Libya: { lat: 32.9, lng: 13.2, tier: 1.1 },
    Madagascar: { lat: -18.9, lng: 47.5, tier: 0.8 },
    Malawi: { lat: -13.98, lng: 33.8, tier: 0.75 },
    Mali: { lat: 12.6, lng: -8.0, tier: 0.85 },
    Mauritania: { lat: 18.1, lng: -16.0, tier: 0.85 },
    Mauritius: { lat: -20.2, lng: 57.5, tier: 1.1 },
    Morrocco: { lat: 34.0, lng: -6.8, tier: 0.9 },
    Mozambique: { lat: -25.97, lng: 32.6, tier: 0.85 },
    Namibia: { lat: -22.6, lng: 17.1, tier: 0.95 },
    Niger: { lat: 13.5, lng: 2.1, tier: 0.8 },
    Nigeria: { lat: 9.1, lng: 7.5, tier: 1.15 },
    'Reunion Island': { lat: -20.9, lng: 55.5, tier: 1.2 },
    Rwanda: { lat: -1.95, lng: 30.1, tier: 0.85 },
    Senegal: { lat: 14.7, lng: -17.4, tier: 0.95 },
    Seychelles: { lat: -4.6, lng: 55.5, tier: 1.25 },
    'South Africa': { lat: -26.2, lng: 28.0, tier: 1.0 },
    'South Sudan': { lat: 4.85, lng: 31.6, tier: 1.1 },
    Sudan: { lat: 15.5, lng: 32.5, tier: 0.9 },
    Swaziland: { lat: -26.3, lng: 31.1, tier: 0.8 },
    Tanzania: { lat: -6.8, lng: 39.3, tier: 0.9 },
    Tunisia: { lat: 36.8, lng: 10.2, tier: 0.85 },
    Uganda: { lat: 0.3, lng: 32.6, tier: 0.85 },
    'United Kingdom': { lat: 51.5, lng: -0.13, tier: 1.5 },
    'United States of America': { lat: 40.7, lng: -74.0, tier: 1.6 },
    Zambia: { lat: -15.4, lng: 28.3, tier: 0.85 },
    Zimbabwe: { lat: -17.8, lng: 31.05, tier: 0.85 },
};

const DEFAULT_PROFILE: CountryProfile = { lat: 0, lng: 20, tier: 1 };

/** Cities in the same country share coordinates, so domestic routes get a nominal distance. */
const DOMESTIC_DISTANCE_KM = 800;

/** Premium service level, as a multiple of the standard one. Flights are priced separately. */
const BUSINESS_MULTIPLIER = 1.55;
const BUSINESS_FLIGHT_MULTIPLIER = 3.6;

interface Place {
    city: string;
    country: string;
}

function profileFor(country: string): CountryProfile {
    return COUNTRIES[country] ?? DEFAULT_PROFILE;
}

function distanceKm(origin: Place, destination: Place): number {
    if (origin.country === destination.country) {
        return origin.city === destination.city ? 0 : DOMESTIC_DISTANCE_KM;
    }

    const from = profileFor(origin.country);
    const to = profileFor(destination.country);
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const deltaLat = toRadians(to.lat - from.lat);
    const deltaLng = toRadians(to.lng - from.lng);
    const haversine =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(toRadians(from.lat)) *
            Math.cos(toRadians(to.lat)) *
            Math.sin(deltaLng / 2) ** 2;

    return 2 * 6371 * Math.asin(Math.sqrt(haversine));
}

/**
 * Stable pseudo-random value in [0, 1) for a key (FNV-1a). Rates need to look hand-entered rather
 * than formulaic, but must not change between renders — so the variation is derived from the cell's
 * own identity instead of Math.random().
 */
function noise(key: string): number {
    let hash = 2166136261;
    for (let index = 0; index < key.length; index++) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
}

/** Applies +/- `spread` of deterministic variation, then rounds to a quote-like figure. */
function quote(amount: number, key: string, spread = 0.12): string {
    const varied = amount * (1 + (noise(key) * 2 - 1) * spread);
    if (varied >= 1000) return String(Math.round(varied / 50) * 50);
    if (varied >= 100) return String(Math.round(varied / 10) * 10);
    return String(Math.max(5, Math.round(varied / 5) * 5));
}

/** Flat per-destination costs — priced off the destination's local cost of living. */
const DESTINATION_BASE: Record<string, number> = {
    'Airport Transfer': 85,
    'Temporary Accommodation': 3200,
    'Household Goods Shipping': 6500,
    'Transit Insurance': 650,
    Storage: 320,
    'Pet Relocation': 1900,
    'Visas & Immigration': 1400,
};

/** Relocation consultancy services, also priced off the destination city. */
const RELOCATION_BASE: Record<string, number> = {
    'Pre-Departure Briefing': 450,
    'Home Search Program': 2200,
    'Area Orientation': 780,
    'Education & Childcare': 950,
    'Settling-In Service': 1150,
    'Partner Support Program': 1350,
    'Two Day Home Search': 1450,
    'Three Day Bundle Package': 2650,
};

export function destinationRate(place: Place, service: string): string {
    const base = DESTINATION_BASE[service] ?? 500;
    return quote(
        base * profileFor(place.country).tier,
        `${place.city}|${service}`,
    );
}

export function relocationServiceRate(place: Place, service: string): string {
    const base = RELOCATION_BASE[service] ?? 500;
    return quote(
        base * profileFor(place.country).tier,
        `${place.city}|${service}|relocation`,
    );
}

/**
 * Route pricing. Distance-driven services (the shipment and the people moving) scale with how far
 * the move goes; the rest are destination-driven and only track local costs.
 */
export function routeRate(
    service: string,
    origin: Place,
    destination: Place,
): { economy: string; business: string } {
    const km = distanceKm(origin, destination);
    const tier = profileFor(destination.country).tier;
    const key = `${service}|${origin.city}|${destination.city}`;

    let standard: number;
    let businessMultiplier = BUSINESS_MULTIPLIER;

    switch (service) {
        case 'Flights':
            standard = (90 + km * 0.11) * (0.85 + tier * 0.15);
            businessMultiplier = BUSINESS_FLIGHT_MULTIPLIER;
            break;
        case 'Household Goods Shipping':
            standard = (2200 + km * 0.35) * tier;
            break;
        case 'Transit Insurance':
            standard = (2200 + km * 0.35) * 0.09 * tier;
            break;
        case 'Pet Relocation':
            standard = (700 + km * 0.12) * tier;
            break;
        default:
            standard = (DESTINATION_BASE[service] ?? 500) * tier;
    }

    return {
        economy: quote(standard, key),
        business: quote(standard * businessMultiplier, `${key}|business`),
    };
}
