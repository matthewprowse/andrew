<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveEstimatorCityRequest;
use App\Models\EstimatorCity;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EstimatorCityController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/estimator/cities', [
            'cities' => EstimatorCity::query()->orderBy('country')->orderBy('city')->get()
                ->map(fn (EstimatorCity $city) => $city->adminData()),
        ]);
    }

    public function store(SaveEstimatorCityRequest $request): RedirectResponse
    {
        EstimatorCity::create($this->fields($request));

        return to_route('admin.estimator.cities');
    }

    public function update(SaveEstimatorCityRequest $request, EstimatorCity $estimatorCity): RedirectResponse
    {
        $estimatorCity->update($this->fields($request));

        return to_route('admin.estimator.cities');
    }

    /** @return array<string, mixed> */
    private function fields(SaveEstimatorCityRequest $request): array
    {
        $data = $request->validated();

        return [
            'city' => $data['city'],
            'country' => $data['country'],
            'continent' => $data['continent'],
            'status' => $data['status'] === 'Active' ? 'active' : 'inactive',
            'sort_order' => $data['sortOrder'],
        ];
    }
}
