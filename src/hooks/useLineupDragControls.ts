import type { Dispatch, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from "react";
import { useEffect, useState } from "react";
import type { PitchSize } from "../appRouting";
import { getZoneName, type FormationPlayer, type OpponentMarker } from "../formationData";
import type { TacticalMarker } from "../tacticalData";
import { clampPitchCoordinate, getBoundedPitchPosition, getPitchClientPosition, isPointerOverMobileBottomSheet } from "../pitchPointer";
import { useMarkerDragSession } from "./useMarkerDragSession";

export type LineupDragPreviewState = {
  type: "player" | "opponent" | "ball";
  id: number | string;
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
  const [draggingTacticalMarkerId, setDraggingTacticalMarkerId] = useState<string | null>(null);
  const [tacticalDragPreview, setTacticalDragPreview] = useState<LineupDragPreviewState | null>(null);

  const getPitchPointerPosition = (event: ReactPointerEvent<Element>, options: { clamp?: boolean } = {}) => {
    return getPitchClientPosition(pitchRef, event.clientX, event.clientY, options);
  };

  const isOutsidePitchDropTarget = (clientX: number, clientY: number, isInside: boolean | undefined) =>
    isPointerOverMobileBottomSheet(clientX, clientY) || !isInside;

  const updatePlayerPosition = (event: ReactPointerEvent<Element>, id: number, isDrop = false) => {
    const position = getPitchPointerPosition(event, { clamp: false });
    const overBottomSheet = isPointerOverMobileBottomSheet(event.clientX, event.clientY);
    if (!position && !overBottomSheet) return;

    const outsidePitch = isOutsidePitchDropTarget(event.clientX, event.clientY, position?.isInside);

    setPlayers((current) => {
      const nextPlayers = current.map((player) => {
        if (player.id !== id) return player;

        if (!outsidePitch && position?.isInside) {
          return {
            ...player,
            position: getZoneName(pitchSize, clampPitchCoordinate(position.x), clampPitchCoordinate(position.y)),
            x: clampPitchCoordinate(position.x),
            y: clampPitchCoordinate(position.y),
            onPitch: true,
          };
        }

        if (isDrop && outsidePitch) {
          return { ...player, onPitch: false };
        }

        if (!isDrop && outsidePitch && position) {
          return {
            ...player,
            x: position.x,
            y: position.y,
            onPitch: true,
          };
        }

        return player;
      });

      if (pitchSize === "custom") {
        setCustomCount(nextPlayers.filter((player) => player.onPitch).length);
      }

      return nextPlayers;
    });
  };

  const updateOpponentPosition = (event: ReactPointerEvent<Element>, id: number, isDrop = false) => {
    const position = getPitchPointerPosition(event, { clamp: false });
    const overBottomSheet = isPointerOverMobileBottomSheet(event.clientX, event.clientY);
    if (!position && !overBottomSheet) return;

    const outsidePitch = isOutsidePitchDropTarget(event.clientX, event.clientY, position?.isInside);

    setOpponentMarkers((current) =>
      current.map((marker) => {
        if (marker.id !== id) return marker;

        if (!outsidePitch && position?.isInside) {
          return {
            ...marker,
            onPitch: true,
            x: clampPitchCoordinate(position.x),
            y: clampPitchCoordinate(position.y),
          };
        }

        if (isDrop && outsidePitch) {
          return { ...marker, onPitch: false };
        }

        if (!isDrop && outsidePitch && position) {
          return {
            ...marker,
            onPitch: true,
            x: position.x,
            y: position.y,
          };
        }

        return marker;
      }),
    );
  };

  const updateAnimatedPlayer = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    const position = getPitchPointerPosition(event, { clamp: true });
    if (!position) return;
    updateTacticalMarker(`p${id}`, position.x, position.y, true);
  };

  const updateAnimatedOpponent = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    const position = getPitchPointerPosition(event, { clamp: true });
    if (!position) return;
    updateTacticalMarker(`o${id}`, position.x, position.y, true);
  };

  const playerDrag = useMarkerDragSession<number>({
    canStart: () => !isDrawMode && !(isAnimationTool && isPlaying),
    showPreview: false,
    onMove: (event, id) => (isAnimationTool ? updateAnimatedPlayer(event, id) : updatePlayerPosition(event, id, false)),
    onDrop: (event, id) => (isAnimationTool ? updateAnimatedPlayer(event, id) : updatePlayerPosition(event, id, true)),
  });

  const opponentDrag = useMarkerDragSession<number>({
    canStart: () => !isDrawMode && !(isAnimationTool && isPlaying),
    showPreview: false,
    onMove: (event, id) => (isAnimationTool ? updateAnimatedOpponent(event, id) : updateOpponentPosition(event, id, false)),
    onDrop: (event, id) => (isAnimationTool ? updateAnimatedOpponent(event, id) : updateOpponentPosition(event, id, true)),
  });

  const updateBallMarkerFromPoint = (clientX: number, clientY: number, commitDrop = false) => {
    const marker = ballMarker ?? { id: "ball", label: "", type: "ball" as const, x: 50, y: 56, onPitch: false };
    const position = getPitchClientPosition(pitchRef, clientX, clientY, { clamp: false });
    const overBottomSheet = isPointerOverMobileBottomSheet(clientX, clientY);
    if (!position && !overBottomSheet) return;

    const outsidePitch = isOutsidePitchDropTarget(clientX, clientY, position?.isInside);

    if (!outsidePitch && position?.isInside) {
      const boundedPosition = getBoundedPitchPosition(position);
      updateTacticalMarker(marker.id, boundedPosition.x, boundedPosition.y, true);
      return;
    }

    if (commitDrop && outsidePitch) {
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
      setTacticalDragPreview(null);
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
    setTacticalDragPreview(null);
  };

  const clearDragState = () => {
    playerDrag.clear();
    opponentDrag.clear();
    setDraggingTacticalMarkerId(null);
    setTacticalDragPreview(null);
  };

  const dragPreview: LineupDragPreviewState | null = playerDrag.preview
    ? { type: "player", ...playerDrag.preview }
    : opponentDrag.preview
      ? { type: "opponent", ...opponentDrag.preview }
      : tacticalDragPreview;

  return {
    draggingId: playerDrag.activeId,
    draggingOpponentId: opponentDrag.activeId,
    draggingTacticalMarkerId,
    dragPreview,
    clearDragState,
    handleDragStart: playerDrag.onPointerDown,
    handleDragMove: playerDrag.onPointerMove,
    stopDragging: playerDrag.onPointerEnd,
    handleOpponentDragStart: opponentDrag.onPointerDown,
    handleOpponentDragMove: opponentDrag.onPointerMove,
    stopOpponentDragging: opponentDrag.onPointerEnd,
    handleTacticalMarkerPointerDown,
    handleTacticalMarkerPointerMove,
    stopTacticalMarkerDragging,
  };
}
