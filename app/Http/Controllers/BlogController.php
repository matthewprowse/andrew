<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\BlogPost;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Support\AdminOptions;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BlogController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('blog', ['blogPosts' => $this->publicPosts()->get()->map(fn (BlogPost $post) => $post->publicData())]);
    }

    public function show(string $slug): Response
    {
        $post = $this->publicPosts()->where('slug', $slug)->firstOrFail();

        return Inertia::render('blog-post', ['post' => $post->publicData(), 'otherPosts' => $this->publicPosts()->whereKeyNot($post->id)->limit(3)->get()->map(fn (BlogPost $related) => $related->publicData())]);
    }

    public function admin(): Response
    {
        return Inertia::render('admin/blog/index', [
            'posts' => BlogPost::query()->with(['services', 'author', 'bannerImage'])->orderByDesc('publish_date')->orderByDesc('id')->get()->map(fn (BlogPost $post) => $post->adminData()),
            // LIB-03: read-only dropdown source, same precedent as TestimonialController@index.
            // Never written back to directly — posts are linked via services()->sync() below.
            'services' => AdminOptions::services(),
            // Author picker: scoped to admin-panel users only (a role assignment or
            // root-admin id), same reasoning as the services dropdown above — read-only
            // lookup data, never written back to.
        ]);
    }

    /** @return \Illuminate\Database\Eloquent\Builder<BlogPost> */
    private function publicPosts(): \Illuminate\Database\Eloquent\Builder
    {
        return BlogPost::publiclyVisible()
            ->with(['services', 'author', 'bannerImage'])
            ->orderByDesc('publish_date')
            ->orderByDesc('id');
    }

    public function store(Request $request): RedirectResponse
    {
        [$fields, $serviceIds] = $this->fields($request);
        $post = BlogPost::create($fields);
        $post->services()->sync($serviceIds);
        AuditLog::record('created', 'blog_post', $post->id, ['title' => $post->title, 'status' => $post->status]);

        return to_route('admin.blog');
    }

    public function update(Request $request, BlogPost $post): RedirectResponse
    {
        [$fields, $serviceIds] = $this->fields($request, $post);
        $post->update($fields);
        $post->services()->sync($serviceIds);
        AuditLog::record('updated', 'blog_post', $post->id, ['title' => $post->title, 'status' => $post->status]);

        return to_route('admin.blog');
    }

    /** @return array{0: array<string, mixed>, 1: list<int>} */
    private function fields(Request $request, ?BlogPost $post = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            // Slug is generated server-side (see uniqueSlug() below) so an editor never has to
            // think about collisions. This field is only an optional override — someone can
            // still hand-type a preferred slug, but it's reshaped/deduped here regardless of
            // what's submitted, never rejected outright with a validation error.
            'urlSlug' => ['nullable', 'string', 'max:255'],
            'excerpt' => ['required', 'string', 'max:5000'],
            'body' => ['required', 'string', 'max:100000'], 'status' => ['required', 'in:Draft,Live,Published'],
            'publishDate' => ['nullable', 'required_if:status,Live,Published', 'date_format:Y-m-d'],
            'bannerMediaId' => ['nullable', 'integer', Rule::exists('media', 'id')->where('kind', 'image')],
            'metaTitle' => ['nullable', 'string', 'max:255'], 'metaDescription' => ['nullable', 'string', 'max:320'],
            'authorId' => ['nullable', 'integer', 'exists:users,id'],
            'serviceIds' => ['sometimes', 'array'],
            'serviceIds.*' => ['integer', 'exists:services,id'],
        ]);

        $mayPublish = $request->user()?->canAdmin('blog', 'publish') ?? false;
        $published = $mayPublish
            ? in_array($data['status'], ['Live', 'Published'], true)
            : ($post?->status === 'published');
        $fields = ['title' => $data['title'], 'slug' => $this->uniqueSlug($data['urlSlug'] ?: $data['title'], $post), 'excerpt' => $data['excerpt'],
            'body' => $data['body'], 'status' => $published ? 'published' : 'draft',
            'publish_date' => $published ? ($mayPublish ? ($data['publishDate'] ?? null) : $post?->publish_date) : null,
            'banner_media_id' => $data['bannerMediaId'] ?? null,
            'meta_title' => $data['metaTitle'] ?? null, 'meta_description' => $data['metaDescription'] ?? null,
            // The submitting admin is always the author; the legacy request
            // field is intentionally not trusted for assignment.
            'author_id' => $request->user()->id];

        return [$fields, $data['serviceIds'] ?? []];
    }

    /**
     * Slugifies $base and, if that collides with another post's slug (or
     * isn't a valid slug at all — e.g. an all-punctuation title), appends
     * -2, -3, ... until it's free. $ignore excludes the post being updated
     * from its own collision check.
     */
    private function uniqueSlug(string $base, ?BlogPost $ignore): string
    {
        $slug = Str::slug($base) ?: 'post';
        $candidate = $slug;
        $suffix = 2;

        while (BlogPost::query()->where('slug', $candidate)->when($ignore, fn ($query) => $query->whereKeyNot($ignore->id))->exists()) {
            $candidate = "{$slug}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }
}
