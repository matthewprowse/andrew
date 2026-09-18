<?php

namespace App\Http\Controllers;

use App\Models\EstimatorCity;
use App\Models\EstimatorRouteRate;
use App\Models\EstimatorService;
use App\Models\EstimatorSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EstimatorOverviewController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('admin/estimator/overview', [
            'stats' => $this->stats(),
            'settings' => EstimatorSettings::current()->adminData(),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'currency' => ['required', 'string', 'max:10'],
            'vatRate' => ['required', 'numeric', 'min:0', 'max:1'],
            'contingencyRate' => ['required', 'numeric', 'min:0', 'max:1'],
            'transitInsuranceShare' => ['required', 'numeric', 'min:0', 'max:1'],
            'validityDays' => ['required', 'integer', 'min:1', 'max:3650'],
        ]);

        EstimatorSettings::current()->update([
            'currency' => $data['currency'],
            'vat_rate' => $data['vatRate'],
            'contingency_rate' => $data['contingencyRate'],
            'transit_insurance_share' => $data['transitInsuranceShare'],
            'validity_days' => $data['validityDays'],
        ]);

        return to_route('admin.estimator.overview');
    }

    public function catalogueControl(): Response
    {
        return Inertia::render('admin/estimator/catalogue-control', [
            'stats' => $this->stats(),
        ]);
    }

    /** @return array<string, int> */
    private function stats(): array
    {
        return [
            'activeServices' => EstimatorService::active()->count(),
            'activeCities' => EstimatorCity::active()->count(),
            'inactiveCities' => EstimatorCity::where('status', 'inactive')->count(),
            'pricedRoutes' => EstimatorRouteRate::where(fn ($q) => $q->whereNotNull('economy_rate_usd')->orWhereNotNull('business_rate_usd'))->count(),
        ];
    }
}
