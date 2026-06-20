import { Clapperboard, PenLine, Users } from "lucide-react";
import styles from "./CanvasToolSidebar.module.css";

export type CanvasTool = "PERSONNEL_TOOL" | "DRAW_TOOL" | "ANIMATION_TOOL";

type CanvasToolSidebarProps = {
  activeTool: CanvasTool | null;
  drawLabel: string;
  lineupLabel?: string;
  animationLabel?: string;
  isFullscreen?: boolean;
  onSelectTool: (tool: CanvasTool) => void;
};

export function CanvasToolSidebar({
  activeTool,
  drawLabel,
  lineupLabel = "Đội hình",
  animationLabel = "Chuyển động",
  isFullscreen = false,
  onSelectTool,
}: CanvasToolSidebarProps) {
  const getButtonClassName = (tool: CanvasTool) =>
    activeTool === tool ? `${styles.button} ${styles.buttonActive}` : styles.button;

  return (
    <aside
      className={`${styles.sidebar}${isFullscreen ? ` ${styles.sidebarFullscreen} canvas-tool-sidebar--fullscreen` : ""}`}
      aria-label="Canvas tools"
    >
      <button
        type="button"
        className={getButtonClassName("PERSONNEL_TOOL")}
        onClick={() => onSelectTool("PERSONNEL_TOOL")}
        aria-label={lineupLabel}
      >
        <Users size={18} />
        <span>{lineupLabel}</span>
      </button>
      <button
        type="button"
        className={getButtonClassName("DRAW_TOOL")}
        onClick={() => onSelectTool("DRAW_TOOL")}
        aria-label={drawLabel}
      >
        <PenLine size={18} />
        <span>{drawLabel}</span>
      </button>
      <button
        type="button"
        className={getButtonClassName("ANIMATION_TOOL")}
        onClick={() => onSelectTool("ANIMATION_TOOL")}
        aria-label={animationLabel}
      >
        <Clapperboard size={18} />
        <span>{animationLabel}</span>
      </button>
    </aside>
  );
}
