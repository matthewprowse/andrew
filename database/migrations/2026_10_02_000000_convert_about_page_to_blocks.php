<?php

use App\Models\Media;
use App\Models\Page;
use App\Models\PageRevision;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Converts About's old fixed-field content (hero/intro/sections/
     * show_team_section) into block-page content and publishes it, exactly
     * as 2026_10_01_000200_seed_home_page_blocks.php did for Home. Section
     * order and copy match resources/js/pages/about.tsx precisely: a
     * centered hero, the intro photo-and-text pairing, the values grid,
     * (optionally) the team grid, open positions, and a bare final CTA.
     * Any content a client had already edited on the live row carries over;
     * everything else seeds from that template's exact fallback copy.
     */
    public function up(): void
    {
        // Unlike Home (created explicitly by an earlier migration), an
        // About row has only ever existed lazily — created by
        // Page::firstOrCreate() on first request, or by PageContentSeeder.
        // A fresh database (a new environment, or the test suite) may not
        // have one yet, so this creates it rather than assuming it exists.
        $about = DB::table('pages')->where('slug', 'about')->first();
        $isFreshRow = ! $about;
        if ($isFreshRow) {
            $aboutId = DB::table('pages')->insertGetId(['slug' => 'about', 'created_at' => now(), 'updated_at' => now()]);
            $about = DB::table('pages')->where('id', $aboutId)->first();
        }
        if (! $about) {
            throw new RuntimeException('About page could not be loaded.');
        }
        $aboutId = $about->id;

        // The legacy `sections` column stores {heading, description}; a
        // block's Cards items use {title, text} — remap rather than copy
        // verbatim, or every card renders with no title at all.
        $rawSections = json_decode((string) ($about->sections ?? '[]'), true) ?: [];
        $sections = array_map(fn (array $s) => ['title' => $s['heading'] ?? '', 'text' => $s['description'] ?? ''], $rawSections);
        $image = $about->intro_image_media_id ? Media::query()->whereKey($about->intro_image_media_id)->first() : null;
        // A genuinely new row has no prior "show the team section" choice
        // to preserve — default to showing it, matching the page's original
        // intent (every existing row already had a real value either way).
        $showTeamSection = $isFreshRow ? true : (bool) $about->show_team_section;

        $blocks = [
            [
                'id' => (string) Str::uuid(), 'type' => 'hero', 'data' => [
                    'eyebrow' => 'About Us', 'layout' => 'centered',
                    'heading' => ($about->hero_heading ?? '') ?: 'About Us',
                    'subheading' => ($about->hero_subheading ?? '') ?: 'Relocation Africa helps global organisations and relocating people make confident moves across Africa through local expertise, accountable service and genuine human support.',
                    'primaryLabel' => '', 'primaryLink' => '', 'secondaryLabel' => '', 'secondaryLink' => '',
                    'showServicesNav' => false,
                ],
            ],
            [
                'id' => (string) Str::uuid(), 'type' => 'image_text', 'data' => [
                    'heading' => ($about->intro_heading ?? '') ?: 'More Than a Move',
                    'body' => ($about->intro_body ?? '') ?: "Relocation Africa was built on a simple belief: mobility works best when people feel informed, supported and able to get on with their lives and work.\n\nOur integrated services bring together destination support, immigration, research, remuneration and training. We help global HR and mobility teams navigate the operational complexity of African assignments while keeping the assignee experience in view.",
                    'imagePosition' => 'right',
                    'image' => $image ? ['id' => (string) $image->id, 'url' => $image->url(), 'fileName' => $image->file_name] : null,
                ],
            ],
            [
                'id' => (string) Str::uuid(), 'type' => 'cards', 'data' => [
                    'heading' => '', 'intro' => '', 'columns' => 2, 'style' => 'list',
                    'items' => count($sections) > 0 ? $sections : [
                        ['title' => 'Embrace Change', 'text' => 'We respond to change with curiosity, innovation and practical action.'],
                        ['title' => 'Uncompromising Ethics', 'text' => 'We build trust through responsible decisions, honest communication and professional conduct.'],
                        ['title' => 'Consider the Person', 'text' => 'We listen with empathy and recognise that every relocation experience is different.'],
                        ['title' => 'I Do It, I Own It', 'text' => 'We take accountability for our commitments and follow through.'],
                    ],
                ],
            ],
        ];

        // The old show_team_section toggle becomes "is there a Team block on
        // the page" — omitted entirely here when it was off, same public
        // result (no team section renders) via a mechanism that also lets an
        // editor add it back later from the block catalogue.
        if ($showTeamSection) {
            $blocks[] = ['id' => (string) Str::uuid(), 'type' => 'team', 'data' => ['heading' => 'Meet Our Team']];
        }

        $blocks[] = ['id' => (string) Str::uuid(), 'type' => 'open_positions', 'data' => ['heading' => 'Open Positions']];
        $blocks[] = ['id' => (string) Str::uuid(), 'type' => 'cta', 'data' => ['heading' => '', 'description' => '', 'buttonLabel' => '', 'buttonLink' => '']];

        DB::table('pages')->where('id', $aboutId)->update([
            'title' => 'About', 'kind' => Page::KIND_BLOCK, 'is_system' => true,
            'blocks' => json_encode($blocks), 'updated_at' => now(),
        ]);

        $snapshot = Page::query()->whereKey($aboutId)->first()?->adminData();
        if ($snapshot) {
            PageRevision::create([
                'page_id' => $aboutId, 'status' => 'published',
                'snapshot' => [
                    'title' => 'About', 'blocks' => $blocks,
                    'meta_title' => $about->meta_title ?? null, 'meta_description' => $about->meta_description ?? null,
                    'og_image_media_id' => $about->og_image_media_id ?? null,
                ],
                'author_id' => null,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('pages')->where('slug', 'about')->update([
            'kind' => Page::KIND_LEGACY, 'is_system' => false, 'blocks' => json_encode([]),
        ]);
        PageRevision::query()->whereIn('page_id', DB::table('pages')->where('slug', 'about')->pluck('id'))->delete();
    }
};
