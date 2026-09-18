<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveFaqRequest;
use App\Models\AuditLog;
use App\Models\Faq;
use Illuminate\Http\RedirectResponse;

/**
 * Write endpoints for the new FAQ store (LIB-06,
 * docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4 batch 4B). Listing/display lives
 * in AdminReusableContentController; this controller only ever writes to
 * the `faqs` table — never to `services`. `source` is deliberately absent
 * from SaveFaqRequest/fields(): a create() call never sets it (so every
 * FAQ authored directly through this admin has source = null, per LIB-06),
 * and an update() call never overwrites it on an imported row, preserving
 * that row's provenance marker for the idempotent import command.
 */
class FaqController extends Controller
{
    public function store(SaveFaqRequest $request): RedirectResponse
    {
        [$fields, $serviceIds] = $this->fields($request);
        $faq = Faq::create($fields);
        $faq->services()->sync($serviceIds);
        AuditLog::record('created', 'faq', $faq->id, ['status' => $faq->status]);

        return to_route('admin.faqs');
    }

    public function update(SaveFaqRequest $request, Faq $faq): RedirectResponse
    {
        [$fields, $serviceIds] = $this->fields($request);
        $faq->update($fields);
        $faq->services()->sync($serviceIds);
        AuditLog::record('updated', 'faq', $faq->id, ['status' => $faq->status]);

        return to_route('admin.faqs');
    }

    /** @return array{0: array<string, mixed>, 1: list<int>} */
    private function fields(SaveFaqRequest $request): array
    {
        $data = $request->validated();

        $serviceIds = array_values(array_unique(array_map(
            'intval',
            $data['serviceIds'] ?? (filled($data['serviceId'] ?? null) ? [$data['serviceId']] : []),
        )));

        return [[
            'question' => $data['question'],
            'answer' => $data['answer'],
            'service_id' => $serviceIds[0] ?? null,
            'status' => (request()->user()?->canAdmin('resources', 'publish') ?? false)
                && in_array($data['status'], ['Live', 'Published'], true) ? 'published' : 'draft',
            'review_date' => $data['reviewDate'] ?? null,
        ], $serviceIds];
    }
}
