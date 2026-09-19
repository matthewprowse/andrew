<?php

namespace App\Http\Controllers;

use App\Models\Career;
use App\Models\SiteSetting;
use App\Models\TeamMember;
use App\Support\AdminOptions;
use App\Support\PublicSettings;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AdminCompanyController extends Controller
{
    public function index(string $section = 'site'): Response
    {
        $user = Auth::user();
        $canViewSettings = (bool) $user?->canAdmin('settings', 'view');
        abort_unless($canViewSettings, 403);

        $record = SiteSetting::find(1);

        return Inertia::render('admin/company/index', [
            'section' => $section,
            'settings' => [
                'site' => PublicSettings::normalizeSite($record ? $record->site : []),
                'menu' => $record ? $record->menu : PublicSettings::menu(),
                'socialLinks' => $record ? $record->social_links : [],
            ],
        ]);
    }

    public function members(): Response
    {
        $user = Auth::user();
        $canViewTeam = (bool) $user?->canAdmin('team', 'view');
        $canViewCareers = (bool) $user?->canAdmin('careers', 'view');
        $isRootAdmin = (bool) $user?->isRootAdmin();

        abort_unless($canViewTeam || $canViewCareers || $isRootAdmin, 403);

        $props = [];
        if ($canViewTeam) {
            $props['members'] = TeamMember::query()->orderBy('sort_order')->orderBy('id')->get()->map(fn (TeamMember $member) => $member->adminData());
        }
        // Careers has no page of its own: vacancies are managed here as the
        // "Open positions" section and listed publicly at the bottom of About.
        if ($canViewCareers) {
            $props['careers'] = Career::query()->orderByDesc('posted_date')->orderByDesc('id')->get()->map(fn (Career $career) => $career->adminData());
        }
        if ($isRootAdmin) {
            $props['sections'] = config('admin.sections');
            $props['actions'] = config('admin.actions');
            $props['roles'] = AdminOptions::roles();
            $props['users'] = AdminOptions::users();
        }

        return Inertia::render('admin/company/members', $props);
    }
}
