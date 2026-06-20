import { RotateCw, X } from "lucide-react";
import styles from "./MobileLandscapePrompt.module.css";

type MobileLandscapePromptProps = {
  title: string;
  description: string;
  openLabel: string;
  dismissLabel: string;
  onRotatePitch: () => void;
  onDismiss: () => void;
};

export function MobileLandscapePrompt({
  title,
  description,
  openLabel,
  dismissLabel,
  onRotatePitch,
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
        <button type="button" className={styles.actionButton} onClick={onRotatePitch}>
          <RotateCw size={20} />
          <span>{openLabel}</span>
        </button>
      </div>
    </div>
  );
}
