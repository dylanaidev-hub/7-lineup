import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

export function useHorizontalDragScroll<T extends HTMLElement>(ref: RefObject<T | null>, ignoreSelector?: string) {
  const dragRef = useRef<{ pointerId: number; x: number; scrollLeft: number; moved: boolean } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<T>) => {
    if (event.button !== 0) return;
    if (event.target instanceof HTMLElement && ignoreSelector && event.target.closest(ignoreSelector)) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<T>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) > 3) drag.moved = true;
    if (drag.moved && ref.current) ref.current.scrollLeft = drag.scrollLeft - distance;
  };

  const stopDragging = (event: ReactPointerEvent<T>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      dragRef.current = null;
    }, 0);
  };

  const preventClickAfterDrag = (event: React.MouseEvent<T>) => {
    if (!dragRef.current?.moved) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const didMove = () => Boolean(dragRef.current?.moved);

  return { onPointerDown, onPointerMove, onPointerUp: stopDragging, onPointerCancel: stopDragging, preventClickAfterDrag, didMove };
}
