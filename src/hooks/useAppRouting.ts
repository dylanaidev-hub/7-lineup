import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { CanvasTool } from "../CanvasToolSidebar";
import { getAppRouteUrl, getPitchSizeFromSearch, type AppTab, type PitchSize } from "../appRouting";

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
  const navigate = useNavigate();
  const lastSyncedRouteRef = useRef<string | null>(null);
  const closeMenus = useCallback(() => {
    setIsLineupMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [setIsLineupMenuOpen, setIsUserMenuOpen]);

  const getAppTabFromRouter = useCallback((): AppTab => {
    const path = location.pathname;
    if (path.endsWith("/profile")) return "profile";
    if (path.endsWith("/locker")) return "locker";
    if (path.startsWith("/app/join-team")) return "join-team";
    if (/^\/app\/teams\/[^/]+/.test(path)) return "team-detail";
    if (path === "/app/teams") return "teams";

    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "profile") return "profile";
    if (params.get("tab") === "locker") return "locker";
    return "lineup";
  }, [location.pathname, location.search]);

  const syncAppRouteFromUrl = useCallback(() => {
    const routeKey = `${location.pathname}${location.search}${location.hash}`;
    const didRouteChange = lastSyncedRouteRef.current !== routeKey;
    lastSyncedRouteRef.current = routeKey;

    const nextTab = getAppTabFromRouter();
    const nextPitchSize = getPitchSizeFromSearch(location.search);
    setActiveTab(nextTab);

    if (nextTab === "lineup" && nextPitchSize && nextPitchSize !== pitchSize) {
      applyPitchSize(nextPitchSize, { updateUrl: false });
    }

    const params = new URLSearchParams(location.search);
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
    getAppTabFromRouter,
    location.hash,
    location.pathname,
    location.search,
    pitchSize,
    setActiveBottomSheetTool,
    setActiveTab,
    setActiveTool,
    setCurrentMode,
  ]);

  useEffect(() => {
    syncAppRouteFromUrl();
  }, [location.hash, location.pathname, location.search, syncAppRouteFromUrl]);

  const switchAppTab = useCallback(
    (nextTab: AppTab, options: { updateUrl?: boolean } = {}) => {
      setActiveTab(nextTab);
      closeMenus();

      if (options.updateUrl !== false) {
        const nextUrl = getAppRouteUrl(nextTab, pitchSize);
        navigate(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      }
    },
    [closeMenus, navigate, pitchSize, setActiveTab],
  );

  return { switchAppTab };
}
