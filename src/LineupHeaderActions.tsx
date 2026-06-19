import { Check, RotateCcw, Save } from "lucide-react";
import styles from "./LineupHeaderActions.module.css";

type LineupHeaderActionsProps = {
  saveLabel: string;
  resetLabel: string;
  savedLabel: string;
  status: string;
  isSaving: boolean;
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
  onSave,
  onReset,
}: LineupHeaderActionsProps) {
  return (
    <div className={`lineup-column-header ${styles.header}`}>
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
