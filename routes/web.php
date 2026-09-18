<?php

use App\Http\Controllers\AdminAnalyticsController;
use App\Http\Controllers\AdminCompanyController;
use App\Http\Controllers\AdminContentController;
use App\Http\Controllers\AdminCustomersController;
use App\Http\Controllers\AdminFeedbackController;
use App\Http\Controllers\AdminInquiriesController;
use App\Http\Controllers\AdminOrdersController;
use App\Http\Controllers\AdminReusableContentController;
use App\Http\Controllers\AdminRoleController;
use App\Http\Controllers\AdminSearchController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AnalyticsEventController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\CareersController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CountryController;
use App\Http\Controllers\EstimatorAccessController;
use App\Http\Controllers\EstimatorCityController;
use App\Http\Controllers\EstimatorController;
use App\Http\Controllers\EstimatorOverviewController;
use App\Http\Controllers\EstimatorRateController;
use App\Http\Controllers\EstimatorServiceController;
use App\Http\Controllers\FaqController;
use App\Http\Controllers\LocationsController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\PageContentController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PayPalWebhookController;
use App\Http\Controllers\ResourceAccessController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\ResourcePurchaseController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TestCheckoutController;
use App\Http\Controllers\TestimonialController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PageController::class, 'home'])->name('home');

Route::post('/analytics/event', [AnalyticsEventController::class, 'store'])
    ->middleware('throttle:analytics-event')
    ->name('analytics.event.store');

Route::get('/contact', [ContactController::class, 'show'])->name('contact.show');
Route::post('/contact', [ContactController::class, 'store'])->name('contact.store');
Route::permanentRedirect('/careers', '/about');
Route::get('/about', [PageController::class, 'about'])->name('about');

Route::get('/services', [ServiceController::class, 'index'])->name('services');
Route::get('/services/{slug}', [ServiceController::class, 'show'])->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*')->name('services.show');

Route::get('/blog', [BlogController::class, 'index'])->name('blog');
Route::get('/blog/{slug}', [BlogController::class, 'show'])->name('blog.show');

Route::get('/resources', [ResourceController::class, 'landing'])->name('resources');

Route::get('/resources/{category}', [ResourceController::class, 'show'])
    ->whereIn('category', ['brochures', 'webinars', 'books'])
    ->name('resources.show');

Route::post('/resources/{category}/{item}/request-access', [ResourceAccessController::class, 'requestAccess'])
    ->whereIn('category', ['brochures', 'webinars', 'books'])
    ->middleware('throttle:resource-access')
    ->name('resources.access.request');
Route::get('/resources/access/{resourceRequest}/verify', [ResourceAccessController::class, 'verifyAccess'])
    ->middleware('signed')
    ->name('resources.access.verify');

// Paid resources: buy, resend a lost link, and the signed download link
// emailed after payment (see ResourcePurchaseService).
Route::middleware('throttle:resource-purchase')->group(function () {
    Route::post('/resources/{category}/{item}/purchase', [ResourcePurchaseController::class, 'store'])
        ->whereIn('category', ['brochures', 'webinars', 'books'])
        ->name('resources.purchase.store');
    Route::post('/resources/{category}/{item}/resend-access', [ResourcePurchaseController::class, 'resend'])
        ->whereIn('category', ['brochures', 'webinars', 'books'])
        ->name('resources.purchase.resend');
});
Route::get('/resources/access/order/{order}', [ResourcePurchaseController::class, 'access'])
    ->middleware('signed')
    ->name('resources.purchase.access');

// Test checkout used by the fake payment gateway until PayPal is connected.
Route::middleware('signed')->group(function () {
    Route::get('/checkout/{order}/test', [TestCheckoutController::class, 'show'])->name('checkout.test');
    Route::post('/checkout/{order}/test/pay', [TestCheckoutController::class, 'pay'])->name('checkout.test.pay');
    Route::post('/checkout/{order}/test/cancel', [TestCheckoutController::class, 'cancel'])->name('checkout.test.cancel');
    Route::get('/checkout/{order}/result', [TestCheckoutController::class, 'result'])->name('checkout.result');
});

Route::post('/webhooks/paypal', PayPalWebhookController::class)->name('webhooks.paypal');

