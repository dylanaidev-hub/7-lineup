import { Check, Clipboard, Download } from "lucide-react";
import styles from "./LineupFooterActions.module.css";

type LineupFooterActionsProps = {
  shareLabel: string;
  copiedLabel: string;
  downloadLabel: string;
  isCopied: boolean;
  onShare: () => void;
  onDownload: () => void;
};

export function LineupFooterActions({
  shareLabel,
  copiedLabel,
  downloadLabel,
  isCopied,
  onShare,
  onDownload,
}: LineupFooterActionsProps) {
  return (
    <div className={styles.actionsRight}>
      <button type="button" className={styles.shareButton} onClick={onShare}>
        {isCopied ? <Check size={14} /> : <Clipboard size={14} />}
        <span>{isCopied ? copiedLabel : shareLabel}</span>
      </button>
      <button type="button" className={styles.downloadButton} onClick={onDownload}>
        <Download size={14} />
        <span>{downloadLabel}</span>
      </button>
    </div>
  );
}
