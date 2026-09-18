<?php

namespace App\Http\Requests;

use App\Models\ResourceItem;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveResourceItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('resources', $this->isMethod('post') ? 'create' : 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $safeLink = function (string $attribute, mixed $value, \Closure $fail) {
            if (! preg_match('~^https?://[^\s]+$~i', $value)) {
                $fail('Use an http(s) link.');
            }
        };

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'action_label' => ['nullable', 'string', 'max:255'],
            'file_media_id' => ['nullable', 'integer', 'exists:media,id'],
            'image_media_id' => ['nullable', 'integer', 'exists:media,id'],
            // LIB-03: manual-only service association, mirroring blog_posts'
            // existing serviceId rule — never writes to Service, only reads
            // its id for the FK.
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'service_ids' => ['sometimes', 'array'],
            'service_ids.*' => ['integer', 'exists:services,id'],
            'external_url' => ['nullable', 'string', 'max:2048', $safeLink],
            'access_type' => ['sometimes', Rule::in(ResourceItem::ACCESS_TYPES)],
            'price' => [
                Rule::requiredIf(fn () => $this->input('access_type') === ResourceItem::ACCESS_PAID),
                'nullable', 'string', 'regex:/^\d{1,6}(\.\d{1,2})?$/',
            ],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'price.required' => 'Set a price for a paid resource.',
            'price.regex' => 'Enter the price in US dollars, e.g. 25 or 25.00.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->input('access_type') === ResourceItem::ACCESS_PAID
                && preg_match('/^\d{1,6}(\.\d{1,2})?$/', (string) $this->input('price'))
                && (float) $this->input('price') < 1) {
                $validator->errors()->add('price', 'Set a price of at least US$1.00.');
            }

            if ($this->input('status') !== 'published') {
                return;
            }

            $existing = $this->route('item');
            $hasExistingFile = $existing instanceof ResourceItem && filled($existing->file_media_id);

            if (! filled($this->input('file_media_id')) && ! filled($this->input('external_url')) && ! $hasExistingFile) {
                $validator->errors()->add('file_media_id', 'Add a file or a link before publishing.');
            }
        });
    }
}
