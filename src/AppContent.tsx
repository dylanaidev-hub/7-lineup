import type { ReactNode } from "react";

export type AppContentTab = "lineup" | "profile" | "locker" | "teams" | "team-detail" | "match-detail" | "join-team";

type AppContentProps = {
  activeTab: AppContentTab;
  profileView: ReactNode;
  lockerView: ReactNode;
  teamsView: ReactNode;
  teamDetailView: ReactNode;
  matchDetailView: ReactNode;
  joinTeamView: ReactNode;
  lineupView: ReactNode;
};

export function AppContent({
  activeTab,
  profileView,
  lockerView,
  teamsView,
  teamDetailView,
  matchDetailView,
  joinTeamView,
  lineupView,
}: AppContentProps) {
  if (activeTab === "profile") return <>{profileView}</>;
  if (activeTab === "locker") return <>{lockerView}</>;
  if (activeTab === "teams") return <>{teamsView}</>;
  if (activeTab === "team-detail") return <>{teamDetailView}</>;
  if (activeTab === "match-detail") return <>{matchDetailView}</>;
  if (activeTab === "join-team") return <>{joinTeamView}</>;
  return <>{lineupView}</>;
}
