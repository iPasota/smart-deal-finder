import { useEffect, useRef, useState } from "react";

// Reveals items in chunks as a sentinel scrolls into view. Filtering still
// runs on the full array (in the parent), so results outside the currently
// visible slice are counted and appear as the user scrolls.
export function useLazyList<T>(items: T[], initial = 48, step = 48) {
  const [visible, setVisible] = useState(initial);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when the underlying array identity changes (e.g. filter applied).
  useEffect(() => {
    setVisible(initial);
  }, [items, initial]);

  useEffect(() => {
    if (visible >= items.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible((v) => Math.min(v + step, items.length));
          }
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, visible, step]);

  return { visible: Math.min(visible, items.length), sentinelRef, hasMore: visible < items.length };
}
