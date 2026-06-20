export type IOSBrowser = "safari" | "chrome" | "edge" | "firefox" | "brave" | "other";

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

export const isIOSInBrowserTab = () => isIOSDevice() && !isStandaloneApp();

export const getIOSBrowser = (): IOSBrowser => {
  const userAgent = navigator.userAgent;
  if (/CriOS/i.test(userAgent)) return "chrome";
  if (/EdgiOS/i.test(userAgent)) return "edge";
  if (/FxiOS/i.test(userAgent)) return "firefox";
  if (/Brave/i.test(userAgent)) return "brave";
  if (/Safari/i.test(userAgent)) return "safari";
  return "other";
};

export const getIOSInstallSteps = (browser: IOSBrowser, language: "vi" | "en") => {
  const copy = {
    vi: {
      chrome: [
        "Bấm nút Chia sẻ (Share) ở thanh dưới Chrome",
        "Chọn \"Thêm vào Màn hình chính\"",
        "Mở app từ icon trên Màn hình chính → fullscreen thật, không còn thanh trình duyệt",
      ],
      edge: [
        "Bấm menu (...) → Chia sẻ",
        "Chọn \"Thêm vào Màn hình chính\"",
        "Mở app từ icon trên Màn hình chính",
      ],
      firefox: [
        "Bấm menu → Chia sẻ trang",
        "Chọn \"Thêm vào Màn hình chính\"",
        "Mở app từ icon trên Màn hình chính",
      ],
      brave: [
        "Bấm menu Brave → Chia sẻ",
        "Chọn \"Thêm vào Màn hình chính\"",
        "Mở app từ icon trên Màn hình chính",
      ],
      safari: [
        "Bấm nút Chia sẻ (Share)",
        "Chọn \"Thêm vào Màn hình chính\"",
        "Mở app từ icon trên Màn hình chính",
      ],
      other: [
        "Mở menu trình duyệt → Chia sẻ",
        "Chọn \"Thêm vào Màn hình chính\"",
        "Mở app từ icon trên Màn hình chính",
      ],
    },
    en: {
      chrome: [
        "Tap Share in Chrome's bottom bar",
        "Choose \"Add to Home Screen\"",
        "Open the app from your home screen for true fullscreen",
      ],
      edge: [
        "Tap menu (...) → Share",
        "Choose \"Add to Home Screen\"",
        "Open the app from your home screen",
      ],
      firefox: [
        "Tap menu → Share page",
        "Choose \"Add to Home Screen\"",
        "Open the app from your home screen",
      ],
      brave: [
        "Tap Brave menu → Share",
        "Choose \"Add to Home Screen\"",
        "Open the app from your home screen",
      ],
      safari: [
        "Tap the Share button",
        "Choose \"Add to Home Screen\"",
        "Open the app from your home screen",
      ],
      other: [
        "Open the browser menu → Share",
        "Choose \"Add to Home Screen\"",
        "Open the app from your home screen",
      ],
    },
  } as const;

  return copy[language][browser];
};
