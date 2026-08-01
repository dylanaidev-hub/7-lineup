import type { ReactNode } from "react";

export type AppContentTab = "lineup" | "profile" | "locker" | "teams" | "team-detail" | "event-detail";

type AppContentProps = {
  activeTab: AppContentTab;
  profileView: ReactNode;
  lockerView: ReactNode;
  teamsView: ReactNode;
  teamDetailView: ReactNode;
  eventDetailView: ReactNode;
  lineupView: ReactNode;
};

export function AppContent({ activeTab, profileView, lockerView, teamsView, teamDetailView, eventDetailView, lineupView }: AppContentProps) {
  if (activeTab === "profile") return <>{profileView}</>;
  if (activeTab === "locker") return <>{lockerView}</>;
  if (activeTab === "teams") return <>{teamsView}</>;
  if (activeTab === "team-detail") return <>{teamDetailView}</>;
  if (activeTab === "event-detail") return <>{eventDetailView}</>;
  return <>{lineupView}</>;
}
