@php
    $marketingPages = ['page', 'contact', 'service', 'services', 'resource', 'estimator', 'locations', 'country', 'error', 'checkout', 'about', 'blog', 'blog-post'];
    $marketingMode = data_get($page, 'props.publicSettings.site.marketingTheme.mode');
    $marketingBootstrapDark = in_array($page['component'] ?? null, $marketingPages, true) && $marketingMode === 'dark';
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark']) @if($marketingBootstrapDark) data-marketing-bootstrap-dark="true" @endif>
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

        <script>
            (function() {
                const marketingPages = [
                    'page', 'contact', 'service', 'services', 'resource',
                    'estimator', 'locations', 'country', 'error', 'checkout',
                    'about', 'blog', 'blog-post'
                ];
                const component = @json($page['component'] ?? null);
                const mode = @json(data_get($page, 'props.publicSettings.site.marketingTheme.mode'));
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                if (
                    marketingPages.includes(component) &&
                    (mode === 'dark' || (mode === 'system' && prefersDark))
                ) {
                    document.documentElement.setAttribute('data-marketing-bootstrap-dark', 'true');
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
            html[data-marketing-bootstrap-dark],
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
    </body>
</html>
