<?php

namespace App\Http\Requests;

use App\Models\Service;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ContactRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'service_id' => ['nullable', 'integer', Rule::exists('services', 'id')->where('status', 'published')],
            'custom_fields' => ['sometimes', 'array', 'max:20'],
            'custom_fields.*' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator): void {
            $service = $this->integer('service_id') > 0
                ? Service::query()->whereKey($this->integer('service_id'))->first()
                : null;
            $values = $this->input('custom_fields', []);

            if (! $service) {
                return;
            }

            /** @var list<array{key: string, label: string, required?: bool}> $contactFields */
            $contactFields = $service->contact_fields ?? [];
            foreach ($contactFields as $field) {
                if (($field['required'] ?? false) && blank($values[$field['key']] ?? null)) {
                    $validator->errors()->add("custom_fields.{$field['key']}", "The {$field['label']} field is required.");
                }
            }
        });
    }
}
