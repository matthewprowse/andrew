import { useEffect, useRef, useState } from 'react';

/**
 * Measures the first frozen column so the second one can be pinned directly beside it.
 *
 * A `sticky left-*` offset has to equal the *rendered* width of the column before it, and that
 * width isn't knowable up front: table columns size themselves to their content, which varies
 * with the data, the font and the filter. Hard-coding it (via `table-fixed` plus `w-*` classes)
 * either desyncs the two frozen columns or truncates the content to make the guess true. So the
 * width is measured instead, and re-measured whenever the column resizes.
 *
 * The offset is only used once the grid is scrolled horizontally — before that the cell sits in
 * normal flow — so the 0 returned on the first render is never visible.
 */
export function useFrozenColumn<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Floored, because the measured width is fractional: rounding up would leave a sub-pixel
        // seam between the two frozen columns for the scrolling content to show through, whereas
        // flooring overlaps them by <1px of padding, which is invisible.
        const measure = () =>
            setWidth(Math.floor(element.getBoundingClientRect().width));
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return { ref, width };
}
