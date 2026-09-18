<?php

namespace App\Support\Blocks\Types;

use App\Models\TeamMember;
use App\Support\Blocks\BlockType;

/** The current published team members as a photo grid — content managed in Team Members, not here. */
class TeamBlock implements BlockType
{
    public function key(): string
    {
        return 'team';
    }

    public function label(): string
    {
        return 'Team';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => 'Meet Our Team'];
    }

    public function rules(): array
    {
        return ['heading' => ['nullable', 'string', 'max:255']];
    }

    public function resolve(array $data): array
    {
        return [
            ...$data,
            'members' => TeamMember::publiclyVisible()
                ->orderBy('sort_order')->orderBy('id')->get()
                ->map(fn (TeamMember $member) => $member->publicData())->values()->all(),
        ];
    }
}
