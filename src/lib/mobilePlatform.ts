export const isIOSDevice = () => {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

export const isStandaloneApp = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
};

export const isMobileBrowserTab = () => {
  if (typeof window === "undefined") return false;
  const hasTouchInput = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const shortestSide = Math.min(window.screen.width, window.screen.height);
  return hasTouchInput && shortestSide <= 1024 && !isStandaloneApp();
};

/** Physical device orientation — ignores visualViewport shrink from pull-down gestures. */
export const isDeviceLandscape = () => {
  if (typeof window === "undefined") return false;

  const legacyOrientation = (window as Window & { orientation?: number }).orientation;
  if (typeof legacyOrientation === "number") return Math.abs(legacyOrientation) === 90;

  const screenType = window.screen.orientation?.type;
  if (screenType) return screenType.startsWith("landscape");

  return window.matchMedia("(orientation: landscape)").matches;
};

export const isPortableTouchDevice = () => {
  if (typeof window === "undefined") return false;
  const hasTouchInput = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const shortestSide = Math.min(window.screen.width, window.screen.height);
  return isIOSDevice() || /Android/i.test(navigator.userAgent) || (hasTouchInput && shortestSide <= 1024);
};

export const supportsDomFullscreen = (element?: HTMLElement | null) => {
  const sample = (element ?? document.documentElement) as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  return typeof sample.requestFullscreen === "function"
    || typeof sample.webkitRequestFullscreen === "function";
};

/**
 * iOS Safari always allows swipe-down to dismiss native element fullscreen.
 * Use CSS pseudo fullscreen instead so the app controls exit (button only).
 */
export const mustUsePseudoFullscreen = () => isIOSDevice() && isMobileBrowserTab();
