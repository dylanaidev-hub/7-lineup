import type { ReactNode } from "react";

export type AppContentTab = "lineup" | "profile" | "locker";

type AppContentProps = {
  activeTab: AppContentTab;
  profileView: ReactNode;
  lockerView: ReactNode;
  lineupView: ReactNode;
};

export function AppContent({ activeTab, profileView, lockerView, lineupView }: AppContentProps) {
  if (activeTab === "profile") return <>{profileView}</>;
  if (activeTab === "locker") return <>{lockerView}</>;
  return <>{lineupView}</>;
}
