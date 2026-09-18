<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level permission gate for a specific admin section, e.g.
 * ->middleware('admin.permission:services,edit'). Central and declarative —
 * the permission check lives on the route, not scattered inline checks
 * inside each controller. Root admins always pass (see User::canAdmin()).
 */
class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $section, string $action = 'view'): Response
    {
        abort_unless($request->user()?->canAdmin($section, $action), 403);

        return $next($request);
    }
}
