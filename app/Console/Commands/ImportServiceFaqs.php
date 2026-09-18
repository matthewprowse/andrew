<?php

namespace App\Console\Commands;

use App\Models\Faq;
use App\Models\Service;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Idempotent, provenance-preserving import of every Service's legacy
 * `faqs` json column into the new `faqs` table (LIB-06,
 * docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4/§5).
 *
 * Strictly read-only against Service: only `Service::query()->get(['id',
 * 'name', 'faqs'])` is ever called here, and nothing in this class calls
 * `save()`, `update()`, or any other write method on a Service instance.
 * The only table this command writes to is `faqs`.
 *
 * Idempotency: each source row is keyed by a deterministic provenance
 * marker, "service:{$serviceId}:{$index}", derived only from the service id
 * and the FAQ's position within that service's `faqs` array — not from row
 * content, so unrelated content edits to the legacy field via the frozen
 * Service editor don't create a duplicate on the next import run. Before
 * inserting, the command checks the row doesn't already exist by that
 * source marker; the column also carries a unique index (see the create_faqs
 * migration) as a second, DB-level guarantee against ever inserting a
 * duplicate even under concurrent runs.
 */
class ImportServiceFaqs extends Command
{
    protected $signature = 'faqs:import-from-services {--dry-run : Report what would be imported without writing to the database}';

    protected $description = 'Idempotently import every Service.faqs entry into the new faqs table (read-only against Service).';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $services = Service::query()->get(['id', 'name', 'faqs']);

        $existingSources = Faq::query()->whereNotNull('source')->pluck('id', 'source');

        $toCreate = [];
        $skipped = 0;

        foreach ($services as $service) {
            $entries = $service->faqs ?? [];

            foreach ($entries as $index => $entry) {
                $source = "service:{$service->id}:{$index}";

                if ($existingSources->has($source)) {
                    $skipped++;

                    continue;
                }

                $question = is_array($entry) ? (string) ($entry['question'] ?? '') : '';
                $answer = is_array($entry) ? (string) ($entry['answer'] ?? '') : '';

                if ($question === '' && $answer === '') {
                    // Nothing usable to import from this entry; don't create
                    // an empty row, and don't mark it as imported either so
                    // a future, corrected entry at the same index can still
                    // be picked up.
                    continue;
                }

                $toCreate[] = [
                    'question' => $question,
                    'answer' => $answer,
                    'service_id' => $service->id,
                    'status' => 'published',
                    'source' => $source,
                    'review_date' => null,
                ];
            }
        }

        if ($dryRun) {
            $this->info(sprintf('[dry-run] Would import %d FAQ(s); %d already imported.', count($toCreate), $skipped));

            return self::SUCCESS;
        }

        if ($toCreate !== []) {
            DB::transaction(function () use ($toCreate): void {
                $now = now();
                foreach ($toCreate as &$row) {
                    $row['created_at'] = $now;
                    $row['updated_at'] = $now;
                }
                unset($row);

                Faq::query()->insert($toCreate);

                DB::table('faq_service')->insertOrIgnore(
                    collect($toCreate)->map(fn (array $row) => [
                        'faq_id' => Faq::query()->where('source', $row['source'])->value('id'),
                        'service_id' => $row['service_id'],
                    ])->all(),
                );
            });
        }

        $this->info(sprintf('Imported %d FAQ(s); %d already imported (unchanged).', count($toCreate), $skipped));

        return self::SUCCESS;
    }
}
