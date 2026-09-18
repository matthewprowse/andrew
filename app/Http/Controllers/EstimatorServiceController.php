<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveEstimatorServiceRequest;
use App\Models\EstimatorService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EstimatorServiceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/estimator/services-pricing', [
            'services' => EstimatorService::query()->orderBy('category')->orderBy('sort_order')->get()
                ->map(fn (EstimatorService $service) => $service->adminData()),
        ]);
    }

    public function store(SaveEstimatorServiceRequest $request): RedirectResponse
    {
        EstimatorService::create($this->fields($request));

        return to_route('admin.estimator.services-pricing');
    }

    public function update(SaveEstimatorServiceRequest $request, EstimatorService $estimatorService): RedirectResponse
    {
        $estimatorService->update($this->fields($request));

        return to_route('admin.estimator.services-pricing');
    }

    /** @return array<string, mixed> */
    private function fields(SaveEstimatorServiceRequest $request): array
    {
        $data = $request->validated();

        return [
            'category' => $data['category'] === 'Costs' ? 'costs' : 'services',
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'selected_by_default' => $data['selectedByDefault'] ?? false,
            'active' => $data['active'] ?? false,
            'tiered_pricing' => $data['tieredPricing'] ?? false,
            'first_threshold' => $data['firstThreshold'] ?? 0,
            'adjustment_above_threshold' => $data['adjustmentAboveThreshold'] ?? 0,
            'next_threshold' => $data['nextThreshold'] ?? 0,
            'adjustment_above_next_threshold' => $data['adjustmentAboveNextThreshold'] ?? 0,
            'sort_order' => $data['sortOrder'],
        ];
    }
}
