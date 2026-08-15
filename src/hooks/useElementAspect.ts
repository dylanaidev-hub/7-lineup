import { useEffect, useState, type RefObject } from "react";

/** 68x105 — the pitch's CSS aspect, and the right guess before the first measure. */
export const DEFAULT_PITCH_ASPECT = 68 / 105;

/**
 * Rendered aspect and height of an element. Measured rather than derived from
 * the orientation flag, because mobile fullscreen drops the CSS `aspect-ratio`
 * entirely (workspace-fullscreen.css) and the drawing geometry has to follow
 * the real box. The height converts pixel-sized chrome (ghost markers) into the
 * 0-100 space the geometry works in.
 */
export function useElementAspect(ref: RefObject<Element | null>, fallback = DEFAULT_PITCH_ASPECT) {
  const [box, setBox] = useState({ aspect: fallback, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBox({ aspect: width / height, height });
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return box;
}
