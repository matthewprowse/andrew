<?php

use App\Models\Page;
use App\Models\PageRevision;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Converts Home's old hardcoded-copy-plus-toggle content (`home_blocks`,
     * `sections`) into real block-page content and publishes it, so the
     * live homepage keeps its current wording AND layout the moment this
     * migration runs, rather than going blank or changing shape. Section
     * order, pairing (the African Reach text beside the audience list) and
     * the services strip under the hero all match the exact structure that
     * was previously hardcoded in resources/js/pages/home.tsx. Any block a
     * client had already turned on there carries its live text over;
     * everything else seeds from that same file's exact fallback copy.
     */
    public function up(): void
    {
        $home = DB::table('pages')->where('slug', 'home')->first();
        if (! $home) {
            return;
        }

        $homeBlocks = json_decode((string) ($home->home_blocks ?? '[]'), true) ?: [];
        // The legacy `sections` column stores {heading, description}; a
        // block's Cards items use {title, text} — remap rather than copy
        // verbatim, or every card renders with no title at all.
        $rawSections = json_decode((string) ($home->sections ?? '[]'), true) ?: [];
        $sections = array_map(fn (array $s) => ['title' => $s['heading'] ?? '', 'text' => $s['description'] ?? ''], $rawSections);
        $text = fn (string $key, string $fallback) => (($homeBlocks[$key]['enabled'] ?? false) ? $homeBlocks[$key]['text'] : $fallback);

        $blocks = [
            [
                'id' => (string) Str::uuid(), 'type' => 'hero', 'data' => [
                    'heading' => 'People, Business, and Possibility Across Africa',
                    'subheading' => 'Relocation Africa helps organisations, global mobility teams and relocating families navigate immigration, destination services and workforce mobility across Africa, so people can arrive ready to live, work and thrive.',
                    'eyebrow' => '', 'layout' => 'split',
                    'primaryLabel' => 'Talk to Our Team', 'primaryLink' => '/contact',
                    'secondaryLabel' => 'Explore Our Services', 'secondaryLink' => '#services',
                    'showServicesNav' => true,
                ],
            ],
            [
                'id' => (string) Str::uuid(), 'type' => 'text', 'data' => [
                    'eyebrow' => '', 'heading' => 'Your Partner in African Mobility',
                    'body' => "Moving people across Africa calls for more than a checklist. It calls for local understanding, trusted coordination and support that recognises the person behind every assignment.\n\nRelocation Africa brings together destination services, immigration, research, remuneration and training to help organisations make confident mobility decisions and help assignees feel at home sooner.",
                    'linkLabel' => 'Discover Our Company', 'linkUrl' => '/about',
                ],
            ],
            [
                'id' => (string) Str::uuid(), 'type' => 'services_grid', 'data' => [
                    'heading' => 'Services Built Around Your Move',
                    'intro' => $text('servicesIntro', 'From first planning conversations to life after arrival, our specialists connect the practical details of a move with the experience of the people making it.'),
                ],
            ],
            [
                'id' => (string) Str::uuid(), 'type' => 'text_with_list', 'data' => [
                    'heading' => 'African Reach, Local Understanding',
                    'body' => $text('africanReachIntro', 'Local knowledge changes everything. Our African network helps clients understand the realities on the ground, coordinate each stage of a move and respond with clarity when plans change.'),
                    'linkLabel' => 'Explore Our Locations', 'linkUrl' => '/locations',
                    'items' => ($homeBlocks['audiences']['enabled'] ?? false) ? $homeBlocks['audiences']['items'] : [
                        ['title' => 'For Businesses', 'text' => 'Build a mobility programme that supports business continuity, employee experience and cost visibility.'],
                        ['title' => 'For Individuals and Families', 'text' => 'Make a new city feel navigable with practical, personal support before, during and after arrival.'],
                        ['title' => 'For Global Mobility Partners', 'text' => 'Extend your reach with a responsive African destination-services partner who understands local delivery.'],
                    ],
                ],
            ],
            ['id' => (string) Str::uuid(), 'type' => 'testimonials', 'data' => ['heading' => 'What Our Clients Say']],
            [
                'id' => (string) Str::uuid(), 'type' => 'cards', 'data' => [
                    'heading' => 'The People Behind Every Move',
                    'intro' => 'Behind every successful relocation is a team that listens carefully, acts responsibly and takes ownership.',
                    'columns' => 3, 'style' => 'icons',
                    'items' => count($sections) > 0 ? $sections : [
                        ['title' => 'Local Knowledge', 'text' => 'We pair regional perspective with in-country insight, helping clients make informed decisions in complex and fast-changing markets.'],
                        ['title' => 'Personal Support', 'text' => 'Every relocation affects a person, a family and a career. We make space for the practical and human realities of change.'],
                        ['title' => 'Accountability', 'text' => 'We take ownership of what has been entrusted to us, communicate clearly and work to earn trust at every stage.'],
                    ],
                ],
            ],
            [
                'id' => (string) Str::uuid(), 'type' => 'text', 'data' => [
                    'eyebrow' => 'Relocoaching', 'heading' => 'Support Beyond the Move',
                    'body' => $text('partnership', 'An international move can bring excitement as well as uncertainty. Through our Relocoaching partnership, assignees and families can access independent support that builds resilience, eases cultural adjustment and helps them thrive in their new environment.'),
                    'linkLabel' => 'Ask About Relocoaching', 'linkUrl' => '/contact',
                ],
            ],
            ['id' => (string) Str::uuid(), 'type' => 'standards', 'data' => ['heading' => 'Professional Standards and Memberships']],
            [
                'id' => (string) Str::uuid(), 'type' => 'resources_promo', 'data' => [
                    'heading' => 'Knowledge for Your Next Chapter',
                    'intro' => $text('resourcesIntro', 'Practical knowledge makes better mobility decisions. Explore perspectives, learning and resources from our team and partners.'),
                ],
            ],
            [
                'id' => (string) Str::uuid(), 'type' => 'cta', 'data' => [
                    'heading' => 'Let’s Plan Your Next Move',
                    'description' => $text('finalCta', 'Whether you are moving one employee or building a regional mobility programme, Relocation Africa brings local insight, practical coordination and personal support to every stage of the journey.'),
                    'buttonLabel' => 'Contact Our Team', 'buttonLink' => '',
                ],
            ],
        ];

        DB::table('pages')->where('id', $home->id)->update(['blocks' => json_encode($blocks), 'updated_at' => now()]);

        // A fresh published revision so the block page immediately counts
        // as published (see PageController::isPublished()) — the live row
        // above is the actual page rendered; this revision is that same
        // content's audit-trail entry, not a separate source of truth.
        $snapshot = Page::find($home->id)?->adminData();
        if ($snapshot) {
            PageRevision::create([
                'page_id' => $home->id, 'status' => 'published',
                'snapshot' => [
                    'title' => 'Home', 'blocks' => $blocks,
                    'meta_title' => $home->meta_title, 'meta_description' => $home->meta_description,
                    'og_image_media_id' => $home->og_image_media_id,
                ],
                'author_id' => null,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('pages')->where('slug', 'home')->update(['blocks' => json_encode([])]);
        PageRevision::query()->whereIn('page_id', DB::table('pages')->where('slug', 'home')->pluck('id'))->delete();
    }
};
