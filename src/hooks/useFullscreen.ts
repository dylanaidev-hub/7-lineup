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

const getFullscreenElement = () => {
  const fullscreenDocument = document as WebkitFullscreenDocument;
  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
};

const isTextEntryTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
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

export function useFullscreen(elementRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    unlockLandscapeOrientation();
    setIsFullscreen(false);
  }, [elementRef]);

  const enterPseudoFullscreen = useCallback(async () => {
    const element = elementRef.current;
    if (!element) return;

    element.classList.add(PSEUDO_FULLSCREEN_CLASS);
    document.documentElement.classList.add(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    document.body.classList.add(PSEUDO_FULLSCREEN_ACTIVE_CLASS);
    isPseudoFullscreenRef.current = true;
    shouldLockOrientationRef.current = true;
    setIsFullscreen(true);
    await lockLandscapeOrientation();
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
  }, []);

  const enterNativeFullscreen = useCallback(async (element: WebkitFullscreenElement) => {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else {
      return false;
    }

    if (getFullscreenElement() !== element) return false;

    shouldLockOrientationRef.current = true;
    await lockLandscapeOrientation();
    return true;
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

      const activeFullscreenElement = getFullscreenElement();
      if (activeFullscreenElement) {
        await exitNativeFullscreen();
        return;
      }

      try {
        const enteredNative = await enterNativeFullscreen(element);
        if (!enteredNative) {
          await enterPseudoFullscreen();
        }
      } catch {
        // iOS Safari and restricted browser contexts can expose the API but reject it.
        await enterPseudoFullscreen();
      }
    } finally {
      isTransitioningRef.current = false;
    }
  }, [elementRef, enterNativeFullscreen, enterPseudoFullscreen, exitNativeFullscreen, exitPseudoFullscreen]);

  useEffect(() => {
    const syncFullscreenState = () => {
      const element = elementRef.current;
      const isNativeFullscreen = Boolean(element && getFullscreenElement() === element);
      const isPseudoFullscreen = Boolean(
        element &&
          isPseudoFullscreenRef.current &&
          element.classList.contains(PSEUDO_FULLSCREEN_CLASS),
      );

      if (!isNativeFullscreen && !isPseudoFullscreen && shouldLockOrientationRef.current) {
        shouldLockOrientationRef.current = false;
        unlockLandscapeOrientation();
      }

      setIsFullscreen(isNativeFullscreen || isPseudoFullscreen);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, [elementRef]);

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
      unlockLandscapeOrientation();
    },
    [elementRef],
  );

  return { isFullscreen, toggleFullscreen };
}
