import type { ReactNode } from "react";

type DashboardShellProps = {
  isTacticsView: boolean;
  children: ReactNode;
};

export function DashboardShell({ isTacticsView, children }: DashboardShellProps) {
  return (
    <div className={`dashboard-shell mx-auto grid w-full overflow-hidden shadow-2xl ${isTacticsView ? "tactics-dashboard" : "max-w-5xl"}`}>
      {children}
    </div>
  );
}
