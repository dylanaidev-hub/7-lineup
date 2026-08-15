import type { ReactNode } from "react";
import { CanvasToolSidebar, type CanvasTool } from "./CanvasToolSidebar";

type LineupStageMode = "animation" | "draw" | "personnel";

type LineupStageProps = {
  mode: LineupStageMode;
  activeTool: CanvasTool | null;
  drawLabel: string;
  isDragging: boolean;
  isFullscreen?: boolean;
  showMarkerTray: boolean;
  showAnimationPanel: boolean;
  onSelectTool: (tool: CanvasTool) => void;
  markerTray?: ReactNode;
  drawTools?: ReactNode;
  pitch: ReactNode;
  mobileSquadDrawer?: ReactNode;
  animationTimeline?: ReactNode;
};

export function LineupStage({
  mode,
  activeTool,
  drawLabel,
  isDragging,
  isFullscreen = false,
  showMarkerTray,
  showAnimationPanel,
  onSelectTool,
  markerTray,
  drawTools,
  pitch,
  mobileSquadDrawer,
  animationTimeline,
}: LineupStageProps) {
  const modeClass = mode === "animation" ? "tool-animation" : mode === "draw" ? "tool-draw" : "tool-personnel";
  const pitchBounds = <div className="pitch-bounds">{pitch}</div>;
  const pitchNode = isFullscreen ? (
    <div className="workspace-fullscreen-pitch-viewport">{pitchBounds}</div>
  ) : (
    pitchBounds
  );

  return (
    <div
      className={`lineup-stage sandbox-canvas-stage ${modeClass} ${isDragging ? "dock-dimmed" : ""} ${
        showMarkerTray ? "show-marker-tray" : ""
      } ${showAnimationPanel ? "show-animation-panel" : ""}${isFullscreen ? " lineup-stage--fullscreen" : ""}`}
    >
      <CanvasToolSidebar activeTool={activeTool} drawLabel={drawLabel} isFullscreen={isFullscreen} onSelectTool={onSelectTool} />
      {markerTray}
      {drawTools}
      {pitchNode}
      {mobileSquadDrawer}
      {animationTimeline}
    </div>
  );
}
