<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveEstimatorServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('estimator', $this->isMethod('post') ? 'create' : 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in(['Costs', 'Services'])],
            'name' => ['required', 'string', 'max:255', Rule::unique('estimator_services', 'name')->ignore($this->route('estimatorService'))],
            'description' => ['nullable', 'string', 'max:2000'],
            'selectedByDefault' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
            'tieredPricing' => ['sometimes', 'boolean'],
            'firstThreshold' => ['required_if:tieredPricing,true', 'nullable', 'integer', 'min:0'],
            'adjustmentAboveThreshold' => ['required_if:tieredPricing,true', 'nullable', 'numeric', 'min:0', 'max:1000'],
            'nextThreshold' => ['required_if:tieredPricing,true', 'nullable', 'integer', 'min:0'],
            'adjustmentAboveNextThreshold' => ['required_if:tieredPricing,true', 'nullable', 'numeric', 'min:0', 'max:1000'],
            'sortOrder' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
