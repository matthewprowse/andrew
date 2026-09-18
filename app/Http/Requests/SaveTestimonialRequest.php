<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveTestimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('testimonials', $this->isMethod('post') ? 'create' : 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'quote' => ['required', 'string', 'max:10000'],
            'author' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'serviceId' => ['nullable', 'integer', 'exists:services,id'],
            'sortOrder' => ['required', 'integer', 'min:0', 'max:100000'],
            'status' => ['required', Rule::in(['Draft', 'Live', 'Published'])],
        ];
    }
}
