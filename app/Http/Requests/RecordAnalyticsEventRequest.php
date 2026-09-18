<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RecordAnalyticsEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'event_type' => ['required', Rule::in(['cta_click', 'resource_download'])],
            'path' => ['nullable', 'string', 'max:2048'],
            'label' => ['required_if:event_type,cta_click', 'nullable', 'string', 'max:255'],
            'service_id' => ['nullable', 'integer', Rule::exists('services', 'id')],
            'resource_item_id' => ['required_if:event_type,resource_download', 'nullable', 'integer', Rule::exists('resource_items', 'id')],
        ];
    }
}
