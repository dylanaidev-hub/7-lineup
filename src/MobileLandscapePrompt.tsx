import { RotateCw, X } from "lucide-react";
import styles from "./MobileLandscapePrompt.module.css";

type MobileLandscapePromptProps = {
  title: string;
  description: string;
  openLabel: string;
  dismissLabel: string;
  onOpenFullscreen: () => void;
  onDismiss: () => void;
};

export function MobileLandscapePrompt({
  title,
  description,
  openLabel,
  dismissLabel,
  onOpenFullscreen,
  onDismiss,
}: MobileLandscapePromptProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="landscape-lineup-title">
      <div className={styles.panel}>
        <button type="button" className={styles.closeButton} onClick={onDismiss} aria-label={dismissLabel} title={dismissLabel}>
          <X size={20} />
        </button>
        <RotateCw className={styles.icon} size={32} aria-hidden="true" />
        <h2 id="landscape-lineup-title">{title}</h2>
        <p>{description}</p>
        <button type="button" className={styles.fullscreenButton} onClick={onOpenFullscreen}>
          <RotateCw size={20} />
          <span>{openLabel}</span>
        </button>
      </div>
    </div>
  );
}
