<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecordAnalyticsEventRequest;
use App\Services\AnalyticsRecorder;
use Illuminate\Http\JsonResponse;

class AnalyticsEventController extends Controller
{
    public function store(RecordAnalyticsEventRequest $request, AnalyticsRecorder $recorder): JsonResponse
    {
        $recorder->record($request, $request->validated());

        return response()->json(['status' => 'ok']);
    }
}
