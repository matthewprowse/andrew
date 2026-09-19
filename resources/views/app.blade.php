<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }

            /* The initial Inertia document has no React marketing wrapper yet.
             * Keep the first paint dark when the requested marketing page is
             * configured for dark mode. The bootstrap attribute is removed
             * as soon as the client theme bridge mounts. */
            html[data-marketing-bootstrap-dark] body {
                background-color: oklch(0.145 0 0);
                color: oklch(0.985 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />

        <script>
            (function() {
                try {
                    const app = document.getElementById('app');
                    const page = app?.dataset.page ? JSON.parse(app.dataset.page) : null;
                    const marketingPages = [
                        'page', 'contact', 'service', 'services', 'resource',
                        'estimator', 'locations', 'country', 'error', 'checkout',
                        'about', 'blog', 'blog-post'
                    ];
                    const theme = page?.component && marketingPages.includes(page.component)
                        ? page?.props?.publicSettings?.site?.marketingTheme
                        : null;
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    const isDark = theme?.mode === 'dark' ||
                        (theme?.mode === 'system' && prefersDark);

                    if (isDark) {
                        document.documentElement.setAttribute('data-marketing-bootstrap-dark', 'true');
                    }
                } catch (_) {
                    // React will apply the theme after mount if the bootstrap
                    // data is unavailable or malformed.
                }
            })();
        </script>
    </body>
</html>
