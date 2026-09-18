<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Lead;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminInquiriesController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/inquiries/index', [
            'leads' => Lead::query()->where('type', 'contact')->whereNull('anonymized_at')->orderBy('handled')->orderByDesc('submitted_at')->orderByDesc('id')->get()->map(fn (Lead $lead) => [
                'id' => (string) $lead->id,
                'type' => $lead->type,
                'name' => $lead->name,
                'email' => $lead->email,
                'subject' => $lead->subject,
                'message' => $lead->message,
                'date' => $lead->submitted_at->toIso8601String(),
                'handled' => $lead->handled,
            ]),
        ]);
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        $validated = $request->validate(['handled' => ['required', 'boolean']]);
        $lead->handled = $validated['handled'];
        $lead->save();

        return to_route('admin.inquiries');
    }

    public function forgetLead(Lead $lead): RedirectResponse
    {
        if ($lead->anonymized_at === null) {
            $lead->anonymize();
            AuditLog::record('anonymized', 'lead', $lead->id, ['type' => $lead->type]);
        }

        return to_route('admin.inquiries');
    }
}
