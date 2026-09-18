<?php

namespace App\Http\Controllers;

use App\Http\Requests\RequestResourceAccessRequest;
use App\Jobs\SubscribeToMarketingList;
use App\Mail\ResourceAccessVerification;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Services\AnalyticsRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ResourceAccessController extends Controller
{
    public function requestAccess(RequestResourceAccessRequest $request, string $category, ResourceItem $item): RedirectResponse
    {
        abort_unless($item->access_type === ResourceItem::ACCESS_EMAIL, 404);

        $data = $request->validated();

        $resourceRequest = ResourceRequest::create([
            'resource_item_id' => $item->id,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'name' => trim($data['first_name'].' '.$data['last_name']),
            'email' => $data['email'],
            'company' => $data['company'] ?? null,
            'consent_given_at' => now(),
            'submitted_at' => now(),
        ]);

        Mail::to($resourceRequest->email)->send(new ResourceAccessVerification($resourceRequest));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Check :email for a link to access :title.', ['email' => $resourceRequest->email, 'title' => $item->title]),
        ]);

        return back();
    }

    public function verifyAccess(Request $request, ResourceRequest $resourceRequest, AnalyticsRecorder $recorder): Response
    {
        // Paid resources are only reachable through a paid order, never
        // through an email-verification link.
        abort_if($resourceRequest->item?->isPaid(), 403);

        if ($resourceRequest->verified_at === null) {
            $resourceRequest->update(['verified_at' => now()]);

            // Subscribed only once the email is confirmed real and the visitor
            // has followed through — not at submission time, since consent for
            // the download isn't the same as consent to be marketed to until
            // the approved double-opt-in policy says otherwise.
            SubscribeToMarketingList::dispatch(
                $resourceRequest->email,
                $resourceRequest->first_name ?? $resourceRequest->name,
                $resourceRequest->last_name ?? '',
                ['source' => 'resource-download', 'resource' => $resourceRequest->item?->title],
            );
        }

        $item = $resourceRequest->item;

        if ($item?->file || $item?->external_url) {
            $recorder->record($request, [
                'event_type' => 'resource_download',
                'path' => $request->getPathInfo(),
                'label' => $item->title,
                'resource_item_id' => $item->id,
            ]);
        }

        if ($item?->file) {
            return $item->file->isPrivate()
                ? Storage::disk($item->file->disk)->download($item->file->file_path, $item->file->file_name)
                : redirect()->away($item->file->url());
        }

        if ($item?->external_url) {
            return redirect()->away($item->external_url);
        }

        return redirect('/');
    }
}
