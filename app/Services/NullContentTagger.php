<?php

namespace App\Services;

use App\Contracts\ContentTagger;

/**
 * Default ContentTagger until Andrew approves an AI tagging vendor and
 * confirms tags are suggestion-only. Never guesses via string-matching on
 * free-text categories — returns no suggestion until a real vendor is wired.
 */
class NullContentTagger implements ContentTagger
{
    public function suggestServiceId(string $title, string $body): ?int
    {
        return null;
    }
}
