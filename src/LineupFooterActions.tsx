import { Check, Clipboard, Download, Maximize, Minimize, RotateCw } from "lucide-react";
import styles from "./LineupFooterActions.module.css";

type LineupFooterActionsProps = {
  shareLabel: string;
  copiedLabel: string;
  downloadLabel: string;
  fullscreenLabel: string;
  rotateLabel: string;
  isCopied: boolean;
  isFullscreen: boolean;
  isLandscape: boolean;
  showFullscreenButton?: boolean;
  onShare: () => void;
  onDownload: () => void;
  onToggleFullscreen: () => void;
  onToggleOrientation: () => void;
};

export function LineupFooterActions({
  shareLabel,
  copiedLabel,
  downloadLabel,
  fullscreenLabel,
  rotateLabel,
  isCopied,
  isFullscreen,
  isLandscape,
  showFullscreenButton = true,
  onShare,
  onDownload,
  onToggleFullscreen,
  onToggleOrientation,
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
      <button
        type="button"
        className={styles.rotateButton}
        onClick={onToggleOrientation}
        title={rotateLabel}
        aria-label={rotateLabel}
        aria-pressed={isLandscape}
      >
        <RotateCw size={14} />
        <span>{rotateLabel}</span>
      </button>
      {showFullscreenButton ? (
        <button
          type="button"
          className={styles.fullscreenButton}
          onClick={onToggleFullscreen}
          title={fullscreenLabel}
          aria-label={fullscreenLabel}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          <span>{fullscreenLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
