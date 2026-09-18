<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveAdminFeedbackRequest;
use App\Models\AdminFeedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminFeedbackController extends Controller
{
    /**
     * Submitted from the global feedback FAB (any admin page using
     * AdminWorkspaceLayout). Records who, when, where, and what kind of
     * feedback it is — the page URL, user agent, and category are "other
     * information that is important" for triaging a report, not just the
     * message. Screenshots are stored the same way App\Models\Media stores
     * uploads (public disk, dated subdirectory) but as their own
     * disposable, cascade-deleted attachments — not reusable site assets,
     * so they don't go through Media's impact-aware-delete tracking.
     */
    public function store(SaveAdminFeedbackRequest $request): JsonResponse
    {
        $feedback = AdminFeedback::create([
            'user_id' => $request->user()?->id,
            'type' => $request->string('type')->toString(),
            'message' => $request->string('message')->toString(),
            'page_url' => $request->string('page_url')->toString() ?: null,
            'user_agent' => substr((string) $request->userAgent(), 0, 512) ?: null,
        ]);

        foreach ($request->file('photos', []) as $photo) {
            $feedback->attachments()->create([
                'file_name' => $photo->getClientOriginalName(),
                'file_path' => $photo->store('feedback/'.now()->format('Y/m'), 'public'),
                'mime_type' => $photo->getMimeType(),
                'size' => $photo->getSize(),
            ]);
        }

        return response()->json(['message' => 'Thanks — your feedback has been recorded.']);
    }

    /**
     * Root-only, same tier as Users/Roles (can:access-admin) — reviewing
     * feedback about the tool itself is an operator concern, not tied to
     * any one content permission section.
     */
    public function index(): Response
    {
        return Inertia::render('admin/feedback/index', [
            'feedback' => AdminFeedback::query()->with(['user', 'attachments'])->orderByDesc('id')->get()->map(fn (AdminFeedback $feedback) => $feedback->adminData()),
        ]);
    }

    /**
     * Root-only triage toggle — same tier as index/destroy. Kept separate
     * from destroy so marking something resolved doesn't lose the record.
     */
    public function updateStatus(Request $request, AdminFeedback $feedback): RedirectResponse
    {
        $request->validate([
            'status' => ['required', Rule::in(AdminFeedback::STATUSES)],
        ]);

        $feedback->update(['status' => $request->string('status')->toString()]);

        return to_route('admin.feedback');
    }

    public function destroy(Request $request, AdminFeedback $feedback): RedirectResponse
    {
        foreach ($feedback->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->file_path);
        }
        $feedback->delete();

        return to_route('admin.feedback');
    }

    /** Selection-toolbar equivalent of updateStatus, for the checkbox column on the feedback table. */
    public function bulkUpdateStatus(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:admin_feedback,id'],
            'status' => ['required', Rule::in(AdminFeedback::STATUSES)],
        ]);

        AdminFeedback::whereIn('id', $validated['ids'])->update(['status' => $validated['status']]);

        return to_route('admin.feedback');
    }

    /** Selection-toolbar equivalent of destroy, for the checkbox column on the feedback table. */
    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:admin_feedback,id'],
        ]);

        $entries = AdminFeedback::with('attachments')->whereIn('id', $validated['ids'])->get();

        foreach ($entries as $entry) {
            foreach ($entry->attachments as $attachment) {
                Storage::disk('public')->delete($attachment->file_path);
            }
            $entry->delete();
        }

        return to_route('admin.feedback');
    }
}
