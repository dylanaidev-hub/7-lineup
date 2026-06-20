import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { isMobileBrowserTab, supportsDomFullscreen } from "../lib/mobilePlatform";

const PSEUDO_FULLSCREEN_CLASS = "app-pseudo-fullscreen";
const PSEUDO_FULLSCREEN_ACTIVE_CLASS = "app-pseudo-fullscreen-active";
const NATIVE_FULLSCREEN_ACTIVE_CLASS = "app-native-fullscreen-active";
const MOBILE_IMMERSIVE_CLASS = "ios-immersive-fullscreen-active";

type WebkitFullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: unknown) => Promise<void> | void;
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

const isPortableTouchDevice = () => {
  if (typeof window === "undefined") return false;
  const userAgent = navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroidDevice = /Android/i.test(userAgent);
  const hasTouchInput = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  return isIOSDevice || isAndroidDevice || hasTouchInput;
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
  root.style.setProperty("--app-lvh", `${window.innerHeight}px`);
};

const clearVisualViewportVars = () => {
  const root = document.documentElement;
  root.style.removeProperty("--app-vvw");
  root.style.removeProperty("--app-vvh");
  root.style.removeProperty("--app-vv-offset-top");
  root.style.removeProperty("--app-lvh");
};

const applyMobileImmersiveClasses = (active: boolean) => {
  document.documentElement.classList.toggle(MOBILE_IMMERSIVE_CLASS, active);
  document.body.classList.toggle(MOBILE_IMMERSIVE_CLASS, active);
};

const nudgeBrowserChrome = () => {
  const run = () => {
    window.scrollTo(0, 1);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  };

  run();
  window.setTimeout(run, 80);
  window.setTimeout(run, 220);
  window.setTimeout(run, 420);
};

