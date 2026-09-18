/**
 * PUB-01 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B): shown at the
 * top of a public template only when it's being rendered by
 * PageContentController::preview() with draft content swapped in — never
 * on the real public page. A visual cue in addition to the noindex meta tag
 * (see PageMeta's `noindex` prop), so a signed-in editor can never mistake
 * a preview tab for the live site.
 */
export function PreviewBanner() {
    return (
        <div
            role="status"
            className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
        >
            Draft preview — this page is not published and is not visible to the
            public.
        </div>
    );
}
