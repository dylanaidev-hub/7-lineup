import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "react-router-dom";
import type { CanvasTool } from "../CanvasToolSidebar";
import { getPitchSizeFromSearch, type PitchSize } from "../appRouting";
import type { WorkspaceMode } from "../stores/tacticalStore";

type UseLineupUrlSyncOptions = {
  enabled?: boolean;
  pitchSize: PitchSize;
  applyPitchSize: (nextPitchSize: PitchSize, options?: { updateUrl?: boolean }) => void;
  setCurrentMode: Dispatch<SetStateAction<WorkspaceMode>>;
  setActiveTool: Dispatch<SetStateAction<CanvasTool>>;
  setActiveBottomSheetTool: Dispatch<SetStateAction<CanvasTool | null>>;
};

export function useLineupUrlSync({
  enabled = true,
  pitchSize,
  applyPitchSize,
  setCurrentMode,
  setActiveTool,
  setActiveBottomSheetTool,
}: UseLineupUrlSyncOptions) {
  const location = useLocation();
  const lastSyncedSearchRef = useRef<string | null>(null);
  const lastPitchSizeRef = useRef(pitchSize);

  useEffect(() => {
    lastPitchSizeRef.current = pitchSize;
  }, [pitchSize]);

  useEffect(() => {
    if (!enabled) return;

    const routeKey = location.search;
    if (lastSyncedSearchRef.current === routeKey) return;
    lastSyncedSearchRef.current = routeKey;

    const nextPitchSize = getPitchSizeFromSearch(location.search);
    if (nextPitchSize && nextPitchSize !== lastPitchSizeRef.current) {
      applyPitchSize(nextPitchSize, { updateUrl: false });
    }

    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "tactics") {
      setCurrentMode((mode) => (mode === "ANIMATION" ? mode : "ANIMATION"));
      setActiveTool((tool) => (tool === "ANIMATION_TOOL" ? tool : "ANIMATION_TOOL"));
      setActiveBottomSheetTool((tool) => (tool === "ANIMATION_TOOL" ? tool : "ANIMATION_TOOL"));
    }
  }, [
    enabled,
    applyPitchSize,
    location.search,
    setActiveBottomSheetTool,
    setActiveTool,
    setCurrentMode,
  ]);
}
