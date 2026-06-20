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

export const supportsDomFullscreen = (element?: HTMLElement | null) => {
  const sample = (element ?? document.documentElement) as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  return typeof sample.requestFullscreen === "function"
    || typeof sample.webkitRequestFullscreen === "function";
};
