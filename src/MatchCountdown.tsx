import { useEffect, useState } from "react";
import styles from "./TeamPages.module.css";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type MatchCountdownState =
  | {
      mode: "days";
      days: number;
      ariaLabel: string;
    }
  | {
      mode: "clock";
      left: string;
      right: string;
      ariaLabel: string;
    };

export function getMatchCountdownState(startsAt: string, now = Date.now()): MatchCountdownState | null {
  const diffMs = new Date(startsAt).getTime() - now;
  if (diffMs <= 0) return null;

  if (diffMs >= ONE_DAY_MS) {
    const days = Math.floor(diffMs / ONE_DAY_MS);
    return {
      mode: "days",
      days,
      ariaLabel: `Còn ${days} ngày`,
    };
  }

  if (diffMs >= ONE_HOUR_MS) {
    const hours = Math.floor(diffMs / ONE_HOUR_MS);
    const minutes = Math.floor((diffMs % ONE_HOUR_MS) / 60_000);
    return {
      mode: "clock",
      left: String(hours).padStart(2, "0"),
      right: String(minutes).padStart(2, "0"),
      ariaLabel: `Còn ${hours} giờ ${minutes} phút`,
    };
  }

  const minutes = Math.floor(diffMs / 60_000);
  const seconds = Math.floor((diffMs % 60_000) / 1000);
  return {
    mode: "clock",
    left: String(minutes).padStart(2, "0"),
    right: String(seconds).padStart(2, "0"),
    ariaLabel: minutes > 0 ? `Còn ${minutes} phút ${seconds} giây` : `Còn ${seconds} giây`,
  };
}

function getCountdownIntervalMs(startsAt: string, now = Date.now()): number | null {
  const diffMs = new Date(startsAt).getTime() - now;
  if (diffMs <= 0) return null;
  return diffMs < ONE_HOUR_MS ? 1_000 : 60_000;
}

function FlipPanel({
  value,
  compact,
}: {
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        styles.flipPanel,
        compact ? styles.flipPanelCompact : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.flipPanelValue}>{value}</span>
    </div>
  );
}

type MatchCountdownProps = {
  startsAt: string;
  variant?: "default" | "compact";
  className?: string;
};

export function MatchCountdown({ startsAt, variant = "default", className }: MatchCountdownProps) {
  const [state, setState] = useState(() => getMatchCountdownState(startsAt));
  const compact = variant === "compact";

  useEffect(() => {
    let intervalId: number | undefined;

    const tick = () => {
      setState(getMatchCountdownState(startsAt));

      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }

      const nextIntervalMs = getCountdownIntervalMs(startsAt);
      if (nextIntervalMs === null) return;

      intervalId = window.setInterval(tick, nextIntervalMs);
    };

    tick();

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [startsAt]);

  if (!state) return null;

  return (
    <div
      className={[
        styles.matchCountdown,
        compact ? styles.matchCountdownCompact : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={state.ariaLabel}
    >
      {state.mode === "days" ? (
        <div className={styles.flipDays} aria-hidden="true">
          <div className={styles.flipDayUnit}>
            <FlipPanel value={String(state.days)} compact={compact} />
            <span className={styles.flipDayLabel}>ngày</span>
          </div>
        </div>
      ) : (
        <div className={styles.flipClock} aria-hidden="true">
          <FlipPanel value={state.left} compact={compact} />
          <span className={styles.flipColon}>:</span>
          <FlipPanel value={state.right} compact={compact} />
        </div>
      )}
    </div>
  );
}
