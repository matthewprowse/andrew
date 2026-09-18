<?php

namespace App\Console\Commands;

use App\Models\BlogPost;
use App\Models\Career;
use App\Models\Page;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\Service;
use App\Models\SiteSetting;
use App\Support\PublicSettings;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Converges the live database with the approved seed content under database/seeders/.
 *
 * The seeders in database/seeders only affect a *fresh* install: every one of them is guarded by
 * an `exists()` check, so once a table has a single row the seeder becomes a no-op forever. This
 * command is the counterpart for a database that has already diverged — it upserts the same
 * approved content, keyed by slug (site settings by its single row id; careers by job title;
 * resource items by title within their category), so a live install converges to the same copy a
 * fresh install would get.
 *
 * It never writes publication state (status columns, published_at, etc.) — only content fields.
 * Publication state belongs to whichever gate decided a record should go live, not to a content
 * sync.
 */
class SyncContent extends Command
{
    protected $signature = 'content:sync {--dry-run : Report what would change without writing to the database}';

    protected $description = "Sync approved copy-pack content into services, blog posts, pages, site settings, careers and resource items, without changing any record's publication status.";

    /** @var array<string, array<string, int>> */
    private array $stats = [];

    public function handle(): int
    {
        // Reset counters: the console kernel can reuse this instance across calls in the same
        // process (e.g. repeated Artisan::call() in a test), and stale counts would otherwise
        // carry over and make a no-op second run look like it did something.
        $this->stats = [];

        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->syncServices(true);
            $this->syncBlogPosts(true);
            $this->syncPages(true);
            $this->syncSiteSettings(true);
            $this->syncCareers(true);
            $this->syncResourceItems(true);
        } else {
            DB::transaction(function (): void {
                $this->syncServices(false);
                $this->syncBlogPosts(false);
                $this->syncPages(false);
                $this->syncSiteSettings(false);
                $this->syncCareers(false);
                $this->syncResourceItems(false);
            });
        }

        $this->report($dryRun);

