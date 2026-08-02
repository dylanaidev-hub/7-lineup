import { Check, Loader2, Minus, X } from "lucide-react";
import type { TeamMatchAttendanceStatus } from "./types/team";
import styles from "./TeamPages.module.css";

export const QUICK_ATTENDANCE_STATUS_LABELS: Record<TeamMatchAttendanceStatus, string> = {
  going: "Có mặt",
  not_going: "Vắng",
  maybe: "Chưa chắc",
  unknown: "Chưa trả lời",
};

const QUICK_ATTENDANCE_OPTIONS: Array<{
  status: Exclude<TeamMatchAttendanceStatus, "unknown">;
  icon: typeof Check;
  className: string;
}> = [
  { status: "going", icon: Check, className: styles.attendanceStatusGoing },
  { status: "maybe", icon: Minus, className: styles.attendanceStatusMaybe },
  { status: "not_going", icon: X, className: styles.attendanceStatusAbsent },
];

type QuickAttendanceButtonsProps = {
  status: TeamMatchAttendanceStatus;
  isUpdating?: boolean;
  disabled?: boolean;
  showLabels?: boolean;
  onStatusChange: (status: Exclude<TeamMatchAttendanceStatus, "unknown">) => void;
};

export function QuickAttendanceButtons({
  status,
  isUpdating = false,
  disabled = false,
  showLabels = false,
  onStatusChange,
}: QuickAttendanceButtonsProps) {
  return (
    <div
      className={[
        styles.quickAttendanceActions,
        showLabels ? styles.quickAttendanceActionsLabeled : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label="Điểm danh nhanh"
      onClick={(event) => event.stopPropagation()}
    >
      {QUICK_ATTENDANCE_OPTIONS.map(({ status: optionStatus, icon: Icon, className }) => {
        const isActive = status === optionStatus;
        const label = QUICK_ATTENDANCE_STATUS_LABELS[optionStatus];

        return (
          <button
            key={optionStatus}
            type="button"
            className={[
              styles.attendanceStatusButton,
              !showLabels ? styles.quickAttendanceButton : "",
              isActive ? styles.attendanceStatusButtonActive : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={disabled || isUpdating}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            onClick={() => onStatusChange(optionStatus)}
          >
            {isUpdating && isActive ? (
              <Loader2 className={styles.spinner} size={14} aria-hidden="true" />
            ) : (
              <Icon size={14} aria-hidden="true" />
            )}
            {showLabels ? <span>{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
