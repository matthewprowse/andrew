<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\BlogPost;
use App\Models\Media;
use App\Models\Page;
use App\Models\ResourceItem;
use App\Models\Service;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function index(Request $request): Response|JsonResponse
    {
        $query = Media::query()->orderByDesc('id');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($inner) use ($search) {
                $inner->where('file_name', 'like', "%{$search}%")->orWhere('alt_text', 'like', "%{$search}%");
            });
        }

        if (in_array($type = $request->string('type')->toString(), ['image', 'document'], true)) {
            $query->where('kind', $type);
        }

        $media = $query->paginate(24)->withQueryString();
        $items = collect($media->items());
        $usage = Media::usageFor($items);

        $data = $items->map(fn (Media $item) => [
            ...$item->adminData(),
            'usage' => $usage[$item->id],
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'data' => $data,
                'nextPage' => $media->hasMorePages() ? $media->currentPage() + 1 : null,
            ]);
        }

        return Inertia::render('admin/media-library/index', [
            'media' => $data,
            'hasMorePages' => $media->hasMorePages(),
        ]);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:20480'],
            'file_name' => ['nullable', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);

        $uploaded = $request->file('file');
        $isImage = str_starts_with((string) $uploaded->getMimeType(), 'image/');

        $media = Media::create([
            'file_name' => $data['file_name'] ?? $uploaded->getClientOriginalName(),
            'alt_text' => $data['alt_text'] ?? null,
            'file_path' => $uploaded->store('media/'.now()->format('Y/m'), 'public'),
            'mime_type' => $uploaded->getMimeType(),
            'size' => $uploaded->getSize(),
            'kind' => $isImage ? 'image' : 'document',
        ]);

        if ($request->wantsJson()) {
            return response()->json(['data' => $media->adminData()], 201);
        }

        return to_route('admin.media-library');
    }

    /**
     * Staff preview of a private file (one attached to a paid resource).
     * Public files are served directly from storage instead.
     */
    public function file(Request $request, Media $media): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user?->canAdmin('media', 'view') || $user?->canAdmin('resources', 'view'), 403);

        return Storage::disk($media->disk)->response($media->file_path, $media->file_name);
    }

    public function update(Request $request, Media $media): RedirectResponse
    {
        $data = $request->validate([
            'file_name' => ['required', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);

        $media->update($data);

        return to_route('admin.media-library');
    }

    public function destroy(Media $media): RedirectResponse
    {
        $inUse = ResourceItem::query()
            ->where('file_media_id', $media->id)
            ->orWhere('image_media_id', $media->id)
            ->exists()
            || Page::query()->where('intro_image_media_id', $media->id)->exists()
            || Page::query()->where('og_image_media_id', $media->id)->exists()
            || TeamMember::query()->where('photo_media_id', $media->id)->exists()
            || Service::query()->where('banner_media_id', $media->id)->exists()
            || BlogPost::query()->where('banner_media_id', $media->id)->exists();

        if ($inUse) {
            return back()->withErrors(['media' => 'This file is still in use and cannot be deleted.']);
        }

        // A pre-LIB-migration BlogPost.banner_image legacy string can still
        // reference this file by URL even when nothing points at it by
        // banner_media_id (now checked above and confirmed), so usage
        // through that legacy column can only ever be a best-effort match
        // here — but a resolved match still blocks deletion (MED-03: "block
        // deletion of... URL-based references where they can be
        // resolved"). Only a media row with zero confirmed AND zero
        // possible references is treated as safe to delete.
        $possiblyReferenced = Media::usageFor(collect([$media]))[$media->id]['unconfirmed'] !== [];

        if ($possiblyReferenced) {
            return back()->withErrors(['media' => 'This file may still be referenced by an article banner (could not be confirmed automatically). Review before deleting.']);
        }

        Storage::disk($media->disk)->delete($media->file_path);
        AuditLog::record('deleted', 'media', $media->id, ['file_name' => $media->file_name]);
        $media->delete();

        return to_route('admin.media-library');
    }
}