Route::get('/locations', [LocationsController::class, 'show'])->name('locations');
Route::get('/locations/{slug}', [LocationsController::class, 'showCountry'])->name('locations.show');

Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('/robots.txt', function () {
    $lines = ['User-agent: *', 'Disallow: /admin', 'Disallow: /estimator', 'Disallow: /checkout', 'Sitemap: '.rtrim(config('app.url'), '/').'/sitemap.xml'];

    return response(implode("\n", $lines)."\n", 200)->header('Content-Type', 'text/plain');
})->name('robots');

Route::middleware(['auth', 'can:enter-admin'])->group(function () {
    // Contained until the country/city catalogue and pricing are ready for
    // launch: only staff whose role grants estimator access can use it.
    Route::middleware('admin.permission:estimator,view')->group(function () {
        Route::get('/estimator', [EstimatorController::class, 'show'])->name('estimator');
        Route::post('/estimator/access', [EstimatorAccessController::class, 'store'])->name('estimator.access.store');
        Route::post('/estimator/calculate', [EstimatorController::class, 'calculate'])->name('estimator.calculate');
    });

    Route::inertia('/admin', 'admin/index')->name('admin');
    Route::inertia('/admin/rag', 'admin/rag')->name('admin.rag');
    // Frozen UI reference (see CLAUDE_BUILD_PLAN.md) — deliberately root-only,
    // not delegable through the role system: it's a design reference for
    // building the real editors, not a content page any role should need.
    Route::get('/admin/test', [ServiceController::class, 'test'])->middleware('can:access-admin')->name('admin.test');

    Route::middleware('admin.permission:pages,view')->group(function () {
        Route::get('/admin/pages', [PageController::class, 'adminIndex'])->name('admin.pages');
        // GET-only: Route::redirect() would also catch the block editor's
        // own PUT /admin/blocks/about save request.
        Route::get('/admin/pages/about', fn () => redirect('/admin/blocks/about'));
        // Legacy fixed-field pages (Contact, Locations) keep their own GET
        // shell under PageContentController, matched only for their known
        // slugs. Block pages (Home + every page created from the list
        // above) live under a separate /admin/blocks/{slug} prefix instead
        // of sharing this path — an unconstrained block-page route at this
        // same pattern would shadow the legacy whereIn() route entirely,
        // since Laravel matches routes in registration order.
        Route::get('/admin/pages/{slug}', [PageContentController::class, 'admin'])->whereIn('slug', PageContentController::SLUGS)->name('admin.pages.legacy-show');
        Route::get('/admin/blocks/{slug}', [PageController::class, 'edit'])->name('admin.pages.show');
        // PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B):
        // authenticated preview of the current draft — same view permission
        // as the editor itself, not the edit permission, since previewing
        // is read-only. Never listed in SitemapController and always
        // noindex (see PageContentController::preview()/PageController::preview()).
        Route::get('/admin/pages/{slug}/preview', [PageContentController::class, 'preview'])->whereIn('slug', PageContentController::SLUGS)->name('admin.pages.preview');
        Route::get('/admin/blocks/{slug}/preview', [PageController::class, 'preview'])->name('admin.blocks.preview');
    });
    Route::middleware('admin.permission:pages,create')->group(function () {
        Route::post('/admin/pages', [PageController::class, 'store'])->name('admin.pages.store');
        // The sidebar's one-click "+ New page" — see PageController::quickCreate().
        Route::post('/admin/pages/quick-create', [PageController::class, 'quickCreate'])->name('admin.pages.quick-create');
    });
    Route::middleware('admin.permission:pages,edit')->group(function () {
        Route::put('/admin/blocks/{slug}', [PageController::class, 'update'])->name('admin.blocks.update');
        Route::put('/admin/blocks/{slug}/rename', [PageController::class, 'rename'])->name('admin.blocks.rename');
        Route::put('/admin/blocks/{slug}/revisions/{revision}/restore', [PageController::class, 'restoreAsDraft'])->name('admin.blocks.revisions.restore');
        // Kept under /admin/blocks, not /admin/pages/{slug}: an unconstrained
        // route at that exact shared pattern would make Laravel report 405
        // (method exists for this path, just not this verb) instead of 404
        // for any other method's request to a slug PageContentController
        // doesn't recognise — see AdminAccessTest/PageContentTest for the
        // 404 both public and legacy admin routes still rely on.
        Route::delete('/admin/blocks/{slug}', [PageController::class, 'destroy'])->name('admin.pages.destroy');
    });
    Route::put('/admin/blocks/{slug}/publish', [PageController::class, 'publish'])->middleware('admin.permission:pages,publish')->name('admin.blocks.publish');
    Route::put('/admin/pages/{slug}', [PageContentController::class, 'update'])->whereIn('slug', PageContentController::SLUGS)->middleware('admin.permission:pages,edit')->name('admin.pages.update');
    // PUB-01: explicit Publish (copies the current draft onto the live row)
    // and restore-as-draft (loads a past revision as the new current draft
    // without publishing it) — both gated the same as an ordinary save.
    Route::put('/admin/pages/{slug}/publish', [PageContentController::class, 'publish'])->whereIn('slug', PageContentController::SLUGS)->middleware('admin.permission:pages,publish')->name('admin.pages.publish');
    Route::put('/admin/pages/{slug}/revisions/{revision}/restore', [PageContentController::class, 'restoreAsDraft'])->whereIn('slug', PageContentController::SLUGS)->middleware('admin.permission:pages,edit')->name('admin.pages.revisions.restore');

    Route::get('/admin/services', [ServiceController::class, 'admin'])->middleware('admin.permission:services,view')->name('admin.services');
    Route::middleware('admin.permission:services,create')->group(function () {
        Route::post('/admin/services', [ServiceController::class, 'store'])->name('admin.services.store');
    });
    Route::middleware('admin.permission:services,edit')->group(function () {
        Route::patch('/admin/services/{service}', [ServiceController::class, 'update'])->name('admin.services.update');
    });

    // No standalone GET /admin/team page — Team is a tab on the merged
    // Company page (see AdminCompanyController). Redirect old bookmarks/
    // links there instead of a bare 405; these stay as the real save
    // endpoints the embedded Team tab posts to, still individually
    // permission-gated exactly as before.
    Route::redirect('/admin/team', '/admin/company/members');
    Route::middleware('admin.permission:team,create')->group(function () {
        Route::post('/admin/team', [TeamController::class, 'store'])->name('admin.team.store');
    });
    Route::middleware('admin.permission:team,edit')->group(function () {
        Route::patch('/admin/team/{member}', [TeamController::class, 'update'])->name('admin.team.update');
    });

    Route::get('/admin/testimonials', [AdminReusableContentController::class, 'testimonials'])
        ->middleware('admin.permission:testimonials,view')
        ->name('admin.testimonials');
    Route::middleware('admin.permission:testimonials,create')->group(function () {
        Route::post('/admin/testimonials', [TestimonialController::class, 'store'])->name('admin.testimonials.store');
    });
    Route::middleware('admin.permission:testimonials,edit')->group(function () {
        Route::patch('/admin/testimonials/{testimonial}', [TestimonialController::class, 'update'])->name('admin.testimonials.update');
    });

    Route::get('/admin/reusable-content', [AdminReusableContentController::class, 'index'])->name('admin.reusable-content');
    Route::get('/admin/faqs', [AdminReusableContentController::class, 'faqs'])
        ->middleware('admin.permission:resources,view')
        ->name('admin.faqs');
    Route::middleware('admin.permission:resources,create')->group(function () {
        Route::post('/admin/faqs', [FaqController::class, 'store'])->name('admin.faqs.store');
    });
    Route::middleware('admin.permission:resources,edit')->group(function () {
        Route::patch('/admin/faqs/{faq}', [FaqController::class, 'update'])->name('admin.faqs.update');
    });

    // No standalone GET /admin/careers page — vacancies are the "Open
    // positions" section of Team Members (see AdminCompanyController).
    // Redirect old bookmarks/links there instead of a bare 405.
    Route::redirect('/admin/careers', '/admin/company/members');
    Route::middleware('admin.permission:careers,create')->group(function () {
        Route::post('/admin/careers', [CareersController::class, 'store'])->name('admin.careers.store');
    });
    Route::middleware('admin.permission:careers,edit')->group(function () {
        Route::patch('/admin/careers/{career}', [CareersController::class, 'update'])->name('admin.careers.update');
    });

    // Company groups About, Team Members (including open positions), and
    // all website/company settings under the Company navigation item. Each destination still
    // checks its own underlying permission section.
    Route::get('/admin/company', [AdminCompanyController::class, 'index'])->name('admin.company');
    Route::get('/admin/company/{section}', [AdminCompanyController::class, 'index'])
        ->where('section', 'menu|appearance|social-links')
        ->name('admin.company.settings');
    Route::get('/admin/company/members', [AdminCompanyController::class, 'members'])->name('admin.company.members');
    Route::get('/admin/company/careers', fn () => redirect('/admin/company/members'));
    // About is a block page now — edited at /admin/blocks/about, same as Home.
    Route::redirect('/admin/company/about', '/admin/blocks/about')->name('admin.company.about');

    // Navigation hubs for the new admin shell (see
    // docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 2, NAV-01) — thin,
    // permission-gated card grids linking into their existing pages below.
    // Not wrapped in admin.permission:*,view middleware because each is a
    // union over several sections, not a single one; the controller itself
    // enforces the equivalent OR-gate.
    Route::redirect('/admin/website', '/admin/blocks/home')->name('admin.website');
    Route::get('/admin/content', [AdminContentController::class, 'index'])->name('admin.content');

    // LIB-08 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4 batch 4C): global
    // admin search. Same not-wrapped-in-a-single-section reasoning as the
    // two hub routes above — this spans every nonprotected source at once,
    // so each source's own admin.permission gate is enforced inside
    // AdminSearchController per-query, not once here.
    Route::get('/admin/search', [AdminSearchController::class, 'index'])->name('admin.search');

    Route::get('/admin/blog', [BlogController::class, 'admin'])->middleware('admin.permission:blog,view')->name('admin.blog');
    Route::middleware('admin.permission:blog,create')->group(function () {
        Route::post('/admin/blog', [BlogController::class, 'store'])->name('admin.blog.store');
    });
    Route::middleware('admin.permission:blog,edit')->group(function () {
        Route::patch('/admin/blog/{post}', [BlogController::class, 'update'])->name('admin.blog.update');
    });

    Route::get('/admin/locations', [LocationsController::class, 'index'])->middleware('admin.permission:locations,view')->name('admin.locations');
    Route::middleware('admin.permission:locations,create')->group(function () {
        Route::post('/admin/locations', [LocationsController::class, 'store'])->name('admin.locations.store');
        Route::post('/admin/countries', [CountryController::class, 'store'])->name('admin.countries.store');
    });
    Route::middleware('admin.permission:locations,edit')->group(function () {
        Route::patch('/admin/locations/{location}', [LocationsController::class, 'update'])->name('admin.locations.update');
        Route::patch('/admin/countries/{country}', [CountryController::class, 'update'])->name('admin.countries.update');
    });

    Route::get('/admin/resources/{category}', [ResourceController::class, 'admin'])
        ->whereIn('category', ['brochures', 'webinars', 'books'])
        ->middleware('admin.permission:resources,view')
        ->name('admin.resources.index');
    Route::middleware('admin.permission:resources,create')->group(function () {
        Route::post('/admin/resources/{category}', [ResourceController::class, 'store'])
            ->whereIn('category', ['brochures', 'webinars', 'books'])
            ->name('admin.resources.store');
    });
    Route::middleware('admin.permission:resources,edit')->group(function () {
        Route::patch('/admin/resources/{category}/layout', [ResourceController::class, 'updateLayout'])
            ->whereIn('category', ['brochures', 'webinars', 'books'])
            ->name('admin.resources.layout');
        Route::patch('/admin/resources/{category}/{item}', [ResourceController::class, 'update'])
            ->whereIn('category', ['brochures', 'webinars', 'books'])
            ->name('admin.resources.update');
    });

    Route::get('/admin/customers', [AdminCustomersController::class, 'index'])->name('admin.customers');
    Route::post('/admin/customers', [AdminCustomersController::class, 'store'])->name('admin.customers.store');
    Route::get('/admin/inquiries', [AdminInquiriesController::class, 'index'])->middleware('admin.permission:inquiries,view')->name('admin.inquiries');
    Route::patch('/admin/inquiries/{lead}', [AdminInquiriesController::class, 'update'])->middleware('admin.permission:inquiries,edit')->name('admin.inquiries.update');
    Route::middleware('admin.permission:inquiries,delete')->group(function () {
        // "Forget" doesn't delete the row (see docs/data-subject-requests.md),
        // but breaking a person's identity is a delete-tier action, not edit.
        Route::patch('/admin/inquiries/{lead}/forget', [AdminInquiriesController::class, 'forgetLead'])->name('admin.inquiries.forget');
    });

    Route::get('/admin/orders', [AdminOrdersController::class, 'index'])->middleware('admin.permission:orders,view')->name('admin.orders');
    Route::post('/admin/orders/{order}/resend', [AdminOrdersController::class, 'resend'])->middleware('admin.permission:orders,edit')->name('admin.orders.resend');
    Route::middleware('admin.permission:orders,delete')->group(function () {
        Route::post('/admin/orders/{order}/refund', [AdminOrdersController::class, 'refund'])->name('admin.orders.refund');
        Route::patch('/admin/orders/{order}/forget', [AdminOrdersController::class, 'forget'])->name('admin.orders.forget');
        Route::patch('/admin/orders/resource-requests/{resourceRequest}/forget', [AdminOrdersController::class, 'forgetResourceRequest'])->name('admin.resource-requests.forget');
    });

    Route::get('/admin/analytics', [AdminAnalyticsController::class, 'show'])->middleware('admin.permission:analytics,view')->name('admin.analytics');
    Route::get('/admin/analytics/export', [AdminAnalyticsController::class, 'export'])->middleware('admin.permission:analytics,view')->name('admin.analytics.export');

    Route::middleware('admin.permission:media,view')->group(function () {
        Route::get('/admin/media-library', [MediaController::class, 'index'])->name('admin.media-library');
        Route::get('/admin/media', [MediaController::class, 'index'])->name('admin.media.index');
    });
    // Private-file preview; the controller allows media or resources viewers.
    Route::get('/admin/media/{media}/file', [MediaController::class, 'file'])->name('admin.media.file');
    Route::middleware('admin.permission:media,create')->group(function () {
        Route::post('/admin/media', [MediaController::class, 'store'])->name('admin.media.store');
    });
    Route::middleware('admin.permission:media,edit')->group(function () {
        Route::patch('/admin/media/{media}', [MediaController::class, 'update'])->name('admin.media.update');
    });
    Route::delete('/admin/media/{media}', [MediaController::class, 'destroy'])->middleware('admin.permission:media,delete')->name('admin.media.destroy');

    // Keep the old settings URLs as compatibility redirects. Settings now
    // lives at the former Company Settings page, while Account Settings
    // remains under /settings.
    Route::get('/admin/settings/{section}', fn (string $section) => redirect($section === 'site' ? '/admin/company' : "/admin/company/{$section}"))
        ->where('section', 'site|appearance|menu|social-links')
        ->middleware('admin.permission:settings,view')
        ->name('admin.settings.show');
    Route::put('/admin/settings/{section}', [SettingsController::class, 'update'])->where('section', 'site|appearance|menu|social-links')->middleware('admin.permission:settings,edit')->name('admin.settings.update');
    Route::redirect('/admin/settings', '/admin/company')->name('admin.settings');

    // Users and roles are deliberately root-only (can:access-admin), not
    // delegable through the role system itself — see config/admin.php.
    Route::middleware('can:access-admin')->group(function () {
        Route::redirect('/admin/users', '/admin/company/members')->name('admin.users');
        Route::post('/admin/users', [AdminUserController::class, 'store'])->name('admin.users.store');
        Route::post('/admin/users/assign-role', [AdminUserController::class, 'assignRole'])->name('admin.users.assign-role');
        Route::post('/admin/roles', [AdminRoleController::class, 'store'])->name('admin.roles.store');
        Route::patch('/admin/roles/{role}', [AdminRoleController::class, 'update'])->name('admin.roles.update');
        Route::delete('/admin/roles/{role}', [AdminRoleController::class, 'destroy'])->name('admin.roles.destroy');

        // Reviewing tool feedback is a root-only operator concern, same tier
        // as Users/Roles — it isn't tied to any one content section.
        Route::get('/admin/feedback', [AdminFeedbackController::class, 'index'])->name('admin.feedback');
        // Bulk routes must be declared before the {feedback} wildcard routes
        // below, or "bulk-status"/"bulk" would be swallowed as a {feedback}
        // route-model-binding lookup instead.
        Route::patch('/admin/feedback/bulk-status', [AdminFeedbackController::class, 'bulkUpdateStatus'])->name('admin.feedback.bulk-status');
        Route::delete('/admin/feedback/bulk', [AdminFeedbackController::class, 'bulkDestroy'])->name('admin.feedback.bulk-destroy');
        Route::patch('/admin/feedback/{feedback}', [AdminFeedbackController::class, 'updateStatus'])->name('admin.feedback.update');
        Route::delete('/admin/feedback/{feedback}', [AdminFeedbackController::class, 'destroy'])->name('admin.feedback.destroy');
    });

    // Submitting feedback is open to any authenticated admin viewer (the
    // FAB appears on every AdminWorkspaceLayout page) — not root-only, and
    // not gated by a content-section permission, since it's feedback on the
    // tool itself.
    Route::post('/admin/feedback', [AdminFeedbackController::class, 'store'])->name('admin.feedback.store');

    Route::middleware('admin.permission:estimator,view')->group(function () {
        // Sub-sidebar (resources/js/layouts/estimator-layout.tsx) cleared
        // for now — see resources/js/pages/admin/estimator/index.tsx. The
        // sub-pages below are untouched and still reachable directly.
        Route::inertia('/admin/estimator', 'admin/estimator/index')->name('admin.estimator');
        Route::get('/admin/estimator/overview', [EstimatorOverviewController::class, 'show'])->name('admin.estimator.overview');
        Route::get('/admin/estimator/services-pricing', [EstimatorServiceController::class, 'index'])->name('admin.estimator.services-pricing');
        Route::get('/admin/estimator/destination-costs', [EstimatorRateController::class, 'destinationCosts'])->name('admin.estimator.destination-costs');
        Route::get('/admin/estimator/intra-location-costs', [EstimatorRateController::class, 'intraLocationCosts'])->name('admin.estimator.intra-location-costs');
        Route::get('/admin/estimator/city-service-rates', [EstimatorRateController::class, 'cityServiceRates'])->name('admin.estimator.city-service-rates');
        Route::get('/admin/estimator/cities', [EstimatorCityController::class, 'index'])->name('admin.estimator.cities');
        Route::get('/admin/estimator/catalogue-control', [EstimatorOverviewController::class, 'catalogueControl'])->name('admin.estimator.catalogue-control');
    });
    Route::middleware('admin.permission:estimator,edit')->group(function () {
        Route::put('/admin/estimator/overview', [EstimatorOverviewController::class, 'updateSettings'])->name('admin.estimator.overview.update');
        Route::patch('/admin/estimator/services-pricing/{estimatorService}', [EstimatorServiceController::class, 'update'])->name('admin.estimator.services-pricing.update');
        Route::put('/admin/estimator/destination-costs', [EstimatorRateController::class, 'updateDestinationCosts'])->name('admin.estimator.destination-costs.update');
        Route::put('/admin/estimator/intra-location-costs', [EstimatorRateController::class, 'updateIntraLocationCosts'])->name('admin.estimator.intra-location-costs.update');
        Route::put('/admin/estimator/city-service-rates', [EstimatorRateController::class, 'updateCityServiceRates'])->name('admin.estimator.city-service-rates.update');
        Route::patch('/admin/estimator/cities/{estimatorCity}', [EstimatorCityController::class, 'update'])->name('admin.estimator.cities.update');
    });
    Route::middleware('admin.permission:estimator,create')->group(function () {
        Route::post('/admin/estimator/services-pricing', [EstimatorServiceController::class, 'store'])->name('admin.estimator.services-pricing.store');
        Route::post('/admin/estimator/cities', [EstimatorCityController::class, 'store'])->name('admin.estimator.cities.store');
    });
});

require __DIR__.'/settings.php';

// The root-level catch-all is for block pages only now — services moved to
// /services/{slug} above. A slug with no published page falls through to a
// 301 for a still-indexed pre-move service URL, then a plain 404. See
// PageController::show().
Route::get('/{slug}', [PageController::class, 'show'])->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*')->name('page.show');
