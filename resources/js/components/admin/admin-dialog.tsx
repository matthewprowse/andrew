import type { ReactNode } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Shared chrome for admin edit/create dialogs, matching the language
 * approved on /admin/test: a custom top-right close control (not the
 * default corner X), a flat borderless footer instead of the shaded default,
 * and a capped, scrollable height so long forms stay usable on small
 * screens. Compose these instead of rebuilding the same header/footer
 * markup per dialog.
 */
export function AdminDialogContent({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <DialogContent
            className={cn('max-h-[85vh] overflow-y-auto', className)}
            showCloseButton={false}
        >
            {children}
        </DialogContent>
    );
}

export function AdminDialogHeader({
    title,
    closeDisabled,
}: {
    title: ReactNode;
    closeDisabled?: boolean;
}) {
    return (
        <DialogHeader className="relative min-h-7 justify-center pr-8">
            <DialogTitle>{title}</DialogTitle>
            <DialogClose asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 -right-2 -translate-y-1/2 active:!-translate-y-1/2"
                    disabled={closeDisabled}
                >
                    <XIcon />
                    <span className="sr-only">Close</span>
                </Button>
            </DialogClose>
        </DialogHeader>
    );
}

export function AdminDialogFooter({ children }: { children: ReactNode }) {
    return (
        <DialogFooter className="!mx-0 !mb-0 !border-0 !bg-transparent !p-0">
            {children}
        </DialogFooter>
    );
}
