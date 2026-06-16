import type { ReactNode } from "react";

type LineupWorkspaceProps = {
  squadEditor: ReactNode;
  lineupColumn: ReactNode;
};

export function LineupWorkspace({ squadEditor, lineupColumn }: LineupWorkspaceProps) {
  return (
    <div className="content-grid">
      {squadEditor}
      {lineupColumn}
    </div>
  );
}
