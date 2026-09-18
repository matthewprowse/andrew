<?php

namespace App\Providers;

use App\Contracts\ContentTagger;
use App\Contracts\MarketingSubscriberProvider;
use App\Models\User;
use App\Payments\Contracts\PaymentGateway;
use App\Payments\FakePaymentGateway;
use App\Payments\PayPalGateway;
use App\Services\FakeMarketingSubscriberProvider;
use App\Services\NullContentTagger;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\DevCommands;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // No ESP or AI-tagging vendor is approved yet (see CLAUDE_BUILD_PLAN.md
        // "Explicit dependencies"). Bind the fakes so callers can depend on the
        // interfaces now; swap these bindings for real adapters once Andrew
        // confirms a vendor and supplies credentials.
        $this->app->singleton(MarketingSubscriberProvider::class, FakeMarketingSubscriberProvider::class);
        $this->app->singleton(ContentTagger::class, NullContentTagger::class);

        // Paid resources: the fake gateway until PayPal credentials arrive
        // (see config/payments.php).
        $this->app->singleton(PaymentGateway::class, fn () => match (config('payments.driver')) {
            'paypal' => new PayPalGateway,
            default => new FakePaymentGateway,
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        // Root tier only — unchanged in meaning by the role system below, since
        // several routes (role/user management itself) deliberately stay
        // reserved to it rather than becoming delegable.
        Gate::define('access-admin', fn (User $user): bool => $user->isRootAdmin());

        // The front-door check for the admin panel generally: root admin, or
        // any user with a role assigned (regardless of what it grants) — what
        // that role actually lets them reach is enforced per-route below.
        Gate::define('enter-admin', fn (User $user): bool => $user->hasAdminAccess());

        Gate::define('admin-section', fn (User $user, string $section, string $action): bool => $user->canAdmin($section, $action));

        // Public lead-capture form: generous enough for a genuine retry after a
        // typo, tight enough to blunt scripted harvesting of gated resources.
        RateLimiter::for('resource-access', fn (Request $request) => Limit::perMinute(6)->by($request->ip()));
        RateLimiter::for('resource-purchase', fn (Request $request) => Limit::perMinute(6)->by($request->ip()));

        // Analytics beacon: generous per-visitor allowance for genuine clicks,
        // tight enough to stop the endpoint being used to flood the events table.
        RateLimiter::for('analytics-event', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));

        // Runs the Inertia SSR server alongside `php artisan dev` so pages are
        // server-rendered locally, matching how they must run in production —
        // without this, `config('inertia.ssr.enabled')` silently falls back to
        // client-only rendering (SSR requests time out with nothing listening
        // at inertia.ssr.url) and every page ships to crawlers as an empty shell.
        if ($this->app->runningInConsole() && config('inertia.ssr.enabled')) {
            DevCommands::artisan('inertia:start-ssr', 'ssr');
        }
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
