<?php

namespace App\Http\Controllers;

use App\Http\Requests\EstimatorAccessRequest;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;

class EstimatorAccessController extends Controller
{
    /**
     * Record an estimator access request as a lead.
     */
    public function store(EstimatorAccessRequest $request): JsonResponse
    {
        Lead::create([
            ...$request->validated(),
            'type' => 'quote',
            'submitted_at' => now(),
        ]);

        return response()->json(['status' => 'ok']);
    }
}
