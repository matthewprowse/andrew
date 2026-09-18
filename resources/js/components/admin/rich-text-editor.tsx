import { useEffect, useRef, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RICH_CONTENT_TYPOGRAPHY_CLASSES } from '@/lib/rich-content-typography';
import { cn } from '@/lib/utils';

/** Walks up from the selection anchor to find the enclosing block's type, so the
 * toolbar select can reflect wherever the caret/highlight actually is. */
function detectBlockType(node: Node, editor: HTMLElement): string {
    let current: Node | null = node;

    while (current && current !== editor) {
        if (current instanceof HTMLElement) {
            switch (current.tagName.toLowerCase()) {
                case 'h1':
                    return 'heading-1';
                case 'h2':
                    return 'heading-2';
                case 'h3':
                    return 'heading-3';
                case 'li': {
                    const list = current.closest('ol, ul');
                    return list?.tagName.toLowerCase() === 'ol'
                        ? 'numbered-list'
                        : 'bulleted-list';
                }
                case 'p':
                    return 'paragraph';
            }
        }
        current = current.parentNode;
    }

    return 'paragraph';
}

/**
 * Minimal WYSIWYG editor for service rich content, matching the toolbar and
 * output shape approved on /admin/test. Emits raw HTML via onChange; the
 * server re-sanitizes on save (see App\Support\RichContentSanitizer), so this
 * component only needs to produce well-formed markup, not guarantee safety.
 */
export function RichTextEditor({
    value,
    onChange,
    'aria-label': ariaLabel = 'Rich content',
}: {
    value: string;
    onChange: (value: string) => void;
    'aria-label'?: string;
}) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [blockType, setBlockType] = useState('paragraph');

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    useEffect(() => {
        function handleSelectionChange() {
            const editor = editorRef.current;
            const selection = window.getSelection();
            if (!editor || !selection || selection.rangeCount === 0) return;
            if (!editor.contains(selection.anchorNode)) return;

            setBlockType(detectBlockType(selection.anchorNode as Node, editor));
        }

        document.addEventListener('selectionchange', handleSelectionChange);
        return () =>
            document.removeEventListener(
                'selectionchange',
                handleSelectionChange,
            );
    }, []);

    function format(command: string, commandValue?: string) {
        editorRef.current?.focus();
        document.execCommand(command, false, commandValue);
        onChange(editorRef.current?.innerHTML ?? '');
    }

    function applyBlockType(type: string) {
        const wasList = ['bulleted-list', 'numbered-list'].includes(blockType);

        editorRef.current?.focus();

        if (wasList && type !== 'bulleted-list' && type !== 'numbered-list') {
            document.execCommand(
                blockType === 'bulleted-list'
                    ? 'insertUnorderedList'
                    : 'insertOrderedList',
            );
        }

        switch (type) {
            case 'heading-1':
                format('formatBlock', '<h1>');
                break;
            case 'heading-2':
                format('formatBlock', '<h2>');
                break;
            case 'heading-3':
                format('formatBlock', '<h3>');
                break;
            case 'bulleted-list':
                format('insertUnorderedList');
                break;
            case 'numbered-list':
                format('insertOrderedList');
                break;
            default:
                format('formatBlock', '<p>');
        }

        setBlockType(type);
    }

    return (
        <div className="space-y-1">
            <div className="flex min-h-10 w-full items-center py-1">
                <Select value={blockType} onValueChange={applyBlockType}>
                    <SelectTrigger aria-label="Text style" className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectSeparator />
                        <SelectItem value="heading-1">Heading 1</SelectItem>
                        <SelectItem value="heading-2">Heading 2</SelectItem>
                        <SelectItem value="heading-3">Heading 3</SelectItem>
                        <SelectSeparator />
                        <SelectItem
                            value="bulleted-list"
                            disabled={[
                                'heading-1',
                                'heading-2',
                                'heading-3',
                            ].includes(blockType)}
                        >
                            Bulleted List
                        </SelectItem>
                        <SelectItem
                            value="numbered-list"
                            disabled={[
                                'heading-1',
                                'heading-2',
                                'heading-3',
                            ].includes(blockType)}
                        >
                            Numbered List
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label={ariaLabel}
                className={cn(
                    'rounded-md border px-3 py-2 outline-none',
                    RICH_CONTENT_TYPOGRAPHY_CLASSES,
                )}
                onInput={(event) => onChange(event.currentTarget.innerHTML)}
            />
        </div>
    );
}
