<?php

namespace App\Contracts;

/**
 * Adapter boundary for AI-assisted service tagging of Insights content.
 * Suggestions only — manual tags are always the source of truth, and no
 * caller may use a suggestion to overwrite an existing manual assignment.
 */
interface ContentTagger
{
    /** Returns a suggested Service id, or null when no confident suggestion is available. */
    public function suggestServiceId(string $title, string $body): ?int;
}
