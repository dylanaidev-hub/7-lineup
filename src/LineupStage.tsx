import type { ReactNode } from "react";
import { CanvasToolSidebar, type CanvasTool } from "./CanvasToolSidebar";

type LineupStageMode = "animation" | "draw" | "personnel";

type LineupStageProps = {
  mode: LineupStageMode;
  activeTool: CanvasTool | null;
  drawLabel: string;
  isDragging: boolean;
  showMarkerTray: boolean;
  showAnimationPanel: boolean;
  onSelectTool: (tool: CanvasTool) => void;
  markerTray?: ReactNode;
  pitch: ReactNode;
  mobileSquadDrawer?: ReactNode;
  animationTimeline?: ReactNode;
};

export function LineupStage({
  mode,
  activeTool,
  drawLabel,
  isDragging,
  showMarkerTray,
  showAnimationPanel,
  onSelectTool,
  markerTray,
  pitch,
  mobileSquadDrawer,
  animationTimeline,
}: LineupStageProps) {
  const modeClass = mode === "animation" ? "tool-animation" : mode === "draw" ? "tool-draw" : "tool-personnel";

  return (
    <div
      className={`lineup-stage sandbox-canvas-stage ${modeClass} ${isDragging ? "dock-dimmed" : ""} ${
        showMarkerTray ? "show-marker-tray" : ""
      } ${showAnimationPanel ? "show-animation-panel" : ""}`}
    >
      <CanvasToolSidebar activeTool={activeTool} drawLabel={drawLabel} onSelectTool={onSelectTool} />
      {markerTray}
      {pitch}
      {mobileSquadDrawer}
      {animationTimeline}
    </div>
  );
}
