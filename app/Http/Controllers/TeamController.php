<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveTeamMemberRequest;
use App\Models\TeamMember;
use Illuminate\Http\RedirectResponse;

class TeamController extends Controller
{
    public function store(SaveTeamMemberRequest $request): RedirectResponse
    {
        TeamMember::create($this->fields($request));

        return redirect('/admin/company/members');
    }

    public function update(SaveTeamMemberRequest $request, TeamMember $member): RedirectResponse
    {
        $member->update($this->fields($request, $member));

        return redirect('/admin/company/members');
    }

    /** @return array<string, mixed> */
    private function fields(SaveTeamMemberRequest $request, ?TeamMember $member = null): array
    {
        $data = $request->validated();
        $published = (request()->user()?->canAdmin('team', 'publish') ?? false)
            && $data['status'] === 'published';

        return [
            'name' => $data['name'],
            'role' => $data['role'],
            'bio' => $data['bio'] ?? null,
            'photo_media_id' => $data['photo_media_id'] ?? null,
            'status' => $published ? 'published' : 'draft',
            'sort_order' => $data['sort_order'],
            'published_at' => ($data['status'] === 'published' && (request()->user()?->canAdmin('team', 'publish') ?? false))
                ? ($member->published_at ?? now()) : $member?->published_at,
        ];
    }
}
