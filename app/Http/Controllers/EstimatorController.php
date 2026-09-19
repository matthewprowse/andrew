<?php

namespace App\Http\Controllers;

use App\Http\Requests\CalculateEstimateRequest;
use App\Models\EstimatorCity;
use App\Models\EstimatorService;
use App\Services\EstimatorCalculator;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class EstimatorController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('estimator', [
            'cities' => EstimatorCity::active()->ordered()->get()
                ->map(fn (EstimatorCity $city) => $city->publicData()),
            'services' => EstimatorService::active()->orderBy('category')->orderBy('sort_order')->get()
                ->map(fn (EstimatorService $service) => $service->publicData()),
        ]);
    }

    public function calculate(CalculateEstimateRequest $request): JsonResponse
    {
        $result = (new EstimatorCalculator)->calculate($request->validated());

        return response()->json($result);
    }
}