        return self::SUCCESS;
    }

    private function syncServices(bool $dryRun): void
    {
        /** @var list<array<string, mixed>> $records */
        $records = $this->readJson(base_path('database/seeders/services.json'));

        foreach ($records as $record) {
            $slug = (string) $record['slug'];

            /** @var list<string> $intro */
            $intro = (array) $record['intro'];

            /** @var array<string, mixed> $desired */
            $desired = [
                'name' => $record['name'],
                'headline' => $record['headline'],
                'intro' => implode("\n\n", $intro),
                'scope' => $record['scope'],
                'countries' => $record['countries'] ?? [],
                'featured_primary' => $record['featuredPrimary'] ?? [],
                'faqs' => $record['faqs'],
                'cta_text' => $record['ctaText'],
                'cta_button_label' => $record['ctaButtonLabel'],
                'cta_link' => $record['ctaLink'],
                'meta_title' => $record['metaTitle'] ?? null,
                'meta_description' => $record['metaDescription'] ?? null,
            ];

            $existing = Service::query()->where('slug', $slug)->first();
            $this->upsertRecord('services', $existing, static fn () => Service::create(['slug' => $slug, ...$desired]), $desired, $dryRun);
        }
    }

    private function syncBlogPosts(bool $dryRun): void
    {
        /** @var list<array<string, mixed>> $records */
        $records = $this->readJson(base_path('database/seeders/blog-posts.json'));

        // One slug changed during Gate 4: the old slug asserted a specific 2026 research
        // programme that could not be verified. A database seeded before the rename may still
        // hold the post under its old slug, so migrate that row in place instead of creating a
        // duplicate alongside it. Keyed [new slug => old slug] so future renames can extend this.
        $renamedFrom = ['what-mobility-research-tells-us-about-africa' => 'what-our-2026-mobility-research-tells-us-about-africa'];
        $servicesByName = Service::query()->pluck('id', 'name');

        foreach ($records as $record) {
            $slug = (string) $record['slug'];

            /** @var list<string> $body */
            $body = (array) $record['body'];

            /** @var array<string, mixed> $desired */
            $desired = [
                'title' => $record['title'],
                'excerpt' => $record['excerpt'],
                'body' => implode("\n\n", $body),
                'publish_date' => $record['publishDate'],
            ];

            $existing = BlogPost::query()->where('slug', $slug)->first();

            if (! $existing && isset($renamedFrom[$slug])) {
                $legacy = BlogPost::query()->where('slug', $renamedFrom[$slug])->first();
                if ($legacy) {
                    $existing = $legacy;
                    $desired['slug'] = $slug;
                }
            }

            $this->upsertRecord('blog posts', $existing, static fn () => BlogPost::create(['slug' => $slug, ...$desired]), $desired, $dryRun);

            if (! $dryRun) {
                $post = $existing ?? BlogPost::query()->where('slug', $desired['slug'] ?? $slug)->first();
                $serviceId = $servicesByName[$record['category']] ?? null;
                $post?->services()->sync($serviceId ? [$serviceId] : []);
            }
        }
    }

    private function syncPages(bool $dryRun): void
    {
        /** @var array<string, array<string, mixed>> $pages */
        $pages = $this->readJson(base_path('database/seeders/pages.json'));

        foreach ($pages as $slug => $page) {
            // Home and About moved to the block-page system — their legacy
            // hero/intro fields are no longer what they render from, so
            // this sync must never write them onto those rows (see
            // PageContentSeeder).
            if (in_array($slug, ['home', 'about'], true)) {
                continue;
            }

            /** @var array<string, mixed> $desired */
            $desired = [
                'hero_heading' => $page['heroHeading'],
                'hero_subheading' => $page['heroSubheading'],
                'intro_heading' => $page['introHeading'],
                'intro_body' => $page['introBody'],
                'sections' => $page['sections'],
                'meta_title' => $page['metaTitle'],
                'meta_description' => $page['metaDescription'],
            ];

            $existing = Page::query()->where('slug', $slug)->first();
            $this->upsertRecord('pages', $existing, static fn () => Page::create(['slug' => $slug, ...$desired]), $desired, $dryRun);
        }
    }

    private function syncSiteSettings(bool $dryRun): void
    {
        $defaults = PublicSettings::defaults();

        // Only these copy-pack-sourced keys are synced. euraHeading/euraText are deliberately
        // never written here: that copy is an unverified claim about EuRA membership pending
        // client confirmation (see docs/content-remediation/05-client-confirmation.md), and
        // PublicSettings::defaults() keeps both empty for the same reason.
        $keys = ['footerText', 'copyrightLine', 'defaultCtaText', 'defaultCtaDescription', 'defaultCtaButtonLabel', 'defaultCtaLink'];
        /** @var array<string, mixed> $desiredSite */
        $desiredSite = array_intersect_key($defaults, array_flip($keys));

        $existing = SiteSetting::find(1);

        if (! $existing) {
            if (! $dryRun) {
                $record = new SiteSetting(['site' => $defaults, 'menu' => PublicSettings::menu(), 'social_links' => []]);
                $record->id = 1;
                $record->save();
            }
            $this->recordStat('site settings', 'created');

            return;
        }

        /** @var array<string, mixed> $currentSite */
        $currentSite = $existing->site;
        $changed = false;
        foreach ($desiredSite as $key => $value) {
            if (($currentSite[$key] ?? null) != $value) { // loose: only content, order-independent
                $changed = true;
                break;
            }
        }

        if (! $changed) {
            $this->recordStat('site settings', 'unchanged');

            return;
        }

        if (! $dryRun) {
            $existing->update(['site' => [...$currentSite, ...$desiredSite]]);
        }
        $this->recordStat('site settings', 'updated');
    }

    private function syncCareers(bool $dryRun): void
    {
        /** @var list<array<string, mixed>> $records */
        $records = $this->readJson(base_path('database/seeders/careers.json'));

        foreach ($records as $record) {
            $jobTitle = (string) $record['jobTitle'];

            /** @var array<string, mixed> $desired */
            $desired = [
                'description' => $record['description'],
                'location' => $record['location'],
                'posted_date' => $record['postedDate'],
            ];

            $existing = Career::query()->where('job_title', $jobTitle)->first();

            // Status is set only when creating a new role, never synced on an existing one: these
            // roles are unconfirmed and must not go live until the client confirms them (see
            // docs/content-remediation/05-client-confirmation.md).
            $this->upsertRecord('careers', $existing, static fn () => Career::create(['job_title' => $jobTitle, 'status' => 'closed', ...$desired]), $desired, $dryRun);
        }
    }

    private function syncResourceItems(bool $dryRun): void
    {
        /** @var array<string, list<array<string, mixed>>> $itemsByCategory */
        $itemsByCategory = $this->readJson(base_path('database/seeders/resource-items.json'));

        foreach ($itemsByCategory as $slug => $items) {
            $category = ResourceCategory::query()->where('slug', $slug)->first();

            if (! $category) {
                continue;
            }

            foreach ($items as $index => $item) {
                $title = (string) $item['title'];

                /** @var array<string, mixed> $desired */
                $desired = [
                    'description' => $item['description'],
                    'action_label' => $item['actionLabel'],
                ];

                $existing = ResourceItem::query()->where('resource_category_id', $category->id)->where('title', $title)->first();

                // Status is set only when creating a new item, never synced on an existing one:
                // file_media_id, external_url and access_type are asset wiring an
                // editor owns and are likewise never touched here.
                $this->upsertRecord('resource items', $existing, static fn () => ResourceItem::create([
                    'resource_category_id' => $category->id, 'title' => $title, 'sort_order' => $index + 1, 'status' => 'draft', ...$desired,
                ]), $desired, $dryRun);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $desired
     */
    private function upsertRecord(string $type, ?Model $existing, \Closure $create, array $desired, bool $dryRun): void
    {
        if (! $existing) {
            if (! $dryRun) {
                $create();
            }
            $this->recordStat($type, 'created');

            return;
        }

        $changed = false;
        foreach ($desired as $key => $value) {
            if ($this->normalize($existing->getAttribute($key)) != $this->normalize($value)) { // loose: array casts are order-independent
                $changed = true;
                break;
            }
        }

        if (! $changed) {
            $this->recordStat($type, 'unchanged');

            return;
        }

        if (! $dryRun) {
            $existing->update($desired);
        }
        $this->recordStat($type, 'updated');
    }

    /**
     * Puts a stored attribute and its desired copy-pack value into a comparable form. Date/time
     * columns are cast to Carbon on read (e.g. BlogPost::publish_date, Career::posted_date),
     * which never loosely equals the plain date string from the JSON source, so every comparison
     * would otherwise report a change even when nothing actually did.
     */
    private function normalize(mixed $value): mixed
    {
        return $value instanceof \DateTimeInterface ? $value->format('Y-m-d') : $value;
    }

    private function recordStat(string $type, string $bucket): void
    {
        $this->stats[$type][$bucket] = ($this->stats[$type][$bucket] ?? 0) + 1;
    }

    private function report(bool $dryRun): void
    {
        $rows = [];
        $totals = ['created' => 0, 'updated' => 0, 'unchanged' => 0];

        foreach ($this->stats as $type => $counts) {
            $rows[] = [$type, $counts['created'] ?? 0, $counts['updated'] ?? 0, $counts['unchanged'] ?? 0];
            foreach (array_keys($totals) as $bucket) {
                $totals[$bucket] += $counts[$bucket] ?? 0;
            }
        }

        $this->table(['Type', 'Created', 'Updated', 'Unchanged'], $rows);

        $label = $dryRun ? 'Dry run' : 'Sync complete';
        $this->info(sprintf('%s: %d created, %d updated, %d unchanged.', $label, $totals['created'], $totals['updated'], $totals['unchanged']));
    }

    /** @return array<mixed> */
    private function readJson(string $path): array
    {
        $contents = file_get_contents($path);
        if ($contents === false) {
            throw new RuntimeException("Cannot read content source: {$path}");
        }

        return json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
    }
}
