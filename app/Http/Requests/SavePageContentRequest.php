<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SavePageContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('pages', 'edit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'hero_heading' => ['nullable', 'string', 'max:255'],
            'hero_subheading' => ['nullable', 'string', 'max:2000'],
            'intro_heading' => ['nullable', 'string', 'max:255'],
            'intro_body' => ['nullable', 'string', 'max:10000'],
            'intro_image_media_id' => ['nullable', 'integer', 'exists:media,id'],
            'sections' => ['sometimes', 'array', 'max:12'],
            'sections.*.heading' => ['required', 'string', 'max:255'],
            'sections.*.description' => ['nullable', 'string', 'max:2000'],
            'show_team_section' => ['sometimes', 'boolean'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:320'],
            'og_image_media_id' => ['nullable', 'integer', 'exists:media,id'],

            // PUB-02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B):
            // the revision id this edit started from — null only when the
            // page had no revisions at all yet. PageContentController
            // compares this to the page's actual latest revision at save
            // time to detect a concurrent edit.
            'base_revision_id' => ['nullable', 'integer'],

            // CMS-02: only meaningful for slug 'home', ignored by the controller
            // for every other slug. Each block is independently optional so a
            // save that only touches some blocks doesn't require resending all.
            'home_blocks' => ['sometimes', 'array'],
            'home_blocks.servicesIntro' => ['sometimes', 'array'],
            'home_blocks.servicesIntro.enabled' => ['sometimes', 'boolean'],
            'home_blocks.servicesIntro.text' => ['nullable', 'string', 'max:2000'],
            'home_blocks.africanReachIntro' => ['sometimes', 'array'],
            'home_blocks.africanReachIntro.enabled' => ['sometimes', 'boolean'],
            'home_blocks.africanReachIntro.text' => ['nullable', 'string', 'max:2000'],
            'home_blocks.audiences' => ['sometimes', 'array'],
            'home_blocks.audiences.enabled' => ['sometimes', 'boolean'],
            'home_blocks.audiences.items' => ['sometimes', 'array', 'max:3'],
            'home_blocks.audiences.items.*.title' => ['nullable', 'string', 'max:255'],
            'home_blocks.audiences.items.*.text' => ['nullable', 'string', 'max:1000'],
            'home_blocks.partnership' => ['sometimes', 'array'],
            'home_blocks.partnership.enabled' => ['sometimes', 'boolean'],
            'home_blocks.partnership.body' => ['nullable', 'string', 'max:2000'],
            'home_blocks.resourcesIntro' => ['sometimes', 'array'],
            'home_blocks.resourcesIntro.enabled' => ['sometimes', 'boolean'],
            'home_blocks.resourcesIntro.text' => ['nullable', 'string', 'max:2000'],
            'home_blocks.finalCta' => ['sometimes', 'array'],
            'home_blocks.finalCta.enabled' => ['sometimes', 'boolean'],
            'home_blocks.finalCta.description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
