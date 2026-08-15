import { buildDrawGeometry, HALO_COLOR } from "./drawGeometry";
import type { DrawKind, DrawSide } from "./formationTypes";
import type { AppCopy } from "./appI18n";

type DrawToolPanelProps = {
  copy: AppCopy;
  activeKind: DrawKind;
  variant?: "column" | "strip";
  onSelectKind: (kind: DrawKind) => void;
};

/**
 * The preview box is measured in the same units as the pitch, and kept small on
 * purpose: arrowheads, the block cross and the dribble zig-zag are sized in
 * pitch units, so a 100-unit-wide preview would shrink them to specks. Over ~34
 * units they read at button size exactly as they do on the board.
 */
const PREVIEW_WIDTH = 17;
const PREVIEW_HEIGHT = 8;
const PREVIEW_ASPECT = PREVIEW_WIDTH / PREVIEW_HEIGHT;
const PREVIEW_STROKE = 0.5;

const LINE_PREVIEW = [
  { x: 1.5, y: 4 },
  { x: 15.5, y: 4 },
];
const ZONE_PREVIEW = [
  { x: 1.5, y: 1.2 },
  { x: 15.5, y: 6.8 },
];
const FREE_PREVIEW = [
  { x: 1.5, y: 6 },
  { x: 5, y: 2.4 },
  { x: 8.5, y: 6 },
  { x: 12, y: 2.4 },
  { x: 15.5, y: 5 },
];

const TOOLS: { kind: DrawKind; label: keyof AppCopy; preview: { x: number; y: number }[] }[] = [
  { kind: "run", label: "drawKindRun", preview: LINE_PREVIEW },
  { kind: "pass", label: "drawKindPass", preview: LINE_PREVIEW },
  { kind: "dribble", label: "drawKindDribble", preview: LINE_PREVIEW },
  { kind: "block", label: "drawKindBlock", preview: LINE_PREVIEW },
  { kind: "zoneRect", label: "drawKindZoneRect", preview: ZONE_PREVIEW },
  { kind: "zoneEllipse", label: "drawKindZoneEllipse", preview: ZONE_PREVIEW },
  { kind: "link", label: "drawKindLink", preview: LINE_PREVIEW },
  { kind: "free", label: "drawKindFree", preview: FREE_PREVIEW },
];

/**
 * Previews come out of the same geometry module as the pitch, so a tool button
 * can never show a stroke the board would not draw.
 */
function ToolPreview({ kind, side, points }: { kind: DrawKind; side: DrawSide; points: { x: number; y: number }[] }) {
  return (
    <svg viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`} className="draw-tool-preview" aria-hidden="true">
      {buildDrawGeometry({ kind, side, points }, PREVIEW_ASPECT)
        // no halo on a glyph: single-weight strokes read cleaner at icon size
        .filter((stroke) => stroke.color !== HALO_COLOR)
        .map((stroke, index) => (
        <path
          key={index}
          d={`M${stroke.points.map((point) => `${point.x},${point.y}`).join("L")}${stroke.closed ? "Z" : ""}`}
          fill={stroke.fill ?? "none"}
          stroke={stroke.color}
          strokeDasharray={stroke.dash ? stroke.dash.map((step) => step * PREVIEW_STROKE).join(" ") : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={stroke.width * PREVIEW_STROKE}
        />
      ))}
    </svg>
  );
}

export function DrawToolPanel({ copy, activeKind, variant = "column", onSelectKind }: DrawToolPanelProps) {
  return (
    <div className={`draw-tool-panel draw-tool-panel--${variant}`} aria-label={copy.drawTools}>
      <div className="draw-tool-grid">
        {TOOLS.map(({ kind, label, preview }) => (
          <button
            key={kind}
            type="button"
            className={`draw-tool-button${activeKind === kind ? " active" : ""}`}
            onClick={() => onSelectKind(kind)}
            aria-pressed={activeKind === kind}
          >
            <ToolPreview kind={kind} side="us" points={preview} />
            <span>{copy[label] as string}</span>
          </button>
        ))}
      </div>
      {/* Colour is decided by the marker a line starts on, not by a toggle. */}
      <p className="draw-tool-hint">{copy.drawSideHint}</p>
    </div>
  );
}
