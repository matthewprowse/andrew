<?php

// @todo Gate 4: the 5 `services` rows are also published with Lorem Ipsum copy, but they
// cannot be unpublished yet without breaking site navigation — App\Support\PublicSettings::menu()
// builds the services menu from published services, and another agent is actively editing
// service/media-library admin code. Enable a corresponding assertion here once real service
// copy lands and the services can be safely gated.

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Career;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PlaceholderContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_lorem_blog_post_is_excluded_from_the_public_blog_listing_and_its_page(): void
    {
        $post = BlogPost::create([
            'title' => 'Lorem Ipsum Dolor Sit Amet',
            'slug' => 'lorem-ipsum-placeholder-post',
            'category' => 'Placeholder',
            'excerpt' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            'body' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            'status' => 'draft',
            'publish_date' => today()->subDay(),
        ]);

        $this->get('/blog')->assertInertia(fn (Assert $page) => $page->has('blogPosts', 0));
        $this->get('/blog/'.$post->slug)->assertNotFound();
    }

    public function test_closed_lorem_career_is_excluded_from_the_about_page_open_positions(): void
    {
        Career::create([
            'job_title' => 'Lorem Ipsum Consultant',
            'description' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            'location' => 'Johannesburg, South Africa',
            'status' => 'closed',
            'posted_date' => today()->subDay(),
        ]);

        // The open_positions block (see App\Support\Blocks\Types\
        // OpenPositionsBlock) renders every entry it's given with no
        // further filtering, so asserting its resolved list is empty is
        // equivalent to asserting the closed role is excluded from the page.
        $this->get('/about')->assertInertia(fn (Assert $page) => $page->has('blocks.4.data.positions', 0));
    }

    public function test_draft_placeholder_resource_item_is_excluded_from_its_category_page(): void
    {
        $category = ResourceCategory::create(['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list']);

        ResourceItem::create([
            'resource_category_id' => $category->id,
            'title' => 'Placeholder Brochure',
            'description' => 'Placeholder description — replace this copy and attach a real file or link from the admin before publishing.',
            'action_label' => 'Download PDF',
            'sort_order' => 1,
            'status' => 'draft',
        ]);

        $this->get('/resources/brochures')->assertInertia(fn (Assert $page) => $page->has('items', 0));
    }

    public function test_sitemap_returns_ok_and_omits_the_url_of_a_draft_lorem_blog_post(): void
    {
        $post = BlogPost::create([
            'title' => 'Lorem Ipsum Dolor Sit Amet',
            'slug' => 'lorem-ipsum-sitemap-post',
            'category' => 'Placeholder',
            'excerpt' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            'body' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            'status' => 'draft',
            'publish_date' => today()->subDay(),
        ]);

        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertDontSee(config('app.url').'/blog/'.$post->slug, false);
    }
}
