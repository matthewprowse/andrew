<?php

namespace App\Http\Middleware;

use App\Models\Service;
use App\Support\PublicSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'publicSettings' => fn () => PublicSettings::read(),
            'canonicalUrl' => rtrim(config('app.url'), '/').$request->getPathInfo(),
            'serviceLinks' => fn () => ! Schema::hasTable('services') ? [] : Service::where('status', 'published')->orderBy('sort_order')->orderBy('id')->get(['name', 'slug'])->map(fn ($service) => ['title' => $service->name, 'href' => '/services/'.$service->slug]),
            'auth' => [
                'user' => $request->user(),
                'canAdmin' => $request->user()?->can('access-admin') ?? false,
                'hasAdminAccess' => $request->user()?->hasAdminAccess() ?? false,
                'adminPermissions' => $this->adminPermissions($request),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * The current user's effective permission per admin section, so the
     * sidebar and other admin UI can show only what a role actually grants
     * without every page having to compute this itself. Root admins see
     * everything; a user with no role sees nothing.
     *
     * @return array<string, array<string, bool>>
     */
    private function adminPermissions(Request $request): array
    {
        $user = $request->user();
        /** @var list<string> $sections */
        $sections = array_map('strval', array_keys(config('admin.sections', [])));
        /** @var list<string> $actions */
        $actions = array_map('strval', array_keys(config('admin.actions', [])));

        if (! $user) {
            return array_fill_keys($sections, array_fill_keys($actions, false));
        }

        $permissions = [];
        foreach ($sections as $section) {
            $permissions[$section] = [];
            foreach ($actions as $action) {
                $permissions[$section][$action] = $user->canAdmin($section, $action);
            }
        }

        return $permissions;
    }
}
