import { Clapperboard, PenLine, Users } from "lucide-react";

export type CanvasTool = "PERSONNEL_TOOL" | "DRAW_TOOL" | "ANIMATION_TOOL";

type CanvasToolSidebarProps = {
  activeTool: CanvasTool | null;
  drawLabel: string;
  lineupLabel?: string;
  animationLabel?: string;
  onSelectTool: (tool: CanvasTool) => void;
};

export function CanvasToolSidebar({
  activeTool,
  drawLabel,
  lineupLabel = "Đội hình",
  animationLabel = "Chuyển động",
  onSelectTool,
}: CanvasToolSidebarProps) {
  return (
    <aside className="sandbox-tool-sidebar" aria-label="Canvas tools">
      <button
        type="button"
        className={activeTool === "PERSONNEL_TOOL" ? "active" : ""}
        onClick={() => onSelectTool("PERSONNEL_TOOL")}
        aria-label={lineupLabel}
      >
        <Users size={18} />
        <span>{lineupLabel}</span>
      </button>
      <button
        type="button"
        className={activeTool === "DRAW_TOOL" ? "active" : ""}
        onClick={() => onSelectTool("DRAW_TOOL")}
        aria-label={drawLabel}
      >
        <PenLine size={18} />
        <span>{drawLabel}</span>
      </button>
      <button
        type="button"
        className={activeTool === "ANIMATION_TOOL" ? "active" : ""}
        onClick={() => onSelectTool("ANIMATION_TOOL")}
        aria-label={animationLabel}
      >
        <Clapperboard size={18} />
        <span>{animationLabel}</span>
      </button>
    </aside>
  );
}
