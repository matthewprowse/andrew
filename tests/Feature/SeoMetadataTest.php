<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SeoMetadataTest extends TestCase
{
    use RefreshDatabase;

    public function test_services_index_carries_the_shared_canonical_url_for_its_static_seo_copy(): void
    {
        $this->get('/services')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('services')
            ->where('canonicalUrl', fn ($url) => str_ends_with($url, '/services')));
    }

    public function test_blog_index_carries_the_shared_canonical_url_for_its_static_seo_copy(): void
    {
        $this->get('/blog')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('blog')
            ->where('canonicalUrl', fn ($url) => str_ends_with($url, '/blog')));
    }

    public function test_service_detail_exposes_seo_metadata_and_faqs_with_record_values_winning_over_the_fallback(): void
    {
        $service = Service::create([
            'name' => 'Mobility Services',
            'headline' => 'Move with confidence',
            'slug' => 'mobility',
            'intro' => "First paragraph about relocation support.\n\nSecond paragraph with more detail.",
            'status' => 'published',
            'sort_order' => 1,
            'faqs' => [['question' => 'Where do you operate?', 'answer' => 'Across Africa.']],
        ]);

        $this->get('/services/mobility')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('service')
            ->where('service.metaTitle', '')
            ->where('service.metaDescription', '')
            ->where('service.name', 'Mobility Services')
            ->where('service.intro', "First paragraph about relocation support.\n\nSecond paragraph with more detail.")
            ->has('service.faqs', 1)
            ->where('service.faqs.0.question', 'Where do you operate?')
            ->where('service.faqs.0.answer', 'Across Africa.')
            ->where('canonicalUrl', fn ($url) => str_ends_with($url, '/mobility')));

        $service->update(['meta_title' => 'Mobility Services | Custom Title', 'meta_description' => 'A custom search-engine description that overrides the fallback.']);

        $this->get('/services/mobility')->assertInertia(fn (Assert $page) => $page
            ->component('service')
            ->where('service.metaTitle', 'Mobility Services | Custom Title')
            ->where('service.metaDescription', 'A custom search-engine description that overrides the fallback.'));
    }

    public function test_blog_post_detail_exposes_seo_metadata_with_record_values_winning_over_the_fallback(): void
    {
        $post = BlogPost::create([
            'title' => 'An article about relocation',
            'slug' => 'an-article-about-relocation',
            'category' => 'Mobility',
            'excerpt' => 'A helpful summary of the article.',
            'body' => 'Full article body content.',
            'status' => 'published',
            'publish_date' => now()->subDay(),
        ]);

        $this->get('/blog/an-article-about-relocation')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('blog-post')
            ->where('post.metaTitle', '')
            ->where('post.metaDescription', '')
            ->where('post.title', 'An article about relocation')
            ->where('post.excerpt', 'A helpful summary of the article.')
            ->where('canonicalUrl', fn ($url) => str_ends_with($url, '/blog/an-article-about-relocation')));

        $post->update(['meta_title' => 'Custom Article Title', 'meta_description' => 'A custom search-engine description that overrides the excerpt.']);

        $this->get('/blog/an-article-about-relocation')->assertInertia(fn (Assert $page) => $page
            ->component('blog-post')
            ->where('post.metaTitle', 'Custom Article Title')
            ->where('post.metaDescription', 'A custom search-engine description that overrides the excerpt.'));
    }
}
