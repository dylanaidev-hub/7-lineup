import { Smartphone, X } from "lucide-react";
import { getIOSBrowser, getIOSInstallSteps } from "./lib/mobilePlatform";
import styles from "./IOSInstallFullscreenHint.module.css";

type IOSInstallFullscreenHintProps = {
  language: "vi" | "en";
  onDismiss: () => void;
};

export function IOSInstallFullscreenHint({ language, onDismiss }: IOSInstallFullscreenHintProps) {
  const browser = getIOSBrowser();
  const steps = getIOSInstallSteps(browser, language);
  const browserLabel = {
    chrome: "Chrome",
    edge: "Edge",
    firefox: "Firefox",
    brave: "Brave",
    safari: "Safari",
    other: language === "vi" ? "trình duyệt" : "browser",
  }[browser];

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <div className={styles.content}>
        <Smartphone className={styles.icon} size={18} aria-hidden="true" />
        <div className={styles.text}>
          <strong>
            {language === "vi"
              ? `iPhone + ${browserLabel}: cài app để fullscreen như YouTube`
              : `iPhone + ${browserLabel}: install the app for YouTube-style fullscreen`}
          </strong>
          <p>
            {language === "vi"
              ? "Apple không cho web ẩn thanh địa chỉ trong tab trình duyệt. Cài 1 lần, mở từ Màn hình chính:"
              : "Apple does not allow hiding the address bar inside a browser tab. Install once, then open from your home screen:"}
          </p>
          <ol>
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <button type="button" className={styles.close} onClick={onDismiss} aria-label={language === "vi" ? "Đóng" : "Dismiss"}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
