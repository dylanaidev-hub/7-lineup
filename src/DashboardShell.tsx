import type { ReactNode } from "react";

type DashboardShellProps = {
  isTacticsView: boolean;
  isScrollable?: boolean;
  children: ReactNode;
};

export function DashboardShell({ isTacticsView, isScrollable = false, children }: DashboardShellProps) {
  return (
    <div className={`dashboard-shell mx-auto grid w-full shadow-2xl ${isScrollable ? "dashboard-shell--scrollable" : "overflow-hidden"} ${isTacticsView ? "tactics-dashboard" : "max-w-5xl"}`}>
      {children}
    </div>
  );
}
