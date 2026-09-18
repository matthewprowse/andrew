<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveSettingsRequest;
use App\Models\SiteSetting;
use App\Support\PublicSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function show(string $section): Response
    {
        $record = SiteSetting::find(1);

        return Inertia::render('admin/settings/index', ['section' => $section, 'settings' => ['site' => PublicSettings::normalizeSite($record ? $record->site : []), 'menu' => $record ? $record->menu : PublicSettings::menu(), 'socialLinks' => $record ? $record->social_links : []]]);
    }

    public function update(SaveSettingsRequest $request, string $section): RedirectResponse
    {
        DB::transaction(function () use ($request, $section) {
            $record = SiteSetting::lockForUpdate()->find(1);
            if (! $record) {
                $record = new SiteSetting(['site' => PublicSettings::defaults(), 'menu' => PublicSettings::menu(), 'social_links' => []]);
                $record->id = 1;
            }
            if ($section === 'site' || $section === 'appearance') {
                $record->site = $request->siteSettings();
            } elseif ($section === 'menu') {
                $record->menu = $request->menuEntries();
            } else {
                $record->social_links = $request->socialLinkEntries();
            }
            $record->save();
        });

        return back();
    }
}
