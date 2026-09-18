<?php

namespace Tests\Feature;

use App\Contracts\ContentTagger;
use App\Contracts\MarketingSubscriberProvider;
use App\Jobs\SubscribeToMarketingList;
use App\Models\BlogPost;
use App\Models\Media;
use App\Models\ResourceCategory;
use App\Models\ResourceItem;
use App\Models\ResourceRequest;
use App\Models\Service;
use App\Services\BlogPostTaggingService;
use App\Services\FakeMarketingSubscriberProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class MarketingAndTaggingAdaptersTest extends TestCase
{
    use RefreshDatabase;

    private function gatedItem(): ResourceItem
    {
        $category = ResourceCategory::create(['slug' => 'brochures', 'title' => 'Brochures', 'layout' => 'list']);
        $media = Media::create(['file_name' => 'guide.pdf', 'file_path' => 'media/guide.pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'kind' => 'document']);

        return ResourceItem::create([
            'resource_category_id' => $category->id, 'title' => 'Relocation Guide', 'file_media_id' => $media->id,
            'access_type' => 'email', 'status' => 'published', 'sort_order' => 1,
        ]);
    }

    public function test_verifying_resource_access_queues_a_marketing_subscription_only_once(): void
    {
        Mail::fake();
        Queue::fake();
        $item = $this->gatedItem();

        $this->post("/resources/brochures/{$item->id}/request-access", [
            'first_name' => 'Jane', 'last_name' => 'Doe', 'email' => 'jane@example.com', 'consent' => true,
        ]);
        $resourceRequest = ResourceRequest::sole();
        $signedUrl = URL::temporarySignedRoute('resources.access.verify', now()->addHours(24), ['resourceRequest' => $resourceRequest->id]);

        $this->get($signedUrl);
        $this->get($signedUrl); // visiting twice must not double-subscribe

        Queue::assertPushed(SubscribeToMarketingList::class, 1);
        Queue::assertPushed(SubscribeToMarketingList::class, fn (SubscribeToMarketingList $job) => $job->email === 'jane@example.com'
            && $job->firstName === 'Jane'
            && $job->lastName === 'Doe'
            && $job->attributes['resource'] === 'Relocation Guide');
    }

    public function test_the_fake_marketing_provider_records_the_subscription_without_any_network_call(): void
    {
        $provider = $this->app->make(MarketingSubscriberProvider::class);

        (new SubscribeToMarketingList('jane@example.com', 'Jane', 'Doe', ['source' => 'resource-download']))->handle($provider);

        $this->assertInstanceOf(FakeMarketingSubscriberProvider::class, $provider);
        $this->assertCount(1, $provider->subscriptions);
        $this->assertSame('jane@example.com', $provider->subscriptions[0]['email']);
    }

    public function test_tagging_service_never_suggests_over_a_manually_tagged_post(): void
    {
        $service = Service::create(['name' => 'Immigration', 'headline' => 'Immigration', 'slug' => 'immigration', 'intro' => 'x', 'status' => 'published', 'sort_order' => 1]);
        $post = BlogPost::create(['title' => 'A post', 'slug' => 'a-post', 'excerpt' => 'x', 'body' => 'x', 'status' => 'draft']);
        $post->services()->sync([$service->id]);

        $tagger = $this->createStub(ContentTagger::class);
        $tagger->method('suggestServiceId')->willReturn(999);

        $suggestion = (new BlogPostTaggingService($tagger))->suggestServiceId($post);

        $this->assertNull($suggestion);
    }

    public function test_tagging_service_returns_a_suggestion_for_an_untagged_post(): void
    {
        $post = BlogPost::create(['title' => 'A post', 'slug' => 'a-post', 'excerpt' => 'x', 'body' => 'x', 'status' => 'draft']);

        $tagger = $this->createStub(ContentTagger::class);
        $tagger->method('suggestServiceId')->willReturn(42);

        $suggestion = (new BlogPostTaggingService($tagger))->suggestServiceId($post);

        $this->assertSame(42, $suggestion);
    }
}
