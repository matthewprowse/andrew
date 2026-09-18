<?php

namespace App\Support\Blocks;

/**
 * One entry in the block registry (App\Support\Blocks\BlockRegistry).
 * `data` is whatever shape this type declares — validated by `rules()` and,
 * for a data-driven type (services grid, testimonials…), turned into public
 * render props by `resolve()`. A purely editorial block (hero, text) can
 * just return `$data` unchanged from `resolve()`.
 */
interface BlockType
{
    /** Stored on each block as `type`, e.g. "hero". Stable — never renamed once used on a page. */
    public function key(): string;

    /** Shown in the admin "add a block" menu. */
    public function label(): string;

    /** Starting content for a freshly added block.
     *
     * @return array<string, mixed>
     */
    public function defaultData(): array;

    /**
     * Laravel validation rules for this block's `data`, keyed the same way
     * as the data itself (see SavePageBlocksRequest, which prefixes each
     * rule with `blocks.{index}.data.`).
     *
     * @return array<string, mixed>
     */
    public function rules(): array;

    /**
     * Turns stored `data` into what the public page component renders.
     * Content-only blocks return `$data` as-is; data-driven blocks replace
     * or add fields here (e.g. a resolved `services` list) — this is the
     * one place a block type is allowed to query the database.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function resolve(array $data): array;
}