const lockLandscapeOrientation = async () => {
  try {
    const orientation = window.screen.orientation as ScreenOrientationWithLock | undefined;
    await orientation?.lock?.("landscape");
  } catch {
    // Orientation lock requires native fullscreen on many browsers.
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
    || activeElement === document.getElementById("root")
    || workspace.contains(activeElement);
};

const getNativeFullscreenTargets = (workspace: HTMLElement) => {
  const root = document.getElementById("root");
  if (isPortableTouchDevice()) {
    return [document.documentElement, root, workspace, document.body].filter(Boolean) as WebkitFullscreenElement[];
  }
  return [workspace, document.documentElement, root, document.body].filter(Boolean) as WebkitFullscreenElement[];
};

const isViewportLandscape = () => {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  if (Math.abs(viewportWidth - viewportHeight) > 1) return viewportWidth > viewportHeight;

  const legacyOrientation = (window as Window & { orientation?: number }).orientation;
  if (typeof legacyOrientation === "number") return Math.abs(legacyOrientation) === 90;

  return window.screen.orientation?.type.startsWith("landscape")
    ?? window.matchMedia("(orientation: landscape)").matches;
};

/** Must be invoked synchronously inside a user gesture (click/touch). */
const requestNativeFullscreenSync = (workspace: HTMLElement) => {
  const options: FullscreenOptionsWithNavigation = { navigationUI: "hide" };

  for (const target of getNativeFullscreenTargets(workspace)) {
    try {
      if (typeof target.requestFullscreen === "function") {
        void target.requestFullscreen(options);
        return target;
      }
      if (typeof target.webkitRequestFullscreen === "function") {
        void target.webkitRequestFullscreen();
        return target;
      }
    } catch {
      continue;
    }
  }

  return null;
};

export function useFullscreen(elementRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const isPseudoFullscreenRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const shouldLockOrientationRef = useRef(false);
  const pendingNativeTargetRef = useRef<WebkitFullscreenElement | null>(null);
  const nativeFallbackTimerRef = useRef<number | null>(null);

  const clearNativeFallbackTimer = useCallback(() => {
    if (nativeFallbackTimerRef.current !== null) {
      window.clearTimeout(nativeFallbackTimerRef.current);
      nativeFallbackTimerRef.current = null;
    }
  }, []);

  const applyNativeFullscreenClasses = useCallback((active: boolean) => {
    document.documentElement.classList.toggle(NATIVE_FULLSCREEN_ACTIVE_CLASS, active);
    document.body.classList.toggle(NATIVE_FULLSCREEN_ACTIVE_CLASS, active);
  }, []);

  const exitPseudoFullscreen = useCallback(() => {
    const element = elementRef.current;
    element?.classList.remove(PSEUDO_FULLSCREEN_CLASS);
    document.documentElement.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    document.body.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    applyMobileImmersiveClasses(false);
    isPseudoFullscreenRef.current = false;
    shouldLockOrientationRef.current = false;
    clearVisualViewportVars();
    unlockLandscapeOrientation();
    setIsPseudoFullscreen(false);
    setIsNativeFullscreen(false);
    setIsFullscreen(false);
  }, [elementRef]);

  const enterPseudoFullscreen = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    syncVisualViewportVars();
    nudgeBrowserChrome();
    element.classList.add(PSEUDO_FULLSCREEN_CLASS);
    document.documentElement.classList.add(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    document.body.classList.add(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    if (isMobileBrowserTab()) {
      applyMobileImmersiveClasses(true);
    }
    isPseudoFullscreenRef.current = true;
    shouldLockOrientationRef.current = true;
    setIsPseudoFullscreen(true);
    setIsNativeFullscreen(false);
    setIsFullscreen(true);
    void lockLandscapeOrientation();
    window.setTimeout(syncVisualViewportVars, 120);
    window.setTimeout(nudgeBrowserChrome, 180);
    window.setTimeout(syncVisualViewportVars, 420);
  }, [elementRef]);

  const exitNativeFullscreen = useCallback(async () => {
    const fullscreenDocument = document as WebkitFullscreenDocument;

    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (fullscreenDocument.webkitExitFullscreen) {
      await fullscreenDocument.webkitExitFullscreen();
    }

    applyNativeFullscreenClasses(false);
    applyMobileImmersiveClasses(false);
    unlockLandscapeOrientation();
    shouldLockOrientationRef.current = false;
    clearVisualViewportVars();
    pendingNativeTargetRef.current = null;
    setIsPseudoFullscreen(false);
    setIsNativeFullscreen(false);
    setIsFullscreen(false);
  }, [applyNativeFullscreenClasses]);

  const handleNativeFullscreenEntered = useCallback((workspace: HTMLElement) => {
    applyNativeFullscreenClasses(true);
    applyMobileImmersiveClasses(false);
    syncVisualViewportVars();
    shouldLockOrientationRef.current = true;
    isPseudoFullscreenRef.current = false;
    workspace.classList.remove(PSEUDO_FULLSCREEN_CLASS);
    document.documentElement.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    document.body.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    setIsPseudoFullscreen(false);
    setIsNativeFullscreen(true);
    setIsFullscreen(true);
    void lockLandscapeOrientation();
  }, [applyNativeFullscreenClasses]);

  const enterFullscreenFromGesture = useCallback(() => {
    const element = elementRef.current;
    if (!element || isTransitioningRef.current) return;

    if (isPseudoFullscreenRef.current || element.classList.contains(PSEUDO_FULLSCREEN_CLASS)) {
      exitPseudoFullscreen();
      return;
    }

    if (getFullscreenElement() && belongsToWorkspace(getFullscreenElement(), element)) {
      void exitNativeFullscreen();
      return;
    }

    isTransitioningRef.current = true;
    clearNativeFallbackTimer();

    if (!supportsDomFullscreen(element)) {
      enterPseudoFullscreen();
      isTransitioningRef.current = false;
      return;
    }

    const requestedTarget = requestNativeFullscreenSync(element);
    pendingNativeTargetRef.current = requestedTarget;

    if (!requestedTarget) {
      enterPseudoFullscreen();
      isTransitioningRef.current = false;
      return;
    }

    setIsFullscreen(true);
    nativeFallbackTimerRef.current = window.setTimeout(() => {
      nativeFallbackTimerRef.current = null;
      if (getFullscreenElement() && belongsToWorkspace(getFullscreenElement(), element)) {
        isTransitioningRef.current = false;
        pendingNativeTargetRef.current = null;
        return;
      }
      enterPseudoFullscreen();
      isTransitioningRef.current = false;
      pendingNativeTargetRef.current = null;
    }, 280);
  }, [
    clearNativeFallbackTimer,
    elementRef,
    enterPseudoFullscreen,
    exitNativeFullscreen,
    exitPseudoFullscreen,
  ]);

  const toggleFullscreen = useCallback(() => {
    enterFullscreenFromGesture();
  }, [enterFullscreenFromGesture]);

  const exitFullscreen = useCallback(() => {
    const element = elementRef.current;
    clearNativeFallbackTimer();

    if (isPseudoFullscreenRef.current || element?.classList.contains(PSEUDO_FULLSCREEN_CLASS)) {
      exitPseudoFullscreen();
      return;
    }

    if (getFullscreenElement() && belongsToWorkspace(getFullscreenElement(), element)) {
      void exitNativeFullscreen();
      return;
    }

    exitPseudoFullscreen();
  }, [clearNativeFallbackTimer, elementRef, exitNativeFullscreen, exitPseudoFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    let wasLandscape = isViewportLandscape();

    const exitIfRotatedToPortrait = () => {
      const isLandscape = isViewportLandscape();
      if (wasLandscape && !isLandscape) {
        exitFullscreen();
        return;
      }
      wasLandscape = isLandscape;
    };

    const handleOrientationChange = () => {
      window.requestAnimationFrame(exitIfRotatedToPortrait);
      window.setTimeout(exitIfRotatedToPortrait, 120);
      window.setTimeout(exitIfRotatedToPortrait, 320);
    };

    const portraitQuery = window.matchMedia("(orientation: portrait)");
    portraitQuery.addEventListener("change", handleOrientationChange);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.screen.orientation?.addEventListener("change", handleOrientationChange);

    return () => {
      portraitQuery.removeEventListener("change", handleOrientationChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.screen.orientation?.removeEventListener("change", handleOrientationChange);
    };
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => {
    const syncFullscreenState = () => {
      const element = elementRef.current;
      const activeElement = getFullscreenElement();
      const isNativeActive = belongsToWorkspace(activeElement, element);
      const isPseudoActive = Boolean(
        element &&
          isPseudoFullscreenRef.current &&
          element.classList.contains(PSEUDO_FULLSCREEN_CLASS),
      );

      if (isNativeActive && element) {
        clearNativeFallbackTimer();
        handleNativeFullscreenEntered(element);
        isTransitioningRef.current = false;
        pendingNativeTargetRef.current = null;
        return;
      }

      if (!isNativeActive && !isPseudoActive) {
        applyNativeFullscreenClasses(false);
        applyMobileImmersiveClasses(false);
        if (shouldLockOrientationRef.current) {
          shouldLockOrientationRef.current = false;
          unlockLandscapeOrientation();
          clearVisualViewportVars();
        }
        setIsNativeFullscreen(false);
        setIsPseudoFullscreen(false);
        setIsFullscreen(false);
        isTransitioningRef.current = false;
        pendingNativeTargetRef.current = null;
        return;
      }

      setIsNativeFullscreen(isNativeActive);
      setIsPseudoFullscreen(isPseudoActive);
      setIsFullscreen(isNativeActive || isPseudoActive);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, [applyNativeFullscreenClasses, clearNativeFallbackTimer, elementRef, handleNativeFullscreenEntered]);

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
    if (!isFullscreen) return;

    const blockRubberBandScroll = (event: TouchEvent) => {
      if (event.touches.length > 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest(".pitch, input, textarea, select, button, [contenteditable='true']")) {
        return;
      }
      event.preventDefault();
    };

    document.addEventListener("touchmove", blockRubberBandScroll, { passive: false });
    return () => document.removeEventListener("touchmove", blockRubberBandScroll);
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target) || event.repeat) return;

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        enterFullscreenFromGesture();
        return;
      }

      if (event.key === "Escape" && isPseudoFullscreenRef.current) {
        exitPseudoFullscreen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enterFullscreenFromGesture, exitPseudoFullscreen]);

  useEffect(
    () => () => {
      const element = elementRef.current;
      element?.classList.remove(PSEUDO_FULLSCREEN_CLASS);
      document.documentElement.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
      document.body.classList.remove(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
      applyNativeFullscreenClasses(false);
      applyMobileImmersiveClasses(false);
      clearNativeFallbackTimer();
      isPseudoFullscreenRef.current = false;
      shouldLockOrientationRef.current = false;
      pendingNativeTargetRef.current = null;
      clearVisualViewportVars();
      unlockLandscapeOrientation();
    },
    [applyNativeFullscreenClasses, clearNativeFallbackTimer, elementRef],
  );

  return {
    isFullscreen,
    isPseudoFullscreen,
    isNativeFullscreen,
    enterFullscreenFromGesture,
    toggleFullscreen,
  };
}
