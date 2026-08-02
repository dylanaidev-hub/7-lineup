import type { TeamMatch } from "./types/team";
import styles from "./TeamPages.module.css";

export const extractOpponentFromTitle = (title: string) => {
  const trimmed = title.trim();
  const versusMatch = trimmed.match(/\s+vs\.?\s+(.+)$/i);
  if (versusMatch) return versusMatch[1].trim();
  return trimmed;
};

export const buildMatchup = (teamName: string | undefined, title: string) => ({
  home: teamName?.trim() || "Đội của bạn",
  away: extractOpponentFromTitle(title),
});

type MatchMatchupProps = {
  match: TeamMatch;
  teamName?: string;
};

export function MatchMatchup({ match, teamName }: MatchMatchupProps) {
  if (match.match_type === "training") {
    return <h1 className={styles.matchDetailTitle}>{match.title}</h1>;
  }

  const { home, away } = buildMatchup(teamName, match.title);

  return (
    <div className={styles.matchDetailMatchup} aria-label={`${home} vs ${away}`}>
      <div className={[styles.matchDetailTeamSide, styles.matchDetailTeamSideHome].join(" ")}>
        <p className={styles.matchDetailTeamName}>{home}</p>
      </div>
      <span className={styles.matchDetailVsText} aria-hidden="true">
        VS
      </span>
      <div className={[styles.matchDetailTeamSide, styles.matchDetailTeamSideAway].join(" ")}>
        <p className={styles.matchDetailTeamName}>{away}</p>
      </div>
    </div>
  );
}
