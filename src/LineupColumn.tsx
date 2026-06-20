import type { ReactNode } from "react";

type LineupColumnMode = "animation" | "draw" | "personnel";

type LineupColumnProps = {
  mode: LineupColumnMode;
  isCustomPitch: boolean;
  isFullscreen?: boolean;
  header: ReactNode;
  mobileEditor: ReactNode;
  stage: ReactNode;
  drawControls?: ReactNode;
  footerActions: ReactNode;
};

export function LineupColumn({
  mode,
  isCustomPitch,
  isFullscreen = false,
  header,
  mobileEditor,
  stage,
  drawControls,
  footerActions,
}: LineupColumnProps) {
  const modeClass = mode === "animation" ? "tool-animation" : mode === "draw" ? "tool-draw" : "tool-personnel";

  return (
    <section className={`lineup-column ${modeClass}${isFullscreen ? " lineup-column--fullscreen" : ""}`}>
      {header}
      {mobileEditor}
      {stage}
      <div className={`lineup-footer-actions${isFullscreen ? " lineup-footer-actions--fullscreen" : ""}`}>
        <div className={`footer-formation-switch ${isCustomPitch ? "custom-formation-switch" : ""}`}>{drawControls}</div>
        {footerActions}
      </div>
    </section>
  );
}
