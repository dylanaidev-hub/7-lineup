import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Button } from "./Button";
import type { MatchLineupSnapshot } from "./types/team";
import type { SavedLineupRecord } from "./lineupState";
import { getSavedLineupDateTime, getSavedLineupFormatLabel, getSavedLineupThumbnail } from "./lockerDisplay";
import styles from "./TeamPages.module.css";

type LineupPickerCopy = {
  pitchLabels: Record<"5" | "7" | "11" | "custom", string>;
  tacticsTab: string;
};

type MatchLineupPickerModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  savedLineups: SavedLineupRecord[];
  initialSelectedIds: string[];
  copy: LineupPickerCopy;
  onClose: () => void;
  onConfirm: (selectedLineups: SavedLineupRecord[]) => void;
  onCreateNew: () => void;
};

export function MatchLineupPickerModal({
  isOpen,
  isLoading,
  isSubmitting,
  savedLineups,
  initialSelectedIds,
  copy,
  onClose,
  onConfirm,
  onCreateNew,
}: MatchLineupPickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(initialSelectedIds);
  }, [initialSelectedIds, isOpen]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleLineup = (lineupId: string) => {
    setSelectedIds((current) =>
      current.includes(lineupId) ? current.filter((id) => id !== lineupId) : [...current, lineupId],
    );
  };

  const handleConfirm = () => {
    const selectedLineups = savedLineups.filter((lineup) => selectedIdSet.has(lineup.id));
    onConfirm(selectedLineups);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.lineupPickerModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lineup-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="lineup-picker-title" className={styles.modalTitle}>
            Chọn đội hình
          </h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <button type="button" className={styles.lineupPickerCreateCard} onClick={onCreateNew}>
            <span className={styles.lineupPickerCreateIcon}>
              <Plus size={22} aria-hidden="true" />
            </span>
            <span className={styles.lineupPickerCreateText}>
              <strong>Tạo đội hình mới</strong>
              <span>Mở không gian thiết kế đội hình và lưu vào thư viện</span>
            </span>
          </button>

          <div className={styles.lineupPickerToolbar}>
            <p className={styles.lineupPickerSummary}>
              {savedLineups.length} đội hình trong thư viện
              {selectedIds.length > 0 ? (
                <span className={styles.lineupPickerSelectedCount}> · Đã chọn {selectedIds.length}</span>
              ) : null}
            </p>
          </div>

          <div className={styles.lineupPickerList}>
            {isLoading ? (
              <div className={styles.detailSkeleton}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
              </div>
            ) : savedLineups.length === 0 ? (
              <p className={styles.lineupPickerEmpty}>
                Chưa có đội hình nào. Bấm &quot;Tạo đội hình mới&quot; để bắt đầu.
              </p>
            ) : (
              savedLineups.map((lineup) => {
                const isSelected = selectedIdSet.has(lineup.id);
                const thumbnail = getSavedLineupThumbnail(lineup);
                const formatLabel = getSavedLineupFormatLabel(lineup, {
                  pitchLabels: copy.pitchLabels,
                  tacticsLabel: copy.tacticsTab,
                });

                return (
                  <button
                    key={lineup.id}
                    type="button"
                    className={[
                      styles.lineupPickerItem,
                      isSelected ? styles.lineupPickerItemSelected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={isSelected}
                    onClick={() => toggleLineup(lineup.id)}
                  >
                    {thumbnail ? (
                      <img src={thumbnail} alt="" className={styles.lineupPickerThumb} />
                    ) : (
                      <div className={styles.lineupPickerThumbPlaceholder}>{formatLabel}</div>
                    )}
                    <div className={styles.lineupPickerMeta}>
                      <strong>{lineup.name}</strong>
                      <span>{formatLabel}</span>
                      <time dateTime={lineup.created_at}>{getSavedLineupDateTime(lineup)}</time>
                    </div>
                    <span className={styles.lineupPickerCheck} aria-hidden="true">
                      {isSelected ? <Check size={16} /> : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className={styles.lineupPickerActions}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Huỷ
            </Button>
            <Button
              type="button"
              variant="primary"
              className={styles.modalSubmitButton}
              disabled={isSubmitting || isLoading}
              onClick={handleConfirm}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className={styles.spinner} size={16} />
                  Đang lưu...
                </>
              ) : selectedIds.length > 0 ? (
                `Áp dụng ${selectedIds.length} đội hình`
              ) : (
                "Xoá tất cả đội hình"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildMatchLineupSnapshot(
  lineup: Pick<SavedLineupRecord, "id" | "name" | "format" | "players_data">,
): MatchLineupSnapshot {
  return {
    lineup_id: lineup.id,
    name: lineup.name,
    format: lineup.format,
    players_data: lineup.players_data,
    applied_at: new Date().toISOString(),
  };
}
