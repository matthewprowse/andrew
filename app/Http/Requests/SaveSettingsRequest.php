<?php

namespace App\Http\Requests;

use App\Support\PublicSettings;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAdmin('settings', 'edit') ?? false;
    }

    /** @return array<string, list<string|Closure(string, mixed, Closure(string): void): void>|string> */
    public function rules(): array
    {
        $link = function ($attribute, $value, $fail) {
            if (preg_match('/[\\\\\x00-\x20\x7f]/', $value) || str_starts_with($value, '//') || ! (str_starts_with($value, '/') || preg_match('~^https?://~i', $value) && filter_var($value, FILTER_VALIDATE_URL) || preg_match('/^mailto:[^?]+$/i', $value) && filter_var(substr($value, 7), FILTER_VALIDATE_EMAIL) || preg_match('/^tel:[+0-9()-]+$/', $value))) {
                $fail('Use a valid local path, https/http URL, email link or telephone link.');
            }
        };
        if (in_array($this->route('section'), ['site', 'appearance'], true)) {
            return [
                'site' => ['required', 'array'],
                'site.footerText' => ['present', 'nullable', 'string', 'max:5000'],
                'site.copyrightLine' => ['present', 'nullable', 'string', 'max:500'],
                'site.defaultCtaText' => ['present', 'nullable', 'string', 'max:500'],
                'site.defaultCtaDescription' => ['present', 'nullable', 'string', 'max:5000'],
                'site.defaultCtaButtonLabel' => ['present', 'nullable', 'string', 'max:255'],
                'site.defaultCtaLink' => ['present', 'nullable', 'string', 'max:2048', $link],
                'site.euraHeading' => ['present', 'nullable', 'string', 'max:255'],
                'site.euraText' => ['present', 'nullable', 'string', 'max:10000'],
                'site.organizationName' => ['present', 'nullable', 'string', 'max:255'],
                'site.defaultOgImage' => ['present', 'nullable', 'string', 'max:2048'],
                'site.organizationLogo' => ['present', 'nullable', 'string', 'max:2048'],
                'site.feedbackEnabled' => ['present', 'boolean'],
                'site.marketingTheme' => ['sometimes', 'array'],
                'site.marketingTheme.preset' => ['sometimes', 'string', Rule::in(['neutral', 'blue', 'emerald', 'amber', 'rose', 'violet'])],
                'site.marketingTheme.mode' => ['sometimes', 'string', Rule::in(['system', 'light', 'dark'])],
                'site.marketingTheme.colors' => ['sometimes', 'array'],
                'site.marketingTheme.colors.*' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            ];
        }
        if ($this->route('section') === 'menu') {
            return ['menu' => ['present', 'array', 'max:100'], 'menu.*' => ['array:id,label,link,section,parentId,sortOrder,childrenSource'], 'menu.*.id' => ['required', 'string', 'max:100', 'distinct'], 'menu.*.label' => ['required', 'string', 'max:255'], 'menu.*.link' => ['required', 'string', 'max:2048', $link], 'menu.*.section' => ['required', Rule::in(['header', 'footer'])], 'menu.*.parentId' => ['present', 'nullable', 'string', 'max:100'], 'menu.*.sortOrder' => ['required', 'integer', 'min:0', 'max:10000'], 'menu.*.childrenSource' => ['required', Rule::in(['manual', 'services'])]];
        }

        return ['socialLinks' => ['present', 'array', 'max:50'], 'socialLinks.*' => ['array:id,platform,url,sortOrder'], 'socialLinks.*.id' => ['required', 'string', 'max:100', 'distinct'], 'socialLinks.*.platform' => ['required', 'string', 'max:255'], 'socialLinks.*.url' => ['required', 'string', 'max:2048', $link], 'socialLinks.*.sortOrder' => ['required', 'integer', 'min:0', 'max:10000']];
    }

    /** @return list<Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || $this->route('section') !== 'menu') {
                return;
            }
            $menu = $this->input('menu', []);
            if (! is_array($menu)) {
                return;
            } foreach ($menu as $index => $item) {
                if (! is_array($item)) {
                    continue;
                }
                if ($item['parentId'] === null) {
                    continue;
                }
                $parent = collect($menu)->first(static fn (mixed $entry): bool => is_array($entry) && ($entry['id'] ?? null) === $item['parentId']);
                if (! is_array($parent) || ($parent['id'] ?? null) === ($item['id'] ?? null) || ($parent['parentId'] ?? null) !== null || ($parent['section'] ?? null) !== ($item['section'] ?? null) || ($parent['childrenSource'] ?? null) !== 'manual' || ($item['childrenSource'] ?? null) !== 'manual') {
                    $validator->errors()->add('menu.'.$index.'.parentId', 'Choose a top-level manual parent in the same menu; nested groups and cycles are not allowed.');
                }
            }
        }];
    }

    /** @return array<string, mixed> */
    public function siteSettings(): array
    {
        $defaults = PublicSettings::defaults();
        $site = $this->input('site', []);

        $marketingTheme = $this->input('site.marketingTheme', []);
        $defaults = $defaults['marketingTheme'];

        $allowedMarketingColors = ['background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground', 'primary', 'primaryForeground', 'secondary', 'secondaryForeground', 'muted', 'mutedForeground', 'accent', 'accentForeground', 'destructive', 'destructiveForeground', 'border', 'input', 'ring', 'chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'surface', 'heading', 'headingSecondary', 'headingTertiary', 'body', 'link', 'linkHover'];

        return [
            'footerText' => $this->string('site.footerText')->toString(),
            'copyrightLine' => $this->string('site.copyrightLine')->toString(),
            'defaultCtaText' => $this->string('site.defaultCtaText')->toString(),
            'defaultCtaDescription' => $this->string('site.defaultCtaDescription')->toString(),
            'defaultCtaButtonLabel' => $this->string('site.defaultCtaButtonLabel')->toString(),
            'defaultCtaLink' => $this->string('site.defaultCtaLink')->toString(),
            'euraHeading' => $this->string('site.euraHeading')->toString(),
            'euraText' => $this->string('site.euraText')->toString(),
            'organizationName' => $this->string('site.organizationName')->toString(),
            'defaultOgImage' => $this->string('site.defaultOgImage')->toString(),
            'organizationLogo' => $this->string('site.organizationLogo')->toString(),
            'feedbackEnabled' => $this->boolean('site.feedbackEnabled'),
            'marketingTheme' => [
                'preset' => $marketingTheme['preset'] ?? $defaults['preset'],
                'mode' => $marketingTheme['mode'] ?? $defaults['mode'],
                'colors' => is_array($marketingTheme['colors'] ?? null) ? array_intersect_key($marketingTheme['colors'], array_flip($allowedMarketingColors)) : [],
            ],
        ];
    }

    /** @return list<array{id: string, label: string, link: string, section: 'header'|'footer', parentId: string|null, sortOrder: int, childrenSource: 'manual'|'services'}> */
    public function menuEntries(): array
    {
        $entries = [];
        foreach ($this->input('menu', []) as $item) {
            if (! is_array($item)) {
                continue;
            } $entries[] = ['id' => (string) ($item['id'] ?? ''), 'label' => (string) ($item['label'] ?? ''), 'link' => (string) ($item['link'] ?? ''), 'section' => $item['section'] === 'footer' ? 'footer' : 'header', 'parentId' => isset($item['parentId']) ? (string) $item['parentId'] : null, 'sortOrder' => (int) ($item['sortOrder'] ?? 0), 'childrenSource' => $item['childrenSource'] === 'services' ? 'services' : 'manual'];
        }

        return $entries;
    }

    /** @return list<array{id: string, platform: string, url: string, sortOrder: int}> */
    public function socialLinkEntries(): array
    {
        $entries = [];
        foreach ($this->input('socialLinks', []) as $item) {
            if (! is_array($item)) {
                continue;
            } $entries[] = ['id' => (string) ($item['id'] ?? ''), 'platform' => (string) ($item['platform'] ?? ''), 'url' => (string) ($item['url'] ?? ''), 'sortOrder' => (int) ($item['sortOrder'] ?? 0)];
        }

        return $entries;
    }
}
