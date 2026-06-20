import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const PSEUDO_FULLSCREEN_CLASS = "app-pseudo-fullscreen";
const PSEUDO_FULLSCREEN_ACTIVE_CLASS = "app-pseudo-fullscreen-active";

type WebkitFullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: "landscape" | "portrait") => Promise<void>;
  unlock?: () => void;
};

type FullscreenOptionsWithNavigation = FullscreenOptions & {
  navigationUI?: "auto" | "hide" | "show";
};

const getFullscreenElement = () => {
  const fullscreenDocument = document as WebkitFullscreenDocument;
  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
};

const isTextEntryTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
};

const isIOSDevice = () => {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

const syncVisualViewportVars = () => {
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const offsetTop = viewport?.offsetTop ?? 0;
  const root = document.documentElement;

  root.style.setProperty("--app-vvw", `${width}px`);
  root.style.setProperty("--app-vvh", `${height}px`);
  root.style.setProperty("--app-vv-offset-top", `${offsetTop}px`);
};

const clearVisualViewportVars = () => {
  const root = document.documentElement;
  root.style.removeProperty("--app-vvw");
  root.style.removeProperty("--app-vvh");
  root.style.removeProperty("--app-vv-offset-top");
};

const minimizeMobileBrowserChrome = () => {
  window.scrollTo(0, 1);
  window.requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
};

const lockLandscapeOrientation = async () => {
  try {
    const orientation = window.screen.orientation as ScreenOrientationWithLock | undefined;
    await orientation?.lock?.("landscape");
  } catch {
    // iOS Safari and some desktop browsers reject orientation lock.
  }
};

const unlockLandscapeOrientation = () => {
  try {
    const orientation = window.screen.orientation as ScreenOrientationWithLock | undefined;
    orientation?.unlock?.();
  } catch {
    // Ignore unlock failures on browsers without Screen Orientation API.
  }
};

const belongsToWorkspace = (activeElement: Element | null, workspace: HTMLElement | null) => {
  if (!activeElement || !workspace) return false;
  return activeElement === workspace
    || activeElement === document.documentElement
    || activeElement === document.body
    || workspace.contains(activeElement);
};

const requestFullscreenOn = async (target: WebkitFullscreenElement) => {
  const options: FullscreenOptionsWithNavigation = { navigationUI: "hide" };

  if (target.requestFullscreen) {
    await target.requestFullscreen(options);
    return;
  }

  if (target.webkitRequestFullscreen) {
    await target.webkitRequestFullscreen();
  }
};

export function useFullscreen(elementRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const isPseudoFullscreenRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const shouldLockOrientationRef = useRef(false);

  const exitPseudoFullscreen = useCallback(() => {
    const element = elementRef.current;
    element?.classList.remove(PSEUDO_FULLSCREEN_CLASS);
    document.documentElement.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    document.body.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    isPseudoFullscreenRef.current = false;
    shouldLockOrientationRef.current = false;
    clearVisualViewportVars();
    unlockLandscapeOrientation();
    setIsPseudoFullscreen(false);
    setIsFullscreen(false);
  }, [elementRef]);

  const enterPseudoFullscreen = useCallback(async () => {
    const element = elementRef.current;
    if (!element) return;

    syncVisualViewportVars();
    minimizeMobileBrowserChrome();
    element.classList.add(PSEUDO_FULLSCREEN_CLASS);
    document.documentElement.classList.add(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    document.body.classList.add(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    isPseudoFullscreenRef.current = true;
    shouldLockOrientationRef.current = true;
    setIsPseudoFullscreen(true);
    setIsFullscreen(true);
    await lockLandscapeOrientation();
    syncVisualViewportVars();
    minimizeMobileBrowserChrome();
  }, [elementRef]);

  const exitNativeFullscreen = useCallback(async () => {
    const fullscreenDocument = document as WebkitFullscreenDocument;

    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (fullscreenDocument.webkitExitFullscreen) {
      await fullscreenDocument.webkitExitFullscreen();
    }

    unlockLandscapeOrientation();
    shouldLockOrientationRef.current = false;
    clearVisualViewportVars();
    setIsPseudoFullscreen(false);
  }, []);

  const enterNativeFullscreen = useCallback(async (workspace: WebkitFullscreenElement) => {
    const candidates = [workspace, document.documentElement, document.body] as WebkitFullscreenElement[];

    for (const target of candidates) {
      try {
        await requestFullscreenOn(target);
      } catch {
        continue;
      }

      if (!belongsToWorkspace(getFullscreenElement(), workspace)) continue;

      syncVisualViewportVars();
      shouldLockOrientationRef.current = true;
      await lockLandscapeOrientation();
      setIsPseudoFullscreen(false);
      return true;
    }

    return false;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const element = elementRef.current as WebkitFullscreenElement | null;
    if (!element || isTransitioningRef.current) return;

    isTransitioningRef.current = true;

    try {
      if (isPseudoFullscreenRef.current || element.classList.contains(PSEUDO_FULLSCREEN_CLASS)) {
        exitPseudoFullscreen();
        return;
      }

      if (getFullscreenElement() && belongsToWorkspace(getFullscreenElement(), element)) {
        await exitNativeFullscreen();
        return;
      }

      if (isIOSDevice()) {
        await enterPseudoFullscreen();
        return;
      }

      try {
        const enteredNative = await enterNativeFullscreen(element);
        if (!enteredNative) {
          await enterPseudoFullscreen();
        }
      } catch {
        await enterPseudoFullscreen();
      }
    } finally {
      isTransitioningRef.current = false;
    }
  }, [elementRef, enterNativeFullscreen, enterPseudoFullscreen, exitNativeFullscreen, exitPseudoFullscreen]);

  useEffect(() => {
    const syncFullscreenState = () => {
      const element = elementRef.current;
      const activeElement = getFullscreenElement();
      const isNativeFullscreen = belongsToWorkspace(activeElement, element);
      const isPseudoFullscreenActive = Boolean(
        element &&
          isPseudoFullscreenRef.current &&
          element.classList.contains(PSEUDO_FULLSCREEN_CLASS),
      );

      if (!isNativeFullscreen && !isPseudoFullscreenActive && shouldLockOrientationRef.current) {
        shouldLockOrientationRef.current = false;
        unlockLandscapeOrientation();
        clearVisualViewportVars();
      }

      if (isNativeFullscreen) {
        syncVisualViewportVars();
      }

      setIsPseudoFullscreen(isPseudoFullscreenActive);
      setIsFullscreen(isNativeFullscreen || isPseudoFullscreenActive);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, [elementRef]);

  useEffect(() => {
    if (!isFullscreen) return;

    const syncViewport = () => {
      syncVisualViewportVars();
    };

    syncViewport();
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target) || event.repeat) return;

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }

      if (event.key === "Escape" && isPseudoFullscreenRef.current) {
        exitPseudoFullscreen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [exitPseudoFullscreen, toggleFullscreen]);

  useEffect(
    () => () => {
      const element = elementRef.current;
      element?.classList.remove(PSEUDO_FULLSCREEN_CLASS);
      document.documentElement.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
      document.body.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
      isPseudoFullscreenRef.current = false;
      shouldLockOrientationRef.current = false;
      clearVisualViewportVars();
      unlockLandscapeOrientation();
    },
    [elementRef],
  );

  return { isFullscreen, isPseudoFullscreen, toggleFullscreen };
}
