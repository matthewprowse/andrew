<?php

namespace App\Support;

use App\Models\Service;
use App\Models\SiteSetting;
use Illuminate\Support\Facades\Schema;

class PublicSettings
{
    /** @return array<string, mixed> */
    public static function defaults(): array
    {
        // euraHeading/euraText are intentionally left empty. The copy pack (docs/content-remediation/copy/site.json)
        // carries EuRA membership copy, but it's an unverified factual claim pending client
        // confirmation — see docs/content-remediation/05-client-confirmation.md — so it must not
        // be published here until that confirmation lands.
        // organizationLogo is deliberately separate from defaultOgImage: the
        // logo identifies the organization in Organization structured data,
        // while defaultOgImage is a page-share-image fallback. Conflating
        // them made every page's structured-data "logo" whatever image that
        // page happened to be sharing.
        // feedbackEnabled governs the admin-tool feedback FAB
        // (resources/js/components/admin/feedback-fab.tsx) — an
        // admin-workspace-only concern, not public site content, but stored
        // here to reuse the existing single-row settings infrastructure
        // rather than adding a whole new settings section for one toggle.
        return [
            'footerText' => 'Relocation Africa helps employers, global mobility teams and relocating families navigate mobility, immigration, research, remuneration and training across Africa.',
            'copyrightLine' => '© Relocation Africa. All rights reserved.',
            'defaultCtaText' => 'Make your African move work.',
            'defaultCtaDescription' => 'Whether you are moving one employee or building a regional mobility programme, Relocation Africa brings local insight, practical coordination and personal support to every stage of the journey.',
            'defaultCtaButtonLabel' => 'Talk to our team',
            'defaultCtaLink' => '/contact',
            'euraHeading' => '',
            'euraText' => '',
            'organizationName' => 'Relocation Africa',
            'defaultOgImage' => '',
            'organizationLogo' => '',
            'feedbackEnabled' => true,
            'marketingTheme' => [
                'preset' => 'neutral',
                'mode' => 'system',
                'colors' => [],
            ],
        ];
    }

    /** @return array<string, mixed> */
    public static function normalizeSite(array $site): array
    {
        $defaults = self::defaults();
        $marketingTheme = is_array($site['marketingTheme'] ?? null) ? $site['marketingTheme'] : [];

        // Keep existing installations on the old settings shape working while
        // the appearance editor moves the values into its own namespace.
        $marketingTheme['preset'] ??= $site['themePreset'] ?? $defaults['marketingTheme']['preset'];
        $marketingTheme['mode'] ??= $site['themeMode'] ?? $defaults['marketingTheme']['mode'];
        $marketingTheme['colors'] = is_array($marketingTheme['colors'] ?? null) ? $marketingTheme['colors'] : [];
        // Older Appearance builds used "muted" for descriptive text. Keep
        // that saved choice as the full ShadCN muted foreground token when
        // normalizing the expanded theme schema.
        if (isset($marketingTheme['colors']['muted']) && ! isset($marketingTheme['colors']['mutedForeground'])) {
            $marketingTheme['colors']['mutedForeground'] = $marketingTheme['colors']['muted'];
            unset($marketingTheme['colors']['muted']);
        }

        return [...$defaults, ...$site, 'marketingTheme' => $marketingTheme];
    }

    /** @return list<array{id: string, label: string, link: string, section: string, parentId: string|null, sortOrder: int, childrenSource: string}> */
    public static function menu(): array
    {
        $items = [];
        $add = static function (string $id, string $label, string $link, string $section = 'header', ?string $parentId = null, string $source = 'manual') use (&$items): void {
            $items[] = ['id' => $id, 'label' => $label, 'link' => $link, 'section' => $section, 'parentId' => $parentId, 'sortOrder' => count($items), 'childrenSource' => $source];
        };
        $add('services', 'Services', '/services', 'header', null, 'services');
        foreach (['locations' => 'Locations', 'contact' => 'Contact Us'] as $slug => $label) {
            $add($slug, $label, '/'.$slug);
        }
        // Estimator is intentionally omitted from public navigation until it is
        // approved for marketing launch. About/Insights/Resources are
        // secondary destinations, so they live in the footer rather than the header.
        // Careers no longer has its own footer link — open positions are listed
        // at the bottom of /about instead.
        foreach (['' => 'Home', 'about' => 'Relocation Africa', 'services' => 'Services', 'blog' => 'Insights', 'resources' => 'Resources', 'locations' => 'Locations', 'contact' => 'Contact Us'] as $slug => $label) {
            $add('footer-'.($slug ?: 'home'), $label, '/'.$slug, 'footer');
        }

        return $items;
    }

    /** @return array{site: array<string, mixed>, menu: list<array{id: string, label: string, link: string, section: string, parentId: string|null, sortOrder: int, childrenSource: string, children: array<int, array{id: string, label: string, link: string}>}>, socialLinks: list<array{id: string, platform: string, url: string, sortOrder: int}>} */
    public static function read(): array
    {
        $record = Schema::hasTable('site_settings') ? SiteSetting::find(1) : null;
        $site = self::defaults();
        $menu = self::menu();
        $socialLinks = [];
        if ($record) {
            $site = self::normalizeSite($record->site);
            $menu = $record->menu;
            $socialLinks = $record->social_links;
        }
        usort($menu, static fn (array $left, array $right): int => $left['sortOrder'] <=> $right['sortOrder']);
        $services = Schema::hasTable('services') ? Service::query()->where('status', 'published')->orderBy('sort_order')->orderBy('id')->get(['id', 'name', 'slug']) : collect();
        $resolved = [];
        foreach ($menu as $item) {
            if ($item['parentId'] !== null) {
                continue;
            }
            $children = $item['childrenSource'] === 'services'
                ? $services->map(static fn (Service $service): array => ['id' => 'service-'.$service->id, 'label' => $service->name, 'link' => $service->slug])->values()->all()
                : array_values(array_map(static fn (array $child): array => ['id' => $child['id'], 'label' => $child['label'], 'link' => $child['link']], array_filter($menu, static fn (array $child): bool => $child['parentId'] === $item['id'])));
            $resolved[] = [...$item, 'children' => $children];
        }
        usort($socialLinks, static fn (array $left, array $right): int => $left['sortOrder'] <=> $right['sortOrder']);

        return ['site' => $site, 'menu' => $resolved, 'socialLinks' => $socialLinks];
    }
}
