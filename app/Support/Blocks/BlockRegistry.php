<?php

namespace App\Support\Blocks;

use App\Support\Blocks\Types\CardsBlock;
use App\Support\Blocks\Types\CtaBlock;
use App\Support\Blocks\Types\FaqBlock;
use App\Support\Blocks\Types\HeroBlock;
use App\Support\Blocks\Types\ImageTextBlock;
use App\Support\Blocks\Types\OpenPositionsBlock;
use App\Support\Blocks\Types\ResourcesPromoBlock;
use App\Support\Blocks\Types\ServicesGridBlock;
use App\Support\Blocks\Types\StandardsBlock;
use App\Support\Blocks\Types\StatsBlock;
use App\Support\Blocks\Types\TeamBlock;
use App\Support\Blocks\Types\TestimonialsBlock;
use App\Support\Blocks\Types\TextBlock;
use App\Support\Blocks\Types\TextWithListBlock;
use Illuminate\Support\Collection;

/**
 * Every block type a page can be built from. Add a new type by writing a
 * BlockType class under App\Support\Blocks\Types and listing it in
 * `types()` — nothing else references block types by name directly.
 */
class BlockRegistry
{
    /** @var array<string, BlockType> */
    private array $types;

    public function __construct()
    {
        $this->types = collect([
            new HeroBlock,
            new TextBlock,
            new CardsBlock,
            new ServicesGridBlock,
            new TestimonialsBlock,
            new ResourcesPromoBlock,
            new CtaBlock,
            new TextWithListBlock,
            new StandardsBlock,
            new ImageTextBlock,
            new TeamBlock,
            new OpenPositionsBlock,
            new StatsBlock,
            new FaqBlock,
        ])->keyBy(fn (BlockType $type) => $type->key())->all();
    }

    public function find(string $key): ?BlockType
    {
        return $this->types[$key] ?? null;
    }

    /** @return array<int, array{key: string, label: string, defaultData: array<string, mixed>}> for the admin "add a block" menu. */
    public function catalogue(): array
    {
        return collect($this->types)->map(fn (BlockType $type) => [
            'key' => $type->key(),
            'label' => $type->label(),
            'defaultData' => $type->defaultData(),
        ])->values()->all();
    }

    /**
     * Every rule for a page's whole `blocks` array in one call — the type
     * itself plus each type's own `data` rules, correctly indexed and
     * prefixed for Laravel's nested-array validator.
     *
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array<string, mixed>
     */
    public function rulesFor(array $blocks): array
    {
        $rules = [
            'blocks' => ['present', 'array', 'max:60'],
            'blocks.*.id' => ['required', 'string', 'max:64'],
            'blocks.*.type' => ['required', 'string', 'in:'.implode(',', array_keys($this->types))],
            'blocks.*.data' => ['array'],
        ];

        foreach ($blocks as $index => $block) {
            $type = $this->find((string) ($block['type'] ?? ''));
            if (! $type) {
                continue;
            }

            foreach ($type->rules() as $field => $fieldRules) {
                $rules["blocks.{$index}.data.{$field}"] = $fieldRules;
            }
        }

        return $rules;
    }

    /**
     * The stored `blocks` array with each block's `data` replaced by its
     * resolved public render props. Unknown/removed types are dropped
     * silently — a page never crashes because a block type was retired.
     *
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array<int, array<string, mixed>>
     */
    public function resolveForPublic(array $blocks): array
    {
        return Collection::make($blocks)
            ->map(function (array $block) {
                $type = $this->find((string) ($block['type'] ?? ''));

                return $type ? [
                    'id' => (string) ($block['id'] ?? ''),
                    'type' => $type->key(),
                    'data' => $type->resolve($block['data'] ?? []),
                ] : null;
            })
            ->filter()
            ->values()
            ->all();
    }
}
