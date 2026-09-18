<?php

namespace App\Support\Blocks\Types;

use App\Support\Blocks\BlockType;
use App\Support\PublicSettings;

/**
 * The professional-standards/memberships box: a fixed heading, plus
 * whatever membership copy is set in Company > Settings (currently blank
 * there, so only the heading renders — same as before the block system).
 */
class StandardsBlock implements BlockType
{
    public function key(): string
    {
        return 'standards';
    }

    public function label(): string
    {
        return 'Professional standards';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => 'Professional Standards and Memberships'];
    }

    public function rules(): array
    {
        return ['heading' => ['nullable', 'string', 'max:255']];
    }

    public function resolve(array $data): array
    {
        $site = PublicSettings::read()['site'];

        return [...$data, 'membershipHeading' => $site['euraHeading'], 'membershipText' => $site['euraText']];
    }
}
