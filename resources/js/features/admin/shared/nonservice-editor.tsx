import { router } from '@inertiajs/react';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Shared nonservice admin-editor pattern (CMS-07,
 * docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 3). Deliberately NOT applied to
 * Services — see the plan's protected-boundary rule. Factored out of
 * page-content-manager.tsx (CMS-01/02) so the next batch's Company/About and
 * Locations editors can reuse the same grouping, save-state, and
 * unsaved-changes pieces instead of re-deriving them. Kept intentionally
 * small: only what CMS-01/02 actually needed, not a speculative framework.
 */

/**
 * Warns before an Inertia navigation, or a full page unload/reload/close,
 * would discard unsaved form state. Pass a form's live dirty flag (e.g.
 * Inertia's `useForm().isDirty`) — the hook re-reads it via a ref on every
 * render, so callers don't need to memoize anything.
 */
export function useUnsavedChangesWarning(
    isDirty: boolean,
    message = 'You have unsaved changes. Leave this page anyway?',
): void {
    const dirtyRef = useRef(isDirty);
    dirtyRef.current = isDirty;

    useEffect(() => {
        function handleBeforeUnload(event: BeforeUnloadEvent) {
            if (!dirtyRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        const removeInertiaGuard = router.on('before', () => {
            if (!dirtyRef.current) return true;
            return window.confirm(message);
        });

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            removeInertiaGuard();
        };
    }, [message]);
}

/**
 * A titled, visually grouped block of fields — the "Content" / "SEO" /
 * "Publishing" groupings CMS-07 calls for. Publishing isn't used yet (no
 * draft/publish workflow exists before Phase 5's PUB-01), but the section
 * shape is ready for it.
 */
export function EditorSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">{title}</h2>
                {description && (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                )}
            </div>
            <div className="grid gap-4">{children}</div>
        </section>
    );
}

/** A small, always-visible indicator of the form's current save state. */
export function SaveStatus({
    processing,
    isDirty,
    savedMessage,
}: {
    processing: boolean;
    isDirty: boolean;
    savedMessage: string;
}) {
    if (processing) {
        return (
            <p role="status" className="text-muted-foreground text-sm">
                Saving…
            </p>
        );
    }
    if (isDirty) {
        return (
            <p
                role="status"
                className="text-sm text-amber-600 dark:text-amber-500"
            >
                Unsaved changes
            </p>
        );
    }
    if (savedMessage) {
        return (
            <p role="status" className="text-sm">
                {savedMessage}
            </p>
        );
    }
    return null;
}
