<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;

/**
 * Allowlist HTML sanitizer for service rich content. Authors edit through a
 * contentEditable toolbar that only ever emits this fixed set of tags, so
 * anything else (script, style, event handler attributes, unsafe hrefs) is
 * stripped server-side rather than trusted from the client.
 */
class RichContentSanitizer
{
    private const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'blockquote', 'br'];

    /** Tags whose content must be discarded outright rather than unwrapped. */
    private const DROP_CONTENT_TAGS = ['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg'];

    private const SAFE_LINK_PATTERN = '~^(?:/(?!/)[^\s"\'<>]*|https?://[^\s"\'<>]+|mailto:[^\s"\'<>]+)$~i';

    public static function sanitize(?string $html): string
    {
        $html = trim((string) $html);

        if ($html === '') {
            return '';
        }

        $document = new DOMDocument;
        libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="utf-8"?><div>'.$html.'</div>', LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();

        $root = $document->getElementsByTagName('div')->item(0);

        return $root ? self::sanitizeChildren($root) : '';
    }

    private static function sanitizeChildren(DOMNode $node): string
    {
        $output = '';

        foreach (iterator_to_array($node->childNodes) as $child) {
            $output .= self::sanitizeNode($child);
        }

        return $output;
    }

    private static function sanitizeNode(DOMNode $node): string
    {
        if ($node instanceof DOMText) {
            return htmlspecialchars($node->textContent, ENT_QUOTES | ENT_HTML5);
        }

        if (! $node instanceof DOMElement) {
            return '';
        }

        $tag = strtolower($node->tagName);

        if (in_array($tag, self::DROP_CONTENT_TAGS, true)) {
            return '';
        }

        $inner = self::sanitizeChildren($node);

        if (! in_array($tag, self::ALLOWED_TAGS, true)) {
            // Unwrap other disallowed tags (div, span, img, ...) rather than
            // dropping their text content outright.
            return $inner;
        }

        if ($tag === 'br') {
            return '<br>';
        }

        if ($tag === 'a') {
            $href = $node->getAttribute('href');
            $safeHref = preg_match(self::SAFE_LINK_PATTERN, $href) === 1 ? $href : '#';

            return '<a href="'.htmlspecialchars($safeHref, ENT_QUOTES | ENT_HTML5).'">'.$inner.'</a>';
        }

        return "<{$tag}>{$inner}</{$tag}>";
    }
}
