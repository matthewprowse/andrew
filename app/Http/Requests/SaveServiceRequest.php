<?php

namespace App\Http\Requests;

use App\Models\Page;
use App\Support\ReservedSlugs;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('services', $this->isMethod('post') ? 'create' : 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $safeLink = function ($attribute, $value, $fail) {
            if (! preg_match('~^(?:/(?!/)[^\\\\\s]*|https?://[^\s]+|mailto:[^\s]+|tel:[+0-9 ()-]+)$~i', $value)) {
                $fail('Use a local path, http(s), mailto or tel link.');
            }
        };

        return [
            'name' => ['required', 'string', 'max:255'], 'headline' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'regex:~^[a-z0-9]+(?:-[a-z0-9]+)*$~', Rule::unique('services', 'slug')->ignore($this->route('service')), function ($attribute, $value, $fail) {
                if (in_array($value, ReservedSlugs::WORDS, true)) {
                    $fail('This URL is reserved.');
                }
                if (Page::where('slug', $value)->exists()) {
                    $fail('This URL is already used by a page.');
                }
            }],
            'intro' => [Rule::requiredIf(in_array($this->input('status'), ['Live', 'published'], true)), 'nullable', 'string', 'max:15000'], 'body' => ['sometimes', 'nullable', 'string', 'max:100000'], 'rich_content' => ['nullable', 'string', 'max:200000'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:255'], 'banner_image' => ['sometimes', 'nullable', 'string', 'max:2048', 'regex:~^(?:/(?!/)[a-zA-Z0-9/_.%-]+|https?://[^\s]+)$~'],
            'banner_media_id' => ['nullable', 'integer', Rule::exists('media', 'id')->where('kind', 'image')],
            'cta_text' => ['nullable', 'string', 'max:255'], 'cta_description' => ['nullable', 'string', 'max:2000'], 'cta_button_label' => ['nullable', 'string', 'max:255'], 'cta_link' => ['nullable', 'string', 'max:2048', $safeLink],
            'contact_fields' => ['sometimes', 'array', 'max:20'], 'contact_fields.*' => ['array:key,label,type,required,placeholder'], 'contact_fields.*.key' => ['required', 'string', 'alpha_dash', 'max:80'], 'contact_fields.*.label' => ['required', 'string', 'max:255'], 'contact_fields.*.type' => ['required', Rule::in(['text', 'email', 'tel', 'textarea'])], 'contact_fields.*.required' => ['sometimes', 'boolean'], 'contact_fields.*.placeholder' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['Draft', 'Live', 'draft', 'published'])], 'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
            'scope' => ['sometimes', 'array', 'max:50'], 'scope.*' => ['array:heading,intro,items'], 'scope.*.heading' => ['required', 'string', 'max:255'], 'scope.*.intro' => ['nullable', 'string', 'max:10000'], 'scope.*.items' => ['sometimes', 'array', 'max:100'], 'scope.*.items.*' => ['required', 'string', 'max:2000'],
            'faqs' => ['sometimes', 'array', 'max:100'], 'faqs.*' => ['array:question,answer'], 'faqs.*.question' => ['required', 'string', 'max:500'], 'faqs.*.answer' => ['required', 'string', 'max:10000'],
            'countries' => ['sometimes', 'array', 'max:250'], 'countries.*' => ['required', 'string', 'max:255'],
            'featured_primary' => ['sometimes', 'array', 'max:100'], 'featured_primary.*' => ['required', 'string', 'max:2000'],
            'featured_services' => ['sometimes', 'array', 'max:100'], 'featured_services.*' => ['array:name,description,resource_ids'], 'featured_services.*.name' => ['required', 'string', 'max:255'], 'featured_services.*.description' => ['nullable', 'string', 'max:2000'], 'featured_services.*.resource_ids' => ['sometimes', 'array', 'max:50'], 'featured_services.*.resource_ids.*' => ['integer', 'distinct', 'exists:resource_items,id'],
            'meta_title' => ['nullable', 'string', 'max:255'], 'meta_description' => ['nullable', 'string', 'max:320'],
        ];
    }
}
