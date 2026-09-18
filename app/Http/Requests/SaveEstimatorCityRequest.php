<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveEstimatorCityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('estimator', $this->isMethod('post') ? 'create' : 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'city' => ['required', 'string', 'max:255'],
            'country' => ['required', 'string', 'max:255'],
            'continent' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['Active', 'Inactive'])],
            'sortOrder' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
