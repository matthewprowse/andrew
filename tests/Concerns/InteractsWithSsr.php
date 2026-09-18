<?php

namespace Tests\Concerns;

use Inertia\Ssr\Gateway;
use Inertia\Ssr\HasHealthCheck;
use Symfony\Component\Process\Process;

/**
 * Starts the Inertia SSR server on demand so Feature tests can assert
 * against actually-rendered HTML (real <title>/meta/structured-data tags)
 * instead of only Inertia page props. Without SSR running, the page shell
 * ships a static fallback <title> and an empty mount div — a prop-only
 * assertion would keep passing even if the page component never rendered
 * the value into the document at all, which is the exact gap Phase 1's
 * SEO-02 ticket calls out.
 *
 * Reuses an already-running server (e.g. one a developer started with
 * `php artisan inertia:start-ssr`, or `composer dev`) when present, and
 * only starts/stops its own process when nothing is listening.
 */
trait InteractsWithSsr
{
    private static ?Process $ssrProcess = null;

    private static bool $ssrBootAttempted = false;

    /**
     * Ensure the SSR server is reachable, starting one from the built
     * bundle if necessary. Returns false when SSR genuinely cannot be
     * exercised (no bundle built, no runtime available) — tests must skip
     * themselves in that case rather than asserting against the
     * non-SSR fallback shell.
     */
    protected function ensureSsrAvailable(): bool
    {
        $gateway = app(Gateway::class);

        if (! $gateway instanceof HasHealthCheck) {
            return false;
        }

        if ($gateway->isHealthy()) {
            return true;
        }

        if (self::$ssrBootAttempted) {
            return $gateway->isHealthy();
        }

        self::$ssrBootAttempted = true;

        $bundle = base_path('bootstrap/ssr/app.js');
        if (! is_file($bundle)) {
            return false;
        }

        self::$ssrProcess = new Process(['node', $bundle]);
        // Symfony Process buffers a started process's stdout/stderr in memory
        // until something reads it. Nothing here ever does, so once the SSR
        // server had logged enough (one line per render, across ~10 requests
        // in the multi-page sweep test) the OS pipe filled and the Node
        // process blocked on its next write — silently hanging mid-render
        // and making Inertia fall back to the unrendered shell. Disabling
        // output entirely avoids the buffer ever filling.
        self::$ssrProcess->disableOutput();
        self::$ssrProcess->start();

        $deadline = microtime(true) + 10;
        while (microtime(true) < $deadline) {
            usleep(200_000);
            if ($gateway->isHealthy()) {
                return true;
            }
        }

        return false;
    }

    /**
     * `Inertia\Ssr\SsrState` is bound `scoped()` — reset once per real HTTP
     * request in production (Octane) or naturally fresh on every PHP-FPM
     * request. A single PHPUnit test method reuses one application instance
     * across multiple `$this->get()` calls, so without forgetting the scoped
     * instance between them, `SsrState::dispatch()` dispatches to the SSR
     * gateway once and then silently replays that first response's head/body
     * for every later "request" in the same test method.
     */
    protected function resetSsrStateBetweenRequests(): void
    {
        $this->app->forgetScopedInstances();
    }

    /**
     * Stop and forget any running SSR process so the next ensureSsrAvailable()
     * call boots a completely fresh one. Diagnostic tool for isolating
     * whether an SSR anomaly is tied to a process's request history.
     */
    protected function restartSsrProcess(): void
    {
        self::$ssrProcess?->stop();
        self::$ssrProcess = null;
        self::$ssrBootAttempted = false;
        $this->ensureSsrAvailable();
    }

    public static function tearDownAfterClass(): void
    {
        self::$ssrProcess?->stop();
        self::$ssrProcess = null;
        self::$ssrBootAttempted = false;

        parent::tearDownAfterClass();
    }
}
