<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\Faq;
use App\Models\Lead;
use App\Models\Location;
use App\Models\Media;
use App\Models\Order;
use App\Models\Page;
use App\Models\ResourceRequest;
use App\Models\Service;
use App\Models\Testimonial;
use App\Models\User;
use App\Support\ContentLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * LIB-08 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4 batch 4C — the final
 * batch of Phase 4): a single, permission-aware global search across every
 * nonprotected admin workspace, wired into AdminWorkspaceLayout's header now
 * that the content facade (Phase 4A) and the Faq/Testimonials stores
 * (Phase 4B) exist — the exact condition NAV-03 deferred a real search
 * field on.
 *
 * Every source below is gated by its OWN admin.permission section BEFORE
 * its records are even queried — never queried-then-filtered — per the
 * plan's explicit LIB-08 wording ("Match source-specific permissions before
 * counting or returning records"). A viewer who lacks a section's `view`
 * grant causes that section's query to never run at all, so the response
 * carries no trace of it, not just a client-hidden group.
 *
 * Services is included strictly read-only (name/headline match only) and
 * every Services result links to the plain, unmodified /admin/services URL
 * — no query params, no new behavior added to the protected Services
 * screen/controller, per this repo's absolute constraint on that file.
 *
 * Inquiries/leads that have been anonymized ("forgotten") never appear here
 * regardless of query match — see AdminInquiriesController's own
 * forgetLead()/forgetResourceRequest(), which null out identity fields and
 * set anonymized_at. This endpoint additionally excludes any row with
 * anonymized_at set, so a forgotten person's identity can never resurface
 * through search even if a stale/cached query happened to match leftover
 * data.
 */
class AdminSearchController extends Controller
{
    private const PER_SOURCE_LIMIT = 6;

    private const MIN_QUERY_LENGTH = 2;

    public function index(Request $request): JsonResponse
    {
        $query = trim((string) $request->string('q'));
        /** @var User|null $user */
        $user = Auth::user();

        if (mb_strlen($query) < self::MIN_QUERY_LENGTH) {
            return response()->json(['query' => $query, 'groups' => []]);
        }

        $groups = array_values(array_filter([
            $this->pages($user, $query),
            $this->contentLibrary($user, $query),
            $this->testimonials($user, $query),
            $this->faqs($user, $query),
            $this->locations($user, $query),
            $this->inquiries($user, $query),
            $this->orders($user, $query),
            $this->media($user, $query),
            $this->services($user, $query),
        ]));

        return response()->json(['query' => $query, 'groups' => $groups]);
    }

