import { Check, RotateCcw, Save } from "lucide-react";

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
    <div className="lineup-header">
      <div className="lineup-header-actions">
        <button type="button" className="save-button" onClick={onSave} disabled={isSaving}>
          {isSaving ? <ButtonSpinner /> : status === savedLabel ? <Check size={14} /> : <Save size={14} />}
          <span>{saveLabel}</span>
        </button>
        <button type="button" onClick={onReset}>
          <RotateCcw size={14} />
          <span>{resetLabel}</span>
        </button>
      </div>
    </div>
  );
}
