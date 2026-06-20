import { RotateCw, X } from "lucide-react";
import styles from "./MobileLandscapePrompt.module.css";

type MobileLandscapePromptProps = {
  title: string;
  description: string;
  openLabel: string;
  dismissLabel: string;
  onOpenLandscapePitch: () => void;
  onDismiss: () => void;
};

export function MobileLandscapePrompt({
  title,
  description,
  openLabel,
  dismissLabel,
  onOpenLandscapePitch,
  onDismiss,
}: MobileLandscapePromptProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="landscape-pitch-title">
      <div className={styles.panel}>
        <button type="button" className={styles.closeButton} onClick={onDismiss} aria-label={dismissLabel} title={dismissLabel}>
          <X size={20} />
        </button>
        <RotateCw className={styles.icon} size={32} aria-hidden="true" />
        <h2 id="landscape-pitch-title">{title}</h2>
        <p>{description}</p>
        <button type="button" className={styles.fullscreenButton} onClick={onOpenLandscapePitch}>
          <RotateCw className={styles.actionIcon} size={20} aria-hidden="true" />
          <span>{openLabel}</span>
        </button>
      </div>
    </div>
  );
}
