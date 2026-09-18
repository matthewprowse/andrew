<?php

use App\Http\Middleware\EnsureAdminPermission;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\TrackPageView;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Set TRUSTED_PROXIES in production so request->ip() resolves the
        // visitor rather than the reverse proxy/load balancer address.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES'));
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            TrackPageView::class,
        ]);

        $middleware->alias(['admin.permission' => EnsureAdminPermission::class]);

        // Payment provider webhooks are authenticated by signature, not CSRF.
        $middleware->preventRequestForgery(except: ['webhooks/*']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            // 404/403 are expected outcomes, not bugs to diagnose — always branded, even with
            // APP_DEBUG on. 500/503 keep Laravel's debug-mode error page locally since seeing the
            // real stack trace matters there; only branded once debug mode is off (i.e. production).
            $showBranded = in_array($status, [403, 404], true)
                || (in_array($status, [500, 503], true) && ! app()->hasDebugModeEnabled());

            if ($showBranded && ! $request->is('admin/*') && ! $request->expectsJson()) {
                return Inertia::render('error', ['status' => $status])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });
    })->create();
