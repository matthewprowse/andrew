<?php

namespace App\Services;

use App\Contracts\ContentTagger;
use App\Models\BlogPost;

/**
 * Gates every AI tag suggestion behind "does this post already have a manual
 * service assignment?" so a future admin-facing suggestion workflow can call
 * suggestServiceId() freely without risk of clobbering an editor's choice.
 */
class BlogPostTaggingService
{
    public function __construct(private readonly ContentTagger $tagger) {}

    /** Returns a suggested Service id, or null if the post is already manually tagged or no suggestion is available. */
    public function suggestServiceId(BlogPost $post): ?int
    {
        if ($post->services()->exists()) {
            return null;
        }

        return $this->tagger->suggestServiceId($post->title, $post->body);
    }
}
