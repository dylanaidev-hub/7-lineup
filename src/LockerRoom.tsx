import { Share2, Trash2 } from "lucide-react";
import styles from "./LockerRoom.module.css";

type LockerCategoryValue = "all" | "5" | "7" | "11" | "custom" | "tactics";

type BaseSavedLineupRecord = {
  id: string;
  user_id: string;
  name: string;
  format: string;
  created_at: string;
};

type LockerCopy = {
  savedLineups: string;
  noSavedLineups: string;
  view: string;
  share: string;
};

type LockerRoomProps<TLineup extends BaseSavedLineupRecord> = {
  copy: LockerCopy;
  savedLineupCount: number;
  categories: { value: LockerCategoryValue; label: string }[];
  activeCategory: LockerCategoryValue;
  savedLineups: TLineup[];
  deletingLineupId: string | null;
  getFormatLabel: (lineup: TLineup) => string;
  getThumbnail: (lineup: TLineup) => string;
  getDateTime: (lineup: TLineup) => string;
  onCategoryChange: (category: LockerCategoryValue) => void;
  onLoadLineup: (lineup: TLineup) => void;
  onShareLineup: (lineup: TLineup) => void | Promise<void>;
  onDeleteLineup: (id: string) => void;
};

function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" />;
}

export function LockerRoom<TLineup extends BaseSavedLineupRecord>({
  copy,
  savedLineupCount,
  categories,
  activeCategory,
  savedLineups,
  deletingLineupId,
  getFormatLabel,
  getThumbnail,
  getDateTime,
  onCategoryChange,
  onLoadLineup,
  onShareLineup,
  onDeleteLineup,
}: LockerRoomProps<TLineup>) {
  return (
    <section className={styles.lockerRoom}>
      <div className={styles.lockerPanel}>
        <div className="panel-heading">
          <span>{copy.savedLineups}</span>
          <strong>{savedLineupCount}</strong>
        </div>
        <div className={styles.categorySwitch} aria-label={copy.savedLineups}>
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              className={
                activeCategory === category.value
                  ? `${styles.categoryButton} ${styles.categoryButtonActive}`
                  : styles.categoryButton
              }
              onClick={() => onCategoryChange(category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <div className={styles.savedLineupList}>
          {savedLineups.length === 0 ? <p className={styles.message}>{copy.noSavedLineups}</p> : null}
          {savedLineups.map((lineup) => {
            const thumbnail = getThumbnail(lineup);
            const formatLabel = getFormatLabel(lineup);

            return (
              <article key={lineup.id} className={styles.savedLineupCard}>
                {thumbnail ? (
                  <img src={thumbnail} alt={lineup.name} className={styles.thumbnail} />
                ) : (
                  <div className={`${styles.thumbnail} ${styles.thumbnailPlaceholder}`}>
                    {formatLabel}
                  </div>
                )}
                <div>
                  <strong>{lineup.name}</strong>
                  <span>{formatLabel}</span>
                  <time dateTime={lineup.created_at}>{getDateTime(lineup)}</time>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.actionButton} onClick={() => onLoadLineup(lineup)}>
                    {copy.view}
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.shareButton}`}
                    onClick={() => onShareLineup(lineup)}
                    aria-label={copy.share}
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => onDeleteLineup(lineup.id)}
                    disabled={deletingLineupId === lineup.id}
                  >
                    {deletingLineupId === lineup.id ? <ButtonSpinner /> : <Trash2 size={14} />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
