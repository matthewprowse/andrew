<?php

namespace App\Support;

use App\Models\Page;
use App\Models\Service;
use Illuminate\Validation\Rule;

/**
 * URL segments no Page or Service may claim as its slug — every top-level
 * route the app itself owns. Shared by SaveServiceRequest and
 * CreatePageRequest so a page and a service can never collide with each
 * other or with a system route.
 */
class ReservedSlugs
{
    public const WORDS = [
        'admin', 'services', 'contact', 'estimator', 'careers', 'about', 'blog', 'resources',
        'locations', 'dashboard', 'settings', 'login', 'logout', 'register', 'forgot-password',
        'reset-password', 'verify-email', 'confirm-password', 'two-factor-challenge', 'up',
        'storage', 'build', 'api', 'user', 'sanctum', 'checkout', 'webhooks',
    ];

    /**
     * The full slug-validation rule set for a Page — format, reserved
     * words, and no collision with an existing page or service. Shared by
     * page creation and the slug-rename action so both enforce exactly the
     * same rule. Pass `$ignorePageId` when validating a rename, so the
     * page's own current slug doesn't fail the uniqueness check against
     * itself.
     *
     * @return array<int, mixed>
     */
    public static function pageRules(?int $ignorePageId = null): array
    {
        return [
            'required', 'string', 'max:255', 'regex:~^[a-z0-9]+(?:-[a-z0-9]+)*$~',
            Rule::unique('pages', 'slug')->ignore($ignorePageId),
            function (string $attribute, mixed $value, \Closure $fail) {
                if (in_array($value, self::WORDS, true)) {
                    $fail('This URL is reserved.');
                }
                if (Service::where('slug', $value)->exists()) {
                    $fail('This URL is already used by a service.');
                }
            },
        ];
    }

    /**
     * A short, unique "untitled-page[-2, -3, …]" style slug for quick-created pages.
     *
     * @return array{0: string, 1: string} [title, slug]
     */
    public static function nextUntitled(): array
    {
        $n = 1;
        do {
            $suffix = $n === 1 ? '' : "-{$n}";
            $slug = "untitled-page{$suffix}";
            $title = $n === 1 ? 'Untitled Page' : "Untitled Page {$n}";
            $n++;
        } while (Page::where('slug', $slug)->exists() || Service::where('slug', $slug)->exists());

        return [$title, $slug];
    }
}
