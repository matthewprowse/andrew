<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\User;
use Database\Seeders\BlogPostSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BlogTest extends TestCase
{
    use RefreshDatabase;

    private function fields(): array
    {
        return ['title' => 'An article', 'urlSlug' => 'an-article', 'excerpt' => 'A summary', 'body' => "First paragraph.\n\nSecond paragraph.", 'status' => 'Live', 'publishDate' => today()->format('Y-m-d')];
    }

    private function staff(): void
    {
        $user = User::factory()->create();
        config(['admin.user_ids' => [$user->id]]);
        $this->actingAs($user);
    }

    public function test_publishing_editing_and_unpublishing_are_reflected_publicly(): void
    {
        $this->staff();
        $this->post('/admin/blog', $this->fields())->assertRedirect('/admin/blog');
        $post = BlogPost::firstOrFail();
        $this->get('/blog')->assertInertia(fn (Assert $page) => $page->has('blogPosts', 1)->where('blogPosts.0.excerpt', 'A summary'));
        $this->get('/blog/an-article')->assertInertia(fn (Assert $page) => $page->where('post.body', ['First paragraph.', 'Second paragraph.'])->has('otherPosts', 0));
        $this->patch('/admin/blog/'.$post->id, [...$this->fields(), 'title' => 'Edited article'])->assertRedirect();
        $this->get('/blog/an-article')->assertInertia(fn (Assert $page) => $page->where('post.title', 'Edited article'));
        $this->patch('/admin/blog/'.$post->id, [...$this->fields(), 'status' => 'Draft'])->assertRedirect();
        $this->get('/blog/an-article')->assertNotFound();
        $this->get('/blog/unknown')->assertNotFound();
        $this->get('/blog')->assertInertia(fn (Assert $page) => $page->has('blogPosts', 0));

        // PUB-04 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B).
        $this->assertDatabaseHas('audit_logs', ['action' => 'created', 'subject_type' => 'blog_post', 'subject_id' => $post->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'updated', 'subject_type' => 'blog_post', 'subject_id' => $post->id]);
    }

    public function test_future_posts_are_hidden_from_list_detail_and_related(): void
    {
        $this->seed(BlogPostSeeder::class);
        // The seeder deliberately creates drafts while its copy is placeholder; this test
        // is about the publish_date cutoff, so publish them explicitly.
        BlogPost::query()->update(['status' => 'published']);
        $post = BlogPost::firstOrFail();
        $post->update(['publish_date' => today()->addDay()]);
        $this->get('/blog/'.$post->slug)->assertNotFound();
        $this->get('/blog')->assertInertia(fn (Assert $page) => $page->has('blogPosts', 5));
        $other = BlogPost::whereKeyNot($post->id)->firstOrFail();
        $this->get('/blog/'.$other->slug)->assertInertia(fn (Assert $page) => $page->where('otherPosts', fn ($posts) => collect($posts)->every(fn ($row) => $row['slug'] !== $post->slug && $row['slug'] !== $other->slug)));
    }

    public function test_access_and_validation_protect_posts(): void
    {
        $this->get('/admin/blog')->assertRedirect('/login');
        $this->post('/admin/blog', $this->fields())->assertRedirect('/login');
        $this->actingAs(User::factory()->create());
        $this->post('/admin/blog', $this->fields())->assertForbidden();
        $this->get('/admin/blog')->assertForbidden();
        $this->staff();
        foreach ([['status' => 'Archived'], ['bannerMediaId' => 'not-an-int'], ['publishDate' => ''], ['authorId' => 999999]] as $invalid) {
            $this->postJson('/admin/blog', [...$this->fields(), ...$invalid])->assertUnprocessable();
        }
        $this->assertDatabaseCount('blog_posts', 0);
        $this->post('/admin/blog', $this->fields())->assertRedirect();
        $this->postJson('/admin/blog', [...$this->fields(), 'title' => ''])->assertUnprocessable();
        $post = BlogPost::firstOrFail();
        config(['admin.user_ids' => []]);
        $this->patch('/admin/blog/'.$post->id, $this->fields())->assertForbidden();
    }

    public function test_slug_is_generated_automatically_from_the_title_and_deduplicated_on_collision(): void
    {
        $this->staff();
        $this->post('/admin/blog', [...$this->fields(), 'urlSlug' => '', 'title' => 'Five Things!'])->assertRedirect();
        $first = BlogPost::firstOrFail();
        $this->assertSame('five-things', $first->slug);

        // Same title again: no validation error, just a deduplicated slug.
        $this->post('/admin/blog', [...$this->fields(), 'urlSlug' => '', 'title' => 'Five Things!'])->assertRedirect();
        $second = BlogPost::whereKeyNot($first->id)->firstOrFail();
        $this->assertSame('five-things-2', $second->slug);
    }

    public function test_seed_preserves_all_public_content_and_staff_changes(): void
    {
        $this->seed(BlogPostSeeder::class);
        $this->assertDatabaseCount('blog_posts', 6);
        $post = BlogPost::firstOrFail();
        $this->assertCount(3, $post->publicData()['body']);
        $post->update(['slug' => 'renamed', 'title' => 'Staff title']);
        $this->seed(BlogPostSeeder::class);
        $this->assertDatabaseCount('blog_posts', 6);
        $this->assertDatabaseHas('blog_posts', ['slug' => 'renamed', 'title' => 'Staff title']);
    }
}