    /** @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null */
    private function pages(?User $user, string $query): ?array
    {
        if (! $user?->canAdmin('pages', 'view')) {
            return null;
        }

        $blockPages = Page::query()
            ->where('kind', Page::KIND_BLOCK)
            ->where(function ($inner) use ($query) {
                $inner->where('title', 'like', "%{$query}%")
                    ->orWhere('meta_title', 'like', "%{$query}%")
                    ->orWhere('slug', 'like', "%{$query}%");
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get()
            ->map(fn (Page $page): array => [
                'id' => 'page:'.$page->id,
                'title' => $page->title ?: ucfirst($page->slug),
                'snippet' => $page->meta_description ?: ('/'.($page->slug === 'home' ? '' : $page->slug)),
                'href' => '/admin/blocks/'.$page->slug,
            ]);

        // Legacy fixed-field pages (Contact, Locations — About moved to the
        // block-pages branch above) still search on hero_heading, the field
        // their editor actually shows.
        $legacyPages = Page::query()
            ->where('kind', Page::KIND_LEGACY)
            ->whereIn('slug', ['contact', 'locations'])
            ->where(function ($inner) use ($query) {
                $inner->where('hero_heading', 'like', "%{$query}%")
                    ->orWhere('meta_title', 'like', "%{$query}%")
                    ->orWhere('slug', 'like', "%{$query}%");
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get()
            ->map(fn (Page $page): array => [
                'id' => 'page:'.$page->id,
                'title' => $page->hero_heading ?: ucfirst($page->slug),
                'snippet' => $page->meta_description ?: ('/'.$page->slug),
                'href' => '/admin/pages/'.$page->slug,
            ]);

        $rows = $blockPages->concat($legacyPages)->take(self::PER_SOURCE_LIMIT);

        return $this->group('pages', 'Pages', $rows->values()->all());
    }

    /**
     * Articles and resources from the Phase 4A read-model facade. Each row
     * type is only ever queried when the viewer holds that type's own
     * section grant — ContentLibrary::list()'s $includeArticles/
     * $includeResources flags skip the underlying BlogPost/ResourceItem
     * query entirely when false, so an article result needs `blog` view and
     * a resource result needs `resources` view, exactly as the ticket
     * requires, with no post-hoc filtering.
     *
     * @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null
     */
    private function contentLibrary(?User $user, string $query): ?array
    {
        $canViewBlog = (bool) $user?->canAdmin('blog', 'view');
        $canViewResources = (bool) $user?->canAdmin('resources', 'view');

        if (! $canViewBlog && ! $canViewResources) {
            return null;
        }

        $needle = Str::lower($query);

        $rows = ContentLibrary::list($canViewBlog, $canViewResources)
            ->filter(fn (array $row): bool => Str::contains(Str::lower((string) $row['title']), $needle))
            ->take(self::PER_SOURCE_LIMIT)
            ->map(fn (array $row): array => [
                'id' => $row['id'],
                'title' => $row['title'],
                'snippet' => trim(($row['category'] ?? '').' · '.$row['status'], ' ·'),
                // The Content Library manager already reads ?edit={id} on
                // mount to open the matching row's own type-specific editor
                // (see content-library-manager.tsx / blog-manager.tsx /
                // resources-manager.tsx) — reuse that existing deep-link
                // scheme rather than inventing a new one.
                'href' => $row['editHref']
                    ? $row['editHref'].'?edit='.$row['editId']
                    : ($row['publicUrl'] ?? '/admin/content'),
            ])
            ->values()
            ->all();

        return $this->group('content', 'Content Library', $rows);
    }

    /** @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null */
    private function testimonials(?User $user, string $query): ?array
    {
        if (! $user?->canAdmin('testimonials', 'view')) {
            return null;
        }

        $rows = Testimonial::query()
            ->where(function ($inner) use ($query) {
                $inner->where('quote', 'like', "%{$query}%")
                    ->orWhere('author', 'like', "%{$query}%")
                    ->orWhere('company', 'like', "%{$query}%");
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get();

        return $this->group('testimonials', 'Testimonials', $rows->map(fn (Testimonial $testimonial): array => [
            'id' => 'testimonial:'.$testimonial->id,
            'title' => $testimonial->author.($testimonial->company ? ' · '.$testimonial->company : ''),
            'snippet' => Str::limit($testimonial->quote, 100),
            'href' => '/admin/testimonials',
        ])->values()->all());
    }

    /**
     * FAQs reuse the `resources` permission section per Phase 4B / the
     * plan's §5 instruction to reuse existing source-specific permission
     * keys rather than add a new config/admin.php section — do not gate
     * this by a `faqs` key, there isn't one.
     *
     * @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null
     */
    private function faqs(?User $user, string $query): ?array
    {
        if (! $user?->canAdmin('resources', 'view')) {
            return null;
        }

        $rows = Faq::query()
            ->where(function ($inner) use ($query) {
                $inner->where('question', 'like', "%{$query}%")
                    ->orWhere('answer', 'like', "%{$query}%");
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get();

        return $this->group('faqs', 'FAQs', $rows->map(fn (Faq $faq): array => [
            'id' => 'faq:'.$faq->id,
            'title' => $faq->question,
            'snippet' => Str::limit($faq->answer, 100),
            'href' => '/admin/faqs',
        ])->values()->all());
    }

    /** @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null */
    private function locations(?User $user, string $query): ?array
    {
        if (! $user?->canAdmin('locations', 'view')) {
            return null;
        }

        $offices = Location::query()
            ->where('office_name', 'like', "%{$query}%")
            ->limit(self::PER_SOURCE_LIMIT)
            ->get()
            ->map(fn (Location $location): array => [
                'id' => 'office:'.$location->id,
                'title' => $location->office_name,
                'snippet' => $location->address,
                'href' => '/admin/locations',
            ]);

        $countries = Country::query()
            ->where('name', 'like', "%{$query}%")
            ->limit(self::PER_SOURCE_LIMIT)
            ->get()
            ->map(fn (Country $country): array => [
                'id' => 'country:'.$country->id,
                'title' => $country->name,
                'snippet' => $country->region ?: '',
                'href' => '/admin/locations',
            ]);

        $rows = $offices->concat($countries)->take(self::PER_SOURCE_LIMIT)->values()->all();

        return $this->group('locations', 'Locations', $rows);
    }

    /**
     * Contact Us leads surfaced on /admin/inquiries. Rows already anonymized
     * via AdminInquiriesController::forgetLead() are excluded outright (whereNull on
     * anonymized_at) rather than relying on their nulled-out name/email no
     * longer matching — a forgotten person's identity must never resurface
     * in search, regardless of query.
     *
     * @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null
     */
    private function inquiries(?User $user, string $query): ?array
    {
        if (! $user?->canAdmin('inquiries', 'view')) {
            return null;
        }

        $leads = Lead::query()
            ->where('type', 'contact')
            ->whereNull('anonymized_at')
            ->where(function ($inner) use ($query) {
                $inner->where('name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('subject', 'like', "%{$query}%");
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get()
            ->map(fn (Lead $lead): array => [
                'id' => 'lead:'.$lead->id,
                'title' => $lead->name ?: $lead->email,
                'snippet' => $lead->subject ?: Str::limit((string) $lead->message, 80),
                'href' => '/admin/inquiries',
            ]);

        return $this->group('inquiries', 'Inquiries', $leads->values()->all());
    }

    /** @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null */
    private function orders(?User $user, string $query): ?array
    {
        if (! $user?->canAdmin('orders', 'view')) {
            return null;
        }

        $resourceRequests = ResourceRequest::query()
            ->with('item')
            ->whereNull('anonymized_at')
            ->where(function ($inner) use ($query) {
                $inner->where('name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('company', 'like', "%{$query}%")
                    ->orWhereHas('item', fn ($item) => $item->where('title', 'like', "%{$query}%"));
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get()
            ->map(fn (ResourceRequest $resourceRequest): array => [
                'id' => 'resource-request:'.$resourceRequest->id,
                'title' => $resourceRequest->name ?: $resourceRequest->email,
                'snippet' => $resourceRequest->company ?: '',
                'href' => '/admin/orders',
            ]);

        $orders = Order::query()
            ->with('item')
            ->whereNull('anonymized_at')
            ->where(function ($inner) use ($query) {
                $inner->where('reference', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhereHas('item', fn ($item) => $item->where('title', 'like', "%{$query}%"));
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => 'order:'.$order->id,
                'title' => $order->reference ?: $order->email,
                'snippet' => $order->item?->title ?: '',
                'href' => '/admin/orders?order='.$order->id,
            ]);

        $rows = $orders->concat($resourceRequests)->take(self::PER_SOURCE_LIMIT)->values()->all();

        return $this->group('orders', 'Orders', $rows);
    }

    /** @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null */
    private function media(?User $user, string $query): ?array
    {
        if (! $user?->canAdmin('media', 'view')) {
            return null;
        }

        $rows = Media::query()
            ->where(function ($inner) use ($query) {
                $inner->where('file_name', 'like', "%{$query}%")
                    ->orWhere('alt_text', 'like', "%{$query}%");
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get();

        return $this->group('media', 'Media', $rows->map(fn (Media $media): array => [
            'id' => 'media:'.$media->id,
            'title' => $media->file_name,
            'snippet' => $media->alt_text ?: $media->mime_type,
            'href' => '/admin/media-library',
        ])->values()->all());
    }

    /**
     * Read-only against Service — never writes, never deep-links with a
     * query param. The absolute constraint for this ticket requires every
     * Services result to behave as a plain navigation link to the unchanged
     * /admin/services page, with zero new behavior added to that protected
     * screen/controller.
     *
     * @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null
     */
    private function services(?User $user, string $query): ?array
    {
        if (! $user?->canAdmin('services', 'view')) {
            return null;
        }

        $rows = Service::query()
            ->where(function ($inner) use ($query) {
                $inner->where('name', 'like', "%{$query}%")
                    ->orWhere('headline', 'like', "%{$query}%");
            })
            ->limit(self::PER_SOURCE_LIMIT)
            ->get(['id', 'name', 'headline', 'slug']);

        return $this->group('services', 'Services', $rows->map(fn (Service $service): array => [
            'id' => 'service:'.$service->id,
            'title' => $service->name,
            'snippet' => $service->headline ?: '',
            'href' => '/admin/services',
        ])->values()->all());
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{key: string, label: string, items: array<int, array<string, mixed>>}|null
     */
    private function group(string $key, string $label, array $items): ?array
    {
        if ($items === []) {
            return null;
        }

        return ['key' => $key, 'label' => $label, 'items' => array_values($items)];
    }
}
