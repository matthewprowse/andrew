import { useEffect, useState } from 'react';

/**
 * Tracks whether a sticky header should be visible: true while scrolling up
 * or near the top of the page, false while scrolling down past it.
 */
export function useHeaderVisible(hideAfter = 64) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        let lastY = window.scrollY;

        function onScroll() {
            const y = window.scrollY;
            const scrollingDown = y > lastY;

            setVisible(!scrollingDown || y < hideAfter);
            lastY = y;
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [hideAfter]);

    return visible;
}
