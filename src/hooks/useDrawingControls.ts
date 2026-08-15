import type { Dispatch, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from "react";
import { useRef, useState } from "react";
import { canAnchorGhost, isRubberBandKind, type DrawKind, type DrawLine, type DrawSide } from "../formationData";
import { displayPointToPitch, clientToElementPercent, type PitchOrientation } from "../pitchPointer";

type AnchorMarker = { id: number; x: number; y: number; onPitch?: boolean };

type UseDrawingControlsOptions = {
  drawLayerRef: RefObject<SVGSVGElement | null>;
  isDrawMode: boolean;
  showDrawTools: boolean;
  drawLines: DrawLine[];
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
  players: AnchorMarker[];
  opponentMarkers: AnchorMarker[];
};

/** How close a drag has to start to a marker to belong to it. */
const ANCHOR_RADIUS = 4;
/** Below this a drag is a tap, not a line. */
const MIN_TRAVEL = 1;

export function useDrawingControls({
  drawLayerRef,
  isDrawMode,
  showDrawTools,
  drawLines,
  setDrawLines,
  players,
  opponentMarkers,
}: UseDrawingControlsOptions) {
  const [redoDrawLines, setRedoDrawLines] = useState<DrawLine[]>([]);
  const [activeDrawLineId, setActiveDrawLineId] = useState<number | null>(null);
  const [activeDrawKind, setActiveDrawKind] = useState<DrawKind>("run");
  /** Marker the next stroke would start from — highlighted so the pick is visible. */
  const [hoveredAnchor, setHoveredAnchor] = useState<string | null>(null);
  const lastLineIdRef = useRef(0);

  const getDrawPointerPosition = (event: ReactPointerEvent<Element>) => {
    const drawLayer = drawLayerRef.current;
    if (!drawLayer) return null;

    const transformed = clientToElementPercent(
      drawLayer,
      event.clientX,
      event.clientY,
      drawLayer.clientWidth,
      drawLayer.clientHeight,
    );
    const rect = drawLayer.getBoundingClientRect();
    const rawX = transformed?.x ?? ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = transformed?.y ?? ((event.clientY - rect.top) / rect.height) * 100;
    const orientation: PitchOrientation = drawLayer.closest<HTMLElement>(".pitch")?.dataset.orientation === "landscape"
      ? "landscape"
      : "portrait";
    const position = displayPointToPitch(rawX, rawY, orientation);

    return {
      isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
      x: position.x,
      y: position.y,
    };
  };

  /**
   * One scan per stroke, feeding both the side (a line drawn off an opponent is
   * theirs, whatever the toggle says) and the ghost anchor.
   */
  const findAnchorMarker = (x: number, y: number) => {
    const candidates = [
      ...players.map((marker) => ({ marker, prefix: "p" })),
      ...opponentMarkers.map((marker) => ({ marker, prefix: "o" })),
    ].filter(({ marker }) => marker.onPitch !== false);

    return candidates
      .map(({ marker, prefix }) => ({ prefix, id: marker.id, distance: Math.hypot(marker.x - x, marker.y - y) }))
      .filter((candidate) => candidate.distance <= ANCHOR_RADIUS)
      .sort((a, b) => a.distance - b.distance)[0];
  };

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || !showDrawTools) return;
    const position = getDrawPointerPosition(event);
    // A press that starts nowhere must also end the last stroke: leaving the id
    // set lets the next drag pour its points into the previous line.
    if (!position?.isInside) {
      setActiveDrawLineId(null);
      return;
    }

    // Two-point kinds are quick, so `Date.now()` alone can hand two strokes the
    // same id — which is also the React key and the undo handle.
    const lineId = Math.max(Date.now(), lastLineIdRef.current + 1);
    lastLineIdRef.current = lineId;
    const anchorMarker = findAnchorMarker(position.x, position.y);
    // Colour is not a choice: a line that starts on an opponent is theirs.
    const side: DrawSide = anchorMarker?.prefix === "o" ? "them" : "us";
    const point = { x: position.x, y: position.y };

    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDrawLineId(lineId);
    setRedoDrawLines([]);
    setDrawLines((current) => [
      ...current,
      {
        id: lineId,
        kind: activeDrawKind,
        side,
        points: isRubberBandKind(activeDrawKind) ? [point, point] : [point],
        ...(anchorMarker && canAnchorGhost(activeDrawKind)
          ? { anchor: `${anchorMarker.prefix}${anchorMarker.id}` }
          : {}),
      },
    ]);
  };

  const continueDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || !showDrawTools) return;
    const position = getDrawPointerPosition(event);
    if (!position) return;

    // Before a stroke this shows which marker it would start from; during one it
    // follows the pointer, so the receiver of a pass or the far end of a link
    // lights up as you reach it.
    const marker = position.isInside ? findAnchorMarker(position.x, position.y) : undefined;
    setHoveredAnchor(marker ? `${marker.prefix}${marker.id}` : null);

    if (activeDrawLineId === null) return;

    setDrawLines((current) =>
      current.map((line) => {
        if (line.id !== activeDrawLineId) return line;
        const point = { x: position.x, y: position.y };
        // Zones and the dribble zig-zag need two corners; every other kind
        // traces the pointer, so a curved run stays curved.
        return {
          ...line,
          points: isRubberBandKind(line.kind) ? [line.points[0], point] : [...line.points, point],
        };
      }),
    );
  };

  const stopDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (activeDrawLineId !== null) {
      setDrawLines((current) => {
        const line = current.find((item) => item.id === activeDrawLineId);
        if (!line) return current;
        const start = line.points[0];
        const end = line.points[line.points.length - 1];
        const travelled = line.points.length >= 2 && Math.hypot(end.x - start.x, end.y - start.y) >= MIN_TRAVEL;
        return travelled ? current : current.filter((item) => item.id !== activeDrawLineId);
      });
    }

    setActiveDrawLineId(null);
    setHoveredAnchor(null);
  };

  const clearDrawHover = () => setHoveredAnchor(null);

  // Both stacks move together, so neither updater may call the other: React
  // double-invokes updaters in development and a nested set runs twice, which
  // used to redo a line onto the board twice (duplicate keys and all).
  const undoDrawLine = () => {
    if (drawLines.length === 0) return;
    const removedLine = drawLines[drawLines.length - 1];
    setDrawLines(drawLines.slice(0, -1));
    setRedoDrawLines((current) => [removedLine, ...current]);
  };

  const redoDrawLine = () => {
    if (redoDrawLines.length === 0) return;
    const [restoredLine, ...remainingLines] = redoDrawLines;
    setDrawLines([...drawLines, restoredLine]);
    setRedoDrawLines(remainingLines);
  };

  const clearDrawLines = () => {
    setDrawLines([]);
    setRedoDrawLines([]);
  };

  return {
    redoDrawLines,
    setRedoDrawLines,
    activeDrawKind,
    setActiveDrawKind,
    hoveredAnchor,
    clearDrawHover,
    startDrawing,
    continueDrawing,
    stopDrawing,
    undoDrawLine,
    redoDrawLine,
    clearDrawLines,
  };
}
