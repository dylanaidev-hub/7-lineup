import type { MouseEvent } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import type { TeamMatch } from "./types/team";
import { MatchCountdown } from "./MatchCountdown";
import { MatchMapDirectionsLink } from "./MatchMapDirectionsLink";
import styles from "./TeamPages.module.css";

type MatchCardScheduleInfoProps = {
  match: TeamMatch;
  formatMatchDate: (value: string) => string;
  metaClassName: string;
  locationClassName: string;
  emptyLocationClassName?: string;
  countdownVariant?: "default" | "compact";
  showCountdown?: boolean;
  calendarIconSize?: number;
  locationIconSize?: number;
  onMapLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function MatchCardScheduleInfo({
  match,
  formatMatchDate,
  metaClassName,
  locationClassName,
  emptyLocationClassName,
  countdownVariant = "default",
  showCountdown = true,
  calendarIconSize = 14,
  locationIconSize = 14,
  onMapLinkClick,
}: MatchCardScheduleInfoProps) {
  const info = (
    <div className={styles.matchCardInfoMain}>
      <p className={metaClassName}>
        <CalendarDays size={calendarIconSize} aria-hidden="true" />
        <span>{formatMatchDate(match.starts_at)}</span>
      </p>
      <p
        className={[
          locationClassName,
          !match.location?.trim() ? emptyLocationClassName : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <MapPin size={locationIconSize} aria-hidden="true" />
        <span>{match.location?.trim() || "Chưa cập nhật"}</span>
        {match.location_map_url ? (
          <MatchMapDirectionsLink
            href={match.location_map_url}
            iconSize={locationIconSize}
            onClick={onMapLinkClick}
          />
        ) : null}
      </p>
    </div>
  );

  if (!showCountdown) return info;

  return (
    <div className={styles.matchCardInfoRow}>
      {info}
      <MatchCountdown startsAt={match.starts_at} variant={countdownVariant} />
    </div>
  );
}
