<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ServicePageTest extends TestCase
{
    use RefreshDatabase;

    private function publishedService(array $overrides = []): Service
    {
        return Service::create([
            'name' => 'Mobility', 'headline' => 'Move with confidence', 'slug' => 'mobility',
            'intro' => 'Support for your relocation.', 'status' => 'published', 'published_at' => now(),
            'sort_order' => 1, 'cta_link' => '/contact', 'cta_button_label' => 'Contact us',
            'rich_content' => '<p>We handle every step of the move.</p>',
            'featured_services' => [['name' => 'Visa applications', 'description' => 'End-to-end handling.']],
            ...$overrides,
        ]);
    }

    public function test_service_page_exposes_rich_content_and_featured_services_for_the_right_column(): void
    {
        $this->publishedService();

        $this->get('/services/mobility')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('service')
            ->where('service.rich_content', '<p>We handle every step of the move.</p>')
            ->where('service.featured_services.0.name', 'Visa applications')
            ->where('service.cta_link', '/contact')
            ->where('service.cta_button_label', 'Contact us'));
    }

    public function test_service_page_exposes_published_resources_assigned_to_that_service(): void
    {
        $service = $this->publishedService();
        $otherService = Service::create([
            'name' => 'Immigration', 'headline' => 'Immigration', 'slug' => 'immigration',
            'intro' => 'x', 'status' => 'published', 'sort_order' => 2,
        ]);
        $category = ResourceCategory::create([
            'slug' => 'guides', 'title' => 'Guides', 'layout' => 'cards', 'kind' => 'topic',
        ]);
        $resource = ResourceItem::create([
            'resource_category_id' => $category->id,
            'title' => 'Mobility guide',
            'description' => 'A useful guide.',
            'status' => 'published',
        ]);
        $resource->services()->sync([$service->id]);
        $draft = ResourceItem::create([
            'resource_category_id' => $category->id,
            'title' => 'Draft guide',
            'status' => 'draft',
        ]);
        $draft->services()->sync([$service->id]);
        $other = ResourceItem::create([
            'resource_category_id' => $category->id,
            'title' => 'Immigration guide',
            'status' => 'published',
        ]);
        $other->services()->sync([$otherService->id]);
        $paid = ResourceItem::create([
            'resource_category_id' => $category->id,
            'title' => 'Paid guide',
            'access_type' => ResourceItem::ACCESS_PAID,
            'price_cents' => 2500,
            'status' => 'published',
        ]);
        $paid->services()->sync([$service->id]);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->where('resources', function ($resources) use ($resource, $paid) {
                return collect($resources)->pluck('id')->all() === [
                    (string) $paid->id,
                    (string) $resource->id,
                ]
                    && collect($resources)->pluck('title')->all() === ['Paid guide', 'Mobility guide'];
            })
            ->where('resources.0.formattedPrice', 'US$25.00')
            ->where('resources.0.categorySlug', 'guides')
            ->where('resources.0.priceCents', 2500));
    }

    public function test_resources_can_be_assigned_to_a_specific_featured_service_and_resource_less_features_remain_visible(): void
    {
        $category = ResourceCategory::create([
            'slug' => 'guides', 'title' => 'Guides', 'layout' => 'cards', 'kind' => 'topic',
        ]);
        $assigned = ResourceItem::create([
            'resource_category_id' => $category->id,
            'title' => 'Visa guide',
            'status' => 'published',
        ]);
        $service = $this->publishedService([
            'featured_services' => [
                ['name' => 'Visa applications', 'description' => 'End-to-end handling.', 'resource_ids' => [$assigned->id]],
                ['name' => 'Settling in', 'description' => 'Practical support.', 'resource_ids' => []],
            ],
        ]);
        $assigned->services()->sync([$service->id]);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->where('service.featured_services.0.name', 'Visa applications')
            ->where('service.featured_services.0.resources.0.id', (string) $assigned->id)
            ->where('service.featured_services.1.name', 'Settling in')
            ->where('service.featured_services.1.resources', fn ($resources) => collect($resources)->isEmpty())
            ->where('resources', fn ($resources) => collect($resources)->isEmpty()));
    }

    public function test_relevant_posts_only_include_posts_tagged_to_this_service(): void
    {
        $service = $this->publishedService();
        $otherService = Service::create(['name' => 'Immigration', 'headline' => 'Immigration', 'slug' => 'immigration', 'intro' => 'x', 'status' => 'published', 'sort_order' => 2]);

        $tagged = BlogPost::create(['title' => 'Mobility tips', 'slug' => 'mobility-tips', 'excerpt' => 'Tips.', 'body' => 'Body.', 'status' => 'published', 'publish_date' => today()]);
        $tagged->services()->sync([$service->id]);
        $otherPost = BlogPost::create(['title' => 'Immigration news', 'slug' => 'immigration-news', 'excerpt' => 'News.', 'body' => 'Body.', 'status' => 'published', 'publish_date' => today()]);
        $otherPost->services()->sync([$otherService->id]);
        $untagged = BlogPost::create(['title' => 'General update', 'slug' => 'general-update', 'excerpt' => 'Update.', 'body' => 'Body.', 'status' => 'published', 'publish_date' => today()->subDay()]);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->where('relevantPosts', function ($posts) use ($tagged) {
                $slugs = collect($posts)->pluck('slug')->all();

                return $slugs === [$tagged->slug];
            }));
    }

    public function test_relevant_posts_exclude_untagged_posts(): void
    {
        $this->publishedService();
        BlogPost::create(['title' => 'General update', 'slug' => 'general-update', 'category' => 'Relocation', 'excerpt' => 'Update.', 'body' => 'Body.', 'status' => 'published', 'publish_date' => today()]);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->where('relevantPosts', fn ($posts) => collect($posts)->isEmpty()));
    }

    public function test_relevant_posts_exclude_draft_content(): void
    {
        $this->publishedService();
        BlogPost::create(['title' => 'Unpublished draft', 'slug' => 'unpublished-draft', 'category' => 'Mobility', 'excerpt' => 'Draft.', 'body' => 'Body.', 'status' => 'draft', 'publish_date' => today()]);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->where('relevantPosts', fn ($posts) => collect($posts)->isEmpty()));
    }

    // PUB-03 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): verifying,
    // not rebuilding — ServiceController's relevantPosts query already uses
    // BlogPost::publiclyVisible(), which filters on publish_date <= today.
    // A published post scheduled for the future must not appear here any
    // more than a draft does.
    public function test_relevant_posts_exclude_future_dated_posts(): void
    {
        $service = $this->publishedService();
        $scheduled = BlogPost::create(['title' => 'Scheduled post', 'slug' => 'scheduled-post', 'category' => 'Mobility', 'excerpt' => 'Soon.', 'body' => 'Body.', 'status' => 'published', 'publish_date' => today()->addWeek()]);
        $scheduled->services()->sync([$service->id]);
        $visible = BlogPost::create(['title' => 'Already live', 'slug' => 'already-live', 'category' => 'Mobility', 'excerpt' => 'Now.', 'body' => 'Body.', 'status' => 'published', 'publish_date' => today()]);
        $visible->services()->sync([$service->id]);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->where('relevantPosts', fn ($posts) => collect($posts)->pluck('slug')->all() === [$visible->slug]));
    }

    public function test_relevant_posts_are_capped_at_three_most_recent(): void
    {
        $service = $this->publishedService();
        foreach (range(1, 5) as $day) {
            $post = BlogPost::create(['title' => "Post $day", 'slug' => "post-$day", 'category' => 'Mobility', 'excerpt' => 'x', 'body' => 'x', 'status' => 'published', 'publish_date' => today()->subDays($day)]);
            $post->services()->sync([$service->id]);
        }

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->where('relevantPosts', function ($posts) {
                $slugs = collect($posts)->pluck('slug')->all();

                return count($slugs) === 3 && $slugs === ['post-1', 'post-2', 'post-3'];
            }));
    }
}
