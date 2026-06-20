import type { Dispatch, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from "react";
import { useState } from "react";
import type { DrawLine } from "../formationData";
import { displayPointToPitch, clientToElementPercent, type PitchOrientation } from "../pitchPointer";

type UseDrawingControlsOptions = {
  drawLayerRef: RefObject<SVGSVGElement | null>;
  isDrawMode: boolean;
  showDrawTools: boolean;
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
};

export function useDrawingControls({
  drawLayerRef,
  isDrawMode,
  showDrawTools,
  setDrawLines,
}: UseDrawingControlsOptions) {
  const [redoDrawLines, setRedoDrawLines] = useState<DrawLine[]>([]);
  const [activeDrawLineId, setActiveDrawLineId] = useState<number | null>(null);

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

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || !showDrawTools) return;
    const position = getDrawPointerPosition(event);
    if (!position?.isInside) return;

    const lineId = Date.now();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDrawLineId(lineId);
    setRedoDrawLines([]);
    setDrawLines((current) => [...current, { id: lineId, points: [{ x: position.x, y: position.y }] }]);
  };

  const continueDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || !showDrawTools || activeDrawLineId === null) return;
    const position = getDrawPointerPosition(event);
    if (!position) return;

    setDrawLines((current) =>
      current.map((line) =>
        line.id === activeDrawLineId
          ? { ...line, points: [...line.points, { x: position.x, y: position.y }] }
          : line,
      ),
    );
  };

  const stopDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActiveDrawLineId(null);
  };

  const undoDrawLine = () => {
    setDrawLines((current) => {
      if (current.length === 0) return current;
      const removedLine = current[current.length - 1];
      setRedoDrawLines((redoCurrent) => [removedLine, ...redoCurrent]);
      return current.slice(0, -1);
    });
  };

  const redoDrawLine = () => {
    setRedoDrawLines((current) => {
      if (current.length === 0) return current;
      const [restoredLine, ...remainingLines] = current;
      setDrawLines((drawCurrent) => [...drawCurrent, restoredLine]);
      return remainingLines;
    });
  };

  const clearDrawLines = () => {
    setDrawLines([]);
    setRedoDrawLines([]);
  };

  return {
    redoDrawLines,
    setRedoDrawLines,
    startDrawing,
    continueDrawing,
    stopDrawing,
    undoDrawLine,
    redoDrawLine,
    clearDrawLines,
  };
}
