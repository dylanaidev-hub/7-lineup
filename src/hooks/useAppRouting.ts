import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "react-router-dom";
import type { CanvasTool } from "../CanvasToolSidebar";
import { getInitialAppTab, getPitchSizeFromUrl, writeAppRoute, type AppTab, type PitchSize } from "../appRouting";

type WorkspaceMode = "LINEUP" | "CUSTOM" | "ANIMATION";

type UseAppRoutingOptions = {
  pitchSize: PitchSize;
  applyPitchSize: (nextPitchSize: PitchSize, options?: { updateUrl?: boolean }) => void;
  setActiveTab: Dispatch<SetStateAction<AppTab>>;
  setCurrentMode: Dispatch<SetStateAction<WorkspaceMode>>;
  setActiveTool: Dispatch<SetStateAction<CanvasTool>>;
  setActiveBottomSheetTool: Dispatch<SetStateAction<CanvasTool | null>>;
  setIsLineupMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsUserMenuOpen: Dispatch<SetStateAction<boolean>>;
};

export function useAppRouting({
  pitchSize,
  applyPitchSize,
  setActiveTab,
  setCurrentMode,
  setActiveTool,
  setActiveBottomSheetTool,
  setIsLineupMenuOpen,
  setIsUserMenuOpen,
}: UseAppRoutingOptions) {
  const location = useLocation();
  const lastSyncedRouteRef = useRef<string | null>(null);
  const closeMenus = useCallback(() => {
    setIsLineupMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [setIsLineupMenuOpen, setIsUserMenuOpen]);

  const syncAppRouteFromUrl = useCallback(() => {
    const routeKey = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const didRouteChange = lastSyncedRouteRef.current !== routeKey;
    lastSyncedRouteRef.current = routeKey;

    const nextTab = getInitialAppTab();
    const nextPitchSize = getPitchSizeFromUrl();
    setActiveTab(nextTab);

    if (nextTab === "lineup" && nextPitchSize && nextPitchSize !== pitchSize) {
      applyPitchSize(nextPitchSize, { updateUrl: false });
    }

    const params = new URLSearchParams(window.location.search);
    if (nextTab === "lineup" && params.get("tab") === "tactics") {
      setCurrentMode("ANIMATION");
      setActiveTool("ANIMATION_TOOL");
      setActiveBottomSheetTool("ANIMATION_TOOL");
    }

    if (didRouteChange) {
      closeMenus();
    }
  }, [
    applyPitchSize,
    closeMenus,
    pitchSize,
    setActiveBottomSheetTool,
    setActiveTab,
    setActiveTool,
    setCurrentMode,
  ]);

  useEffect(() => {
    window.addEventListener("popstate", syncAppRouteFromUrl);
    return () => window.removeEventListener("popstate", syncAppRouteFromUrl);
  }, [syncAppRouteFromUrl]);

  useEffect(() => {
    syncAppRouteFromUrl();
  }, [location.hash, location.pathname, location.search, syncAppRouteFromUrl]);

  const switchAppTab = useCallback(
    (nextTab: AppTab, options: { updateUrl?: boolean } = {}) => {
      setActiveTab(nextTab);
      closeMenus();

      if (options.updateUrl !== false) {
        writeAppRoute(nextTab, pitchSize);
      }
    },
    [closeMenus, pitchSize, setActiveTab],
  );

  return { switchAppTab };
}
