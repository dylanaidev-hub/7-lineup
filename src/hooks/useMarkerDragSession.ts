import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type DragPoint = { x: number; y: number };

type PointerLike = Pick<ReactPointerEvent<HTMLElement>, "clientX" | "clientY" | "pointerId">;

type Options<TId extends number | string> = {
  canStart: () => boolean;
  threshold?: number;
  /** When false, skip the fixed-position ghost (marker moves on the pitch instead). */
  showPreview?: boolean;
  onMove?: (event: ReactPointerEvent<HTMLElement>, id: TId) => void;
  onDrop: (event: ReactPointerEvent<HTMLElement>, id: TId) => void;
};

export function useMarkerDragSession<TId extends number | string>({
  canStart,
  threshold = 4,
  showPreview = true,
  onMove,
  onDrop,
}: Options<TId>) {
  const [activeId, setActiveId] = useState<TId | null>(null);
  const [preview, setPreview] = useState<(DragPoint & { id: TId }) | null>(null);
  const sessionRef = useRef<{ id: TId; pointerId: number; start: DragPoint; moved: boolean } | null>(null);
  const onMoveRef = useRef(onMove);
  const onDropRef = useRef(onDrop);
  onMoveRef.current = onMove;
  onDropRef.current = onDrop;

  const finishSession = (event: PointerLike, target: EventTarget | null) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (session.moved) {
      onDropRef.current(event as ReactPointerEvent<HTMLElement>, session.id);
    }

    if (target instanceof Element && target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    sessionRef.current = null;
    setActiveId(null);
    setPreview(null);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, id: TId) => {
    if (!canStart() || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    sessionRef.current = { id, pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, moved: false };
    setActiveId(id);
    if (showPreview) {
      setPreview({ id, x: event.clientX, y: event.clientY });
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>, id: TId) => {
    const session = sessionRef.current;
    if (!session || session.id !== id || session.pointerId !== event.pointerId) return;
    if (!session.moved && Math.hypot(event.clientX - session.start.x, event.clientY - session.start.y) < threshold) return;
    session.moved = true;
    if (showPreview) {
      setPreview({ id, x: event.clientX, y: event.clientY });
    }
    onMoveRef.current?.(event, id);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    finishSession(event, event.currentTarget);
  };

  useEffect(() => {
    if (activeId === null) return;

    const handleWindowPointerEnd = (event: PointerEvent) => {
      finishSession(event, event.target);
    };

    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);
    return () => {
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
    };
  }, [activeId]);

  const clear = () => {
    sessionRef.current = null;
    setActiveId(null);
    setPreview(null);
  };

  return { activeId, preview, onPointerDown, onPointerMove, onPointerEnd, clear };
}
