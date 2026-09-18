<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Gated by the `resources` permission section, per
 * docs/ADMIN_UX_SEO_BUILD_PLAN.md §5's explicit instruction to reuse
 * existing source-specific permission keys rather than adding a new
 * `config/admin.php` section for FAQs ("resources for downloads and the
 * new FAQ workspace").
 */
class SaveFaqRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('resources', $this->isMethod('post') ? 'create' : 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'question' => ['required', 'string', 'max:10000'],
            'answer' => ['required', 'string', 'max:20000'],
            'serviceId' => ['nullable', 'integer', 'exists:services,id'],
            'serviceIds' => ['sometimes', 'array'],
            'serviceIds.*' => ['integer', 'exists:services,id'],
            'status' => ['required', Rule::in(['Draft', 'Live', 'Published'])],
            'reviewDate' => ['nullable', 'date'],
        ];
    }
}
