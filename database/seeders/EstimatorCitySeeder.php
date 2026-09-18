<?php

namespace Database\Seeders;

use App\Models\EstimatorCity;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EstimatorCitySeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            if (EstimatorCity::query()->exists()) {
                return;
            }

            // [city, country, continent, status]. Ported from resources/js/lib/estimator-cities.ts,
            // with the two exact-duplicate rows (Tripoli/Libya, Bloemfontein/South Africa) removed
            // and the "Morrocco" typo corrected to "Morocco".
            $cities = [
                ['Cape Town', 'South Africa', 'Africa', 'active'],
                ['Johannesburg', 'South Africa', 'Africa', 'active'],
                ['New York', 'United States of America', 'North America', 'active'],
                ['Algiers', 'Algeria', 'Africa', 'inactive'],
                ['Oran', 'Algeria', 'Africa', 'inactive'],
                ['Luanda', 'Angola', 'Africa', 'inactive'],
                ['Gaborone', 'Botswana', 'Africa', 'inactive'],
                ['Maun', 'Botswana', 'Africa', 'inactive'],
                ['Ouagadougou', 'Burkina Faso', 'Africa', 'inactive'],
                ['Bujumbura', 'Burundi', 'Africa', 'inactive'],
                ['Douala', 'Cameroon', 'Africa', 'inactive'],
                ['Yaounde', 'Cameroon', 'Africa', 'inactive'],
                ['Bangui', 'Central African Republic', 'Africa', 'inactive'],
                ['Beijing', 'China', 'Asia', 'inactive'],
                ['Brazzaville', 'Congo', 'Africa', 'inactive'],
                ['Pointe-Noire', 'Congo', 'Africa', 'inactive'],
                ['Kinshasa', 'Democratic Republic of Congo', 'Africa', 'inactive'],
                ['Djibouti City', 'Djibouti', 'Africa', 'inactive'],
                ['Alexandria', 'Egypt', 'Africa', 'inactive'],
                ['Cairo', 'Egypt', 'Africa', 'inactive'],
                ['Malabo', 'Equatorial Guinea', 'Africa', 'inactive'],
                ['Addis Ababa', 'Ethiopia', 'Africa', 'inactive'],
                ['Libreville', 'Gabon', 'Africa', 'inactive'],
                ['Port-Gentil', 'Gabon', 'Africa', 'inactive'],
                ['Accra', 'Ghana', 'Africa', 'inactive'],
                ['Obosomase', 'Ghana', 'Africa', 'inactive'],
                ['Takoradi', 'Ghana', 'Africa', 'inactive'],
                ['Conakry', 'Guinea', 'Africa', 'inactive'],
                ['Simandou', 'Guinea', 'Africa', 'inactive'],
                ['Abidjan', 'Ivory Coast', 'Africa', 'inactive'],
                ['Eldoret', 'Kenya', 'Africa', 'inactive'],
                ['Mombassa', 'Kenya', 'Africa', 'inactive'],
                ['Nairobi', 'Kenya', 'Africa', 'inactive'],
                ['Maseru', 'Lesotho', 'Africa', 'inactive'],
                ['Monrovia', 'Liberia', 'Africa', 'inactive'],
                ['Tripoli', 'Libya', 'Africa', 'inactive'],
                ['Antananarivo', 'Madagascar', 'Africa', 'inactive'],
                ['Blantyre', 'Malawi', 'Africa', 'inactive'],
                ['Kasisi', 'Malawi', 'Africa', 'inactive'],
                ['Lilongwe', 'Malawi', 'Africa', 'inactive'],
                ['Bamako', 'Mali', 'Africa', 'inactive'],
                ['Nouakchott', 'Mauritania', 'Africa', 'inactive'],
                ['Beau Bassin - Rose Hill', 'Mauritius', 'Africa', 'inactive'],
                ['Curepipe', 'Mauritius', 'Africa', 'inactive'],
                ['Ebene', 'Mauritius', 'Africa', 'inactive'],
                ['Grand Bay', 'Mauritius', 'Africa', 'inactive'],
                ['Moka', 'Mauritius', 'Africa', 'inactive'],
                ['Port Louis', 'Mauritius', 'Africa', 'inactive'],
                ['Quatre Bornes', 'Mauritius', 'Africa', 'inactive'],
                ['Roches Noires', 'Mauritius', 'Africa', 'inactive'],
                ['Casablanca', 'Morocco', 'Africa', 'inactive'],
                ['Kenitra', 'Morocco', 'Africa', 'inactive'],
                ['Khouribga', 'Morocco', 'Africa', 'inactive'],
                ['Marrakesh', 'Morocco', 'Africa', 'inactive'],
                ['Rabat', 'Morocco', 'Africa', 'inactive'],
                ['Tangier', 'Morocco', 'Africa', 'inactive'],
                ['Beira', 'Mozambique', 'Africa', 'inactive'],
                ['Maputo', 'Mozambique', 'Africa', 'inactive'],
                ['Swakopmund', 'Namibia', 'Africa', 'inactive'],
                ['Walvis Bay', 'Namibia', 'Africa', 'inactive'],
                ['Windhoek', 'Namibia', 'Africa', 'inactive'],
                ['Niamey', 'Niger', 'Africa', 'inactive'],
                ['Abuja', 'Nigeria', 'Africa', 'inactive'],
                ['Ibadan', 'Nigeria', 'Africa', 'inactive'],
                ['Lagos', 'Nigeria', 'Africa', 'inactive'],
                ['Port Harcourt', 'Nigeria', 'Africa', 'inactive'],
                ['Saint-Pierre', 'Reunion Island', 'Africa', 'inactive'],
                ['St Denis', 'Reunion Island', 'Africa', 'inactive'],
                ['Butare', 'Rwanda', 'Africa', 'inactive'],
                ['Kigali', 'Rwanda', 'Africa', 'inactive'],
                ['Dakar', 'Senegal', 'Africa', 'inactive'],
                ['Victoria', 'Seychelles', 'Africa', 'inactive'],
                ['Bloemfontein', 'South Africa', 'Africa', 'inactive'],
                ['Durban', 'South Africa', 'Africa', 'inactive'],
                ['Edenburg', 'South Africa', 'Africa', 'inactive'],
                ['Greyton', 'South Africa', 'Africa', 'inactive'],
                ['Hartebeespoort', 'South Africa', 'Africa', 'inactive'],
                ['Kimberley', 'South Africa', 'Africa', 'inactive'],
                ['Makhanda (Grahamastown)', 'South Africa', 'Africa', 'inactive'],
                ['Mombela', 'South Africa', 'Africa', 'inactive'],
                ['Plettenberg Bay', 'South Africa', 'Africa', 'inactive'],
                ['Port Elizabeth', 'South Africa', 'Africa', 'inactive'],
                ['Pretoria', 'South Africa', 'Africa', 'inactive'],
                ['Somerset West', 'South Africa', 'Africa', 'inactive'],
                ['Stellenbosch', 'South Africa', 'Africa', 'inactive'],
                ['Umhlanga', 'South Africa', 'Africa', 'inactive'],
                ['Juba', 'South Sudan', 'Africa', 'inactive'],
                ['Khartoum', 'Sudan', 'Africa', 'inactive'],
                ['Matsapha', 'Swaziland', 'Africa', 'inactive'],
                ['Mbabane', 'Swaziland', 'Africa', 'inactive'],
                ['Dar es Salaam', 'Tanzania', 'Africa', 'inactive'],
                ['Zanzibar', 'Tanzania', 'Africa', 'inactive'],
                ['Hammamet', 'Tunisia', 'Africa', 'inactive'],
                ['Sfax', 'Tunisia', 'Africa', 'inactive'],
                ['Tunis', 'Tunisia', 'Africa', 'inactive'],
                ['Gulu', 'Uganda', 'Africa', 'inactive'],
                ['Kampala', 'Uganda', 'Africa', 'inactive'],
                ['Wampeewo', 'Uganda', 'Africa', 'inactive'],
                ['London', 'United Kingdom', 'Europe', 'inactive'],
                ['Lusaka', 'Zambia', 'Africa', 'inactive'],
                ['Harare', 'Zimbabwe', 'Africa', 'inactive'],
            ];

            foreach ($cities as $index => [$city, $country, $continent, $status]) {
                EstimatorCity::create([
                    'city' => $city, 'country' => $country, 'continent' => $continent,
                    'status' => $status, 'sort_order' => $index + 1,
                ]);
            }
        });
    }
}
