import type { ReactNode } from "react";

export type AppContentTab = "lineup" | "profile" | "locker" | "teams" | "team-detail" | "join-team";

type AppContentProps = {
  activeTab: AppContentTab;
  profileView: ReactNode;
  lockerView: ReactNode;
  teamsView: ReactNode;
  teamDetailView: ReactNode;
  joinTeamView: ReactNode;
  lineupView: ReactNode;
};

export function AppContent({ activeTab, profileView, lockerView, teamsView, teamDetailView, joinTeamView, lineupView }: AppContentProps) {
  if (activeTab === "profile") return <>{profileView}</>;
  if (activeTab === "locker") return <>{lockerView}</>;
  if (activeTab === "teams") return <>{teamsView}</>;
  if (activeTab === "team-detail") return <>{teamDetailView}</>;
  if (activeTab === "join-team") return <>{joinTeamView}</>;
  return <>{lineupView}</>;
}
