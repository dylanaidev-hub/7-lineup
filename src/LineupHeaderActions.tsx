import { Check, RotateCcw, Save } from "lucide-react";
import styles from "./LineupHeaderActions.module.css";

type LineupHeaderActionsProps = {
  saveLabel: string;
  resetLabel: string;
  savedLabel: string;
  status: string;
  isSaving: boolean;
  isFullscreen?: boolean;
  onSave: () => void;
  onReset: () => void;
};

function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" />;
}

export function LineupHeaderActions({
  saveLabel,
  resetLabel,
  savedLabel,
  status,
  isSaving,
  isFullscreen = false,
  onSave,
  onReset,
}: LineupHeaderActionsProps) {
  return (
    <div
      className={`lineup-column-header ${styles.header}${isFullscreen ? " lineup-column-header--fullscreen lineup-header-actions--fullscreen" : ""}`}
    >
      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.saveButton}`} onClick={onSave} disabled={isSaving}>
          {isSaving ? <ButtonSpinner /> : status === savedLabel ? <Check size={14} /> : <Save size={14} />}
          <span>{saveLabel}</span>
        </button>
        <button type="button" className={styles.button} onClick={onReset}>
          <RotateCcw size={14} />
          <span>{resetLabel}</span>
        </button>
      </div>
    </div>
  );
}
