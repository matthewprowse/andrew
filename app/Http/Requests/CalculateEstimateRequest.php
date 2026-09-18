<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CalculateEstimateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'origin_city_id' => ['required', 'integer', 'exists:estimator_cities,id'],
            'destination_city_id' => ['required', 'integer', 'exists:estimator_cities,id', 'different:origin_city_id'],
            'people' => ['required', 'integer', 'min:1', 'max:50'],
            'tier' => ['required', Rule::in(['Standard', 'Premium'])],
            'selected' => ['required', 'array', 'min:1'],
            'selected.*' => ['string'],
            'bedrooms' => ['required', 'integer', 'min:1', 'max:4'],
            'weeks' => ['required', 'integer', 'min:1', 'max:52'],
            'container' => ['required', Rule::in(['20ft container', '40ft container'])],
            'pets' => ['required', 'integer', 'min:0', 'max:20'],
            'visa_amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
