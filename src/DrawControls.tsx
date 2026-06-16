import { Redo2, Trash2, Undo2 } from "lucide-react";

type DrawControlsProps = {
  undoLabel: string;
  redoLabel: string;
  clearLabel: string;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

export function DrawControls({
  undoLabel,
  redoLabel,
  clearLabel,
  canUndo,
  canRedo,
  canClear,
  onUndo,
  onRedo,
  onClear,
}: DrawControlsProps) {
  return (
    <div className="draw-history-actions">
      <button type="button" onClick={onUndo} disabled={!canUndo}>
        <Undo2 size={14} />
        <span>{undoLabel}</span>
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo}>
        <Redo2 size={14} />
        <span>{redoLabel}</span>
      </button>
      <button type="button" onClick={onClear} disabled={!canClear}>
        <Trash2 size={14} />
        <span>{clearLabel}</span>
      </button>
    </div>
  );
}
