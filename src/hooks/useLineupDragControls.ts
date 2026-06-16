import type { Dispatch, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import type { PitchSize } from "../appRouting";
import { getZoneName, type FormationPlayer, type OpponentMarker } from "../formationData";
import type { TacticalMarker } from "../tacticalData";

export type LineupDragPreviewState = {
  type: "player" | "opponent" | "ball";
  id: number | string;
  x: number;
  y: number;
};

type PitchPosition = {
  isInside: boolean;
  x: number;
  y: number;
};

type UseLineupDragControlsOptions = {
  pitchRef: RefObject<HTMLDivElement | null>;
  pitchSize: PitchSize;
  isDrawMode: boolean;
  isAnimationTool: boolean;
  isPersonnelTool: boolean;
  isPlaying: boolean;
  ballMarker: TacticalMarker | undefined;
  updateTacticalMarker: (id: string, x: number, y: number, onPitch?: boolean) => void;
  setPlayers: Dispatch<SetStateAction<FormationPlayer[]>>;
  setCustomCount: Dispatch<SetStateAction<number>>;
  setOpponentMarkers: Dispatch<SetStateAction<OpponentMarker[]>>;
};

const clampPitchCoordinate = (value: number) => Math.min(96, Math.max(4, value));

const getBoundedPitchPosition = (position: { x: number; y: number }) => ({
  x: clampPitchCoordinate(position.x),
  y: clampPitchCoordinate(position.y),
});

export function useLineupDragControls({
  pitchRef,
  pitchSize,
  isDrawMode,
  isAnimationTool,
  isPersonnelTool,
  isPlaying,
  ballMarker,
  updateTacticalMarker,
  setPlayers,
  setCustomCount,
  setOpponentMarkers,
}: UseLineupDragControlsOptions) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingOpponentId, setDraggingOpponentId] = useState<number | null>(null);
  const [draggingTacticalMarkerId, setDraggingTacticalMarkerId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<LineupDragPreviewState | null>(null);
  const dragStartRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const getPitchClientPosition = (clientX: number, clientY: number, options: { clamp?: boolean } = {}): PitchPosition | null => {
    const pitch = pitchRef.current;
    if (!pitch) return null;

    const rect = pitch.getBoundingClientRect();
    const styles = window.getComputedStyle(pitch);
    const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
    const contentLeft = rect.left + borderLeft;
    const contentTop = rect.top + borderTop;
    const contentWidth = pitch.clientWidth;
    const contentHeight = pitch.clientHeight;
    const rawX = ((clientX - contentLeft) / contentWidth) * 100;
    const rawY = ((clientY - contentTop) / contentHeight) * 100;
    const shouldClamp = options.clamp ?? true;

    return {
      isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
      x: shouldClamp ? clampPitchCoordinate(rawX) : rawX,
      y: shouldClamp ? clampPitchCoordinate(rawY) : rawY,
    };
  };

  const getPitchPointerPosition = (event: ReactPointerEvent<Element>, options: { clamp?: boolean } = {}) => {
    return getPitchClientPosition(event.clientX, event.clientY, options);
  };

  const updatePlayerPosition = (event: ReactPointerEvent<Element>, id: number) => {
    const position = getPitchPointerPosition(event, { clamp: false });
    if (!position) return;
    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });

    setPlayers((current) => {
      const nextPlayers = current.map((player) =>
        player.id === id
          ? {
              ...player,
              position: position.isInside
                ? getZoneName(pitchSize, clampPitchCoordinate(position.x), clampPitchCoordinate(position.y))
                : player.position,
              x: position.isInside ? clampPitchCoordinate(position.x) : player.x,
              y: position.isInside ? clampPitchCoordinate(position.y) : player.y,
              onPitch: position.isInside,
            }
          : player,
      );

      if (pitchSize === "custom") {
        setCustomCount(nextPlayers.filter((player) => player.onPitch).length);
      }

      return nextPlayers;
    });
  };

  const updateOpponentPosition = (event: ReactPointerEvent<Element>, id: number) => {
    const position = getPitchPointerPosition(event, { clamp: false });
    if (!position) return;
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });

    setOpponentMarkers((current) =>
      current.map((marker) =>
        marker.id === id
          ? {
              ...marker,
              onPitch: position.isInside,
              x: position.isInside ? clampPitchCoordinate(position.x) : marker.x,
              y: position.isInside ? clampPitchCoordinate(position.y) : marker.y,
            }
          : marker,
      ),
    );
  };

  const syncPlayerFromAnimation = (id: number, x: number, y: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? {
              ...player,
              x,
              y,
              position: getZoneName(pitchSize, x, y),
              onPitch: true,
            }
          : player,
      ),
    );
  };

  const syncOpponentFromAnimation = (id: number, x: number, y: number) => {
    setOpponentMarkers((current) =>
      current.map((marker) =>
        marker.id === id
          ? {
              ...marker,
              x,
              y,
              onPitch: true,
            }
          : marker,
      ),
    );
  };

  const updateBallMarkerFromPoint = (clientX: number, clientY: number, commitDrop = false) => {
    const marker = ballMarker ?? { id: "ball", label: "", type: "ball" as const, x: 50, y: 56, onPitch: false };
    const position = getPitchClientPosition(clientX, clientY, { clamp: false });
    setDragPreview({ type: "ball", id: marker.id, x: clientX, y: clientY });
    if (!position) return;

    if (position.isInside) {
      const boundedPosition = getBoundedPitchPosition(position);
      if (marker.onPitch || commitDrop) {
        updateTacticalMarker(marker.id, boundedPosition.x, boundedPosition.y, true);
      }
      return;
    }

    if (commitDrop) {
      updateTacticalMarker(marker.id, marker.x, marker.y, false);
    }
  };

  const updateBallMarkerFromPointer = (event: ReactPointerEvent<HTMLElement>, commitDrop = false) => {
    updateBallMarkerFromPoint(event.clientX, event.clientY, commitDrop);
  };

  useEffect(() => {
    if (draggingTacticalMarkerId !== "ball") return;

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (isPlaying) return;
      updateBallMarkerFromPoint(event.clientX, event.clientY);
    };
    const handleWindowPointerEnd = (event: PointerEvent) => {
      updateBallMarkerFromPoint(event.clientX, event.clientY, true);
      setDraggingTacticalMarkerId(null);
      setDragPreview(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
    };
  }, [ballMarker, draggingTacticalMarkerId, isPlaying]);

  const handleTacticalMarkerPointerDown = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (!(isAnimationTool || isPersonnelTool) || isPlaying) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingTacticalMarkerId(id);
    if (id === "ball") {
      updateBallMarkerFromPointer(event);
      return;
    }
    const position = getPitchPointerPosition(event, { clamp: true });
    if (position) {
      updateTacticalMarker(id, position.x, position.y, true);
    }
  };

  const handleTacticalMarkerPointerMove = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (draggingTacticalMarkerId !== id || isPlaying) return;
    if (id === "ball") {
      updateBallMarkerFromPointer(event);
      return;
    }
    const position = getPitchPointerPosition(event, { clamp: true });
    if (!position) return;
    updateTacticalMarker(id, position.x, position.y, true);
  };

  const stopTacticalMarkerDragging = (event?: ReactPointerEvent<HTMLElement>) => {
    if (draggingTacticalMarkerId === "ball" && event) {
      updateBallMarkerFromPointer(event, true);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
    setDraggingTacticalMarkerId(null);
    setDragPreview(null);
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (isDrawMode || (isAnimationTool && isPlaying)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });
    dragStartRef.current = { id, x: event.clientX, y: event.clientY };
    if (isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`p${id}`, position.x, position.y, true);
        syncPlayerFromAnimation(id, position.x, position.y);
      }
    }
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (draggingId !== id) return;
    if (isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });
      if (position) {
        updateTacticalMarker(`p${id}`, position.x, position.y, true);
        syncPlayerFromAnimation(id, position.x, position.y);
      }
      return;
    }
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.id !== id) return;

    const movedX = event.clientX - dragStart.x;
    const movedY = event.clientY - dragStart.y;
    if (Math.hypot(movedX, movedY) < 6) return;

    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });
  };

  const stopDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const id = draggingId;
    if (id !== null && isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`p${id}`, position.x, position.y, true);
        syncPlayerFromAnimation(id, position.x, position.y);
      }
    } else if (id !== null) {
      updatePlayerPosition(event, id);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    setDragPreview(null);
    dragStartRef.current = null;
  };

  const handleOpponentDragStart = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (isDrawMode || (isAnimationTool && isPlaying)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingOpponentId(id);
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });
    if (isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`o${id}`, position.x, position.y, true);
        syncOpponentFromAnimation(id, position.x, position.y);
      }
    }
  };

  const handleOpponentDragMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (draggingOpponentId !== id) return;
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });
    if (isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`o${id}`, position.x, position.y, true);
        syncOpponentFromAnimation(id, position.x, position.y);
      }
    }
  };

  const stopOpponentDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const id = draggingOpponentId;
    if (id !== null && isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`o${id}`, position.x, position.y, true);
        syncOpponentFromAnimation(id, position.x, position.y);
      }
    } else if (id !== null) {
      updateOpponentPosition(event, id);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingOpponentId(null);
    setDragPreview(null);
  };

  const clearDragState = () => {
    setDraggingId(null);
    setDraggingOpponentId(null);
    setDraggingTacticalMarkerId(null);
    setDragPreview(null);
    dragStartRef.current = null;
  };

  return {
    draggingId,
    draggingOpponentId,
    draggingTacticalMarkerId,
    dragPreview,
    clearDragState,
    handleDragStart,
    handleDragMove,
    stopDragging,
    handleOpponentDragStart,
    handleOpponentDragMove,
    stopOpponentDragging,
    handleTacticalMarkerPointerDown,
    handleTacticalMarkerPointerMove,
    stopTacticalMarkerDragging,
  };
}
