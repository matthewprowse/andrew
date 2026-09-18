/**
 * The city list, shared by the estimator admin screens and the public estimator.
 *
 * Previously this lived in four places — cities-table.tsx plus each of the three rate matrices —
 * each carrying a "kept in sync by hand" comment. It is one list now so that a city added here
 * appears everywhere, and so ids stay stable across the admin grids and the public planner.
 *
 * Only Active cities have rates captured against them; see estimator-rates.ts.
 */

export type CityStatus = 'Active' | 'Inactive';

export interface City {
    id: string;
    city: string;
    country: string;
    continent: string;
    status: CityStatus;
}

// [city, country, continent, status]
const rawCities: [string, string, string, CityStatus][] = [
    ['Cape Town', 'South Africa', 'Africa', 'Active'],
    ['Johannesburg', 'South Africa', 'Africa', 'Active'],
    ['New York', 'United States of America', 'North America', 'Active'],
    ['Algiers', 'Algeria', 'Africa', 'Inactive'],
    ['Oran', 'Algeria', 'Africa', 'Inactive'],
    ['Luanda', 'Angola', 'Africa', 'Inactive'],
    ['Gaborone', 'Botswana', 'Africa', 'Inactive'],
    ['Maun', 'Botswana', 'Africa', 'Inactive'],
    ['Ouagadougou', 'Burkina Faso', 'Africa', 'Inactive'],
    ['Bujumbura', 'Burundi', 'Africa', 'Inactive'],
    ['Douala', 'Cameroon', 'Africa', 'Inactive'],
    ['Yaoune', 'Cameroon', 'Africa', 'Inactive'],
    ['Bangui', 'Central African Republic', 'Africa', 'Inactive'],
    ['Beijing', 'China', 'Asia', 'Inactive'],
    ['Brazzaville', 'Congo', 'Africa', 'Inactive'],
    ['Pointe-Noire', 'Congo', 'Africa', 'Inactive'],
    ['Kinshasa', 'Democratic Republic of Congo', 'Africa', 'Inactive'],
    ['Djibouti City', 'Djibouti', 'Africa', 'Inactive'],
    ['Alexandria', 'Egypt', 'Africa', 'Inactive'],
    ['Cairo', 'Egypt', 'Africa', 'Inactive'],
    ['Malabo', 'Equatorial Guinea', 'Africa', 'Inactive'],
    ['Addis Ababa', 'Ethiopia', 'Africa', 'Inactive'],
    ['Libreville', 'Gabon', 'Africa', 'Inactive'],
    ['Port-Gentil', 'Gabon', 'Africa', 'Inactive'],
    ['Accra', 'Ghana', 'Africa', 'Inactive'],
    ['Obosomase', 'Ghana', 'Africa', 'Inactive'],
    ['Takoradi', 'Ghana', 'Africa', 'Inactive'],
    ['Conakry', 'Guinea', 'Africa', 'Inactive'],
    ['Simandou', 'Guinea', 'Africa', 'Inactive'],
    ['Abidjan', 'Ivory Coast', 'Africa', 'Inactive'],
    ['Eldoret', 'Kenya', 'Africa', 'Inactive'],
    ['Mombassa', 'Kenya', 'Africa', 'Inactive'],
    ['Nairobi', 'Kenya', 'Africa', 'Inactive'],
    ['Maseru', 'Lesotho', 'Africa', 'Inactive'],
    ['Monrovia', 'Liberia', 'Africa', 'Inactive'],
    ['Tripoli', 'Libya', 'Africa', 'Inactive'],
    ['Tripoli', 'Libya', 'Africa', 'Inactive'],
    ['Antananarivo', 'Madagascar', 'Africa', 'Inactive'],
    ['Blantyre', 'Malawi', 'Africa', 'Inactive'],
    ['Kasisi', 'Malawi', 'Africa', 'Inactive'],
    ['Lilongwe', 'Malawi', 'Africa', 'Inactive'],
    ['Bamako', 'Mali', 'Africa', 'Inactive'],
    ['Nouakchott', 'Mauritania', 'Africa', 'Inactive'],
    ['Beau Bassin - Rose Hill', 'Mauritius', 'Africa', 'Inactive'],
    ['Curepipe', 'Mauritius', 'Africa', 'Inactive'],
    ['Ebene', 'Mauritius', 'Africa', 'Inactive'],
    ['Grand Bay', 'Mauritius', 'Africa', 'Inactive'],
    ['Moka', 'Mauritius', 'Africa', 'Inactive'],
    ['Port Louis', 'Mauritius', 'Africa', 'Inactive'],
    ['Quatre Bornes', 'Mauritius', 'Africa', 'Inactive'],
    ['Roches Noires', 'Mauritius', 'Africa', 'Inactive'],
    ['Casablanca', 'Morrocco', 'Africa', 'Inactive'],
    ['Kenitra', 'Morrocco', 'Africa', 'Inactive'],
    ['Khouribga', 'Morrocco', 'Africa', 'Inactive'],
    ['Marrakesh', 'Morrocco', 'Africa', 'Inactive'],
    ['Rabat', 'Morrocco', 'Africa', 'Inactive'],
    ['Tangier', 'Morrocco', 'Africa', 'Inactive'],
    ['Beira', 'Mozambique', 'Africa', 'Inactive'],
    ['Maputo', 'Mozambique', 'Africa', 'Inactive'],
    ['Swakopmund', 'Namibia', 'Africa', 'Inactive'],
    ['Walvis Bay', 'Namibia', 'Africa', 'Inactive'],
    ['Windhoek', 'Namibia', 'Africa', 'Inactive'],
    ['Niamey', 'Niger', 'Africa', 'Inactive'],
    ['Abuja', 'Nigeria', 'Africa', 'Inactive'],
    ['Ibadan', 'Nigeria', 'Africa', 'Inactive'],
    ['Lagos', 'Nigeria', 'Africa', 'Inactive'],
    ['Port Harcourt', 'Nigeria', 'Africa', 'Inactive'],
    ['Saint-Pierre', 'Reunion Island', 'Africa', 'Inactive'],
    ['St Denis', 'Reunion Island', 'Africa', 'Inactive'],
    ['Butare', 'Rwanda', 'Africa', 'Inactive'],
    ['Kigali', 'Rwanda', 'Africa', 'Inactive'],
    ['Dakar', 'Senegal', 'Africa', 'Inactive'],
    ['Victoria', 'Seychelles', 'Africa', 'Inactive'],
    ['Bloemfontein', 'South Africa', 'Africa', 'Inactive'],
    ['Bloemfontein', 'South Africa', 'Africa', 'Inactive'],
    ['Durban', 'South Africa', 'Africa', 'Inactive'],
    ['Edenburg', 'South Africa', 'Africa', 'Inactive'],
    ['Greyton', 'South Africa', 'Africa', 'Inactive'],
    ['Hartebeespoort', 'South Africa', 'Africa', 'Inactive'],
    ['Kimberley', 'South Africa', 'Africa', 'Inactive'],
    ['Makhanda (Grahamastown)', 'South Africa', 'Africa', 'Inactive'],
    ['Mombela', 'South Africa', 'Africa', 'Inactive'],
    ['Plettenberg Bay', 'South Africa', 'Africa', 'Inactive'],
    ['Port Elizabeth', 'South Africa', 'Africa', 'Inactive'],
    ['Pretoria', 'South Africa', 'Africa', 'Inactive'],
    ['Somerset West', 'South Africa', 'Africa', 'Inactive'],
    ['Stellenbosch', 'South Africa', 'Africa', 'Inactive'],
    ['Umhlanga', 'South Africa', 'Africa', 'Inactive'],
    ['Juba', 'South Sudan', 'Africa', 'Inactive'],
    ['Khartoum', 'Sudan', 'Africa', 'Inactive'],
    ['Matsapha', 'Swaziland', 'Africa', 'Inactive'],
    ['Mbabane', 'Swaziland', 'Africa', 'Inactive'],
    ['Dar es Salaam', 'Tanzania', 'Africa', 'Inactive'],
    ['Zanzibar', 'Tanzania', 'Africa', 'Inactive'],
    ['Hammamet', 'Tunisia', 'Africa', 'Inactive'],
    ['Sfax', 'Tunisia', 'Africa', 'Inactive'],
    ['Tunis', 'Tunisia', 'Africa', 'Inactive'],
    ['Gulu', 'Uganda', 'Africa', 'Inactive'],
    ['Kampala', 'Uganda', 'Africa', 'Inactive'],
    ['Wampeewo', 'Uganda', 'Africa', 'Inactive'],
    ['London', 'United Kingdom', 'Europe', 'Inactive'],
    ['Lusaka', 'Zambia', 'Africa', 'Inactive'],
    ['Harare', 'Zimbabwe', 'Africa', 'Inactive'],
];

export const CITIES: City[] = rawCities.map(
    ([city, country, continent, status], index) => ({
        id: `city-${index}`,
        city,
        country,
        continent,
        status,
    }),
);

export const ACTIVE_CITIES = CITIES.filter(
    (entry) => entry.status === 'Active',
);

export function cityById(id: string): City | undefined {
    return CITIES.find((entry) => entry.id === id);
}
