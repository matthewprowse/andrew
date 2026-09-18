<?php

namespace App\Support\Blocks\Types;

use App\Support\Blocks\BlockType;

/** A heading and a list of question/answer pairs, shown as an expand-to-read accordion. */
class FaqBlock implements BlockType
{
    public function key(): string
    {
        return 'faq';
    }

    public function label(): string
    {
        return 'FAQ';
    }

    /** @return array<string, mixed> */
    public function defaultData(): array
    {
        return ['heading' => 'Frequently Asked Questions', 'items' => [
            ['question' => '', 'answer' => ''],
        ]];
    }

    public function rules(): array
    {
        return [
            'heading' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.question' => ['required', 'string', 'max:255'],
            'items.*.answer' => ['required', 'string', 'max:4000'],
        ];
    }

    public function resolve(array $data): array
    {
        return $data;
    }
}
