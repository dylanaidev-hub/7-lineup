import { isDrawKind, isDrawSide, type DrawKind, type DrawLine, type DrawSide } from "./formationTypes";

export type GeometryPoint = { x: number; y: number };

/**
 * One polyline ready to stroke. `width` and `dash` are multipliers of the
 * renderer's base stroke width, so the SVG board (1.15 CSS px), the PNG export
 * (3 CSS px) and the locker thumbnail (2 px) all stay visually proportional
 * without this module knowing about any of them.
 */
export type DrawStroke = {
  points: GeometryPoint[];
  dash: number[] | null;
  color: string;
  width: number;
  fill?: string;
  closed?: boolean;
};

/** Positions are display-space (0-100 on both axes, post `pitchPointToDisplay`). */
export type DrawGeometryInput = {
  kind?: DrawKind;
  side?: DrawSide;
  points: GeometryPoint[];
  /** A ghost marker is rendered at the end, so the arrow stops at its edge. */
  ghostRadius?: number;
};

/**
 * `fill` stays faint: a zone sits on top of a green pitch, and anything heavier
 * reads as a smudge rather than a highlight. The dashed border carries it.
 */
const SIDE_PALETTE: Record<DrawSide, { line: string; dim: string; fill: string }> = {
  us: { line: "#f8fafc", dim: "rgba(248,250,252,0.9)", fill: "rgba(248,250,252,0.1)" },
  them: { line: "#dc2626", dim: "rgba(248,113,113,0.95)", fill: "rgba(248,113,113,0.1)" },
};

/** Freehand keeps the colour it has always had, so old boards do not change. */
export const FREEHAND_COLOR = "#facc15";
export const HALO_COLOR = "rgba(15,23,42,0.45)";
const HALO_EXTRA_WIDTH = 0.6;

const ARROW_LENGTH = 2.8;
const ARROW_SPREAD = 0.46;
const WAVE_AMPLITUDE = 1.5;
const WAVE_LENGTH = 3.6;
const CROSS_SIZE = 2.6;
const ELLIPSE_STEPS = 48;

const DASH_PASS = [2.8, 2.2];
const DASH_ZONE = [3.2, 2.6];
const DASH_LINK = [2.2, 2];

/** Zones ignore `side` — see `buildDrawGeometry`. */
const ZONE_PALETTE = SIDE_PALETTE.them;

export const resolveDrawColor = (kind: DrawKind, side: DrawSide) =>
  kind === "free" ? FREEHAND_COLOR : SIDE_PALETTE[side].line;

/**
 * Angles and lengths must be computed in a square space, because the board's
 * SVG layer is `preserveAspectRatio="none"` over a 68x105 pitch: display space
 * is stretched ~1.54x on one axis, which would skew arrowheads and flatten
 * waves. Scaling x by the rendered aspect makes the space a uniform scale of
 * the screen; the result is mapped back before it leaves this module.
 */
const toSquare = (point: GeometryPoint, aspect: number): GeometryPoint => ({ x: point.x * aspect, y: point.y });
const fromSquare = (point: GeometryPoint, aspect: number): GeometryPoint => ({ x: point.x / aspect, y: point.y });

const direction = (from: GeometryPoint, to: GeometryPoint) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length < 1e-6 ? null : { angle: Math.atan2(dy, dx), length, ux: dx / length, uy: dy / length };
};

/**
 * Where a path is heading at its end. Taken from a point a arrowhead-length
 * back rather than the last pair, so a freehand wobble cannot spin the head.
 */
const tailPoint = (points: GeometryPoint[], aspect: number) => {
  const squared = points.map((point) => toSquare(point, aspect));
  const tip = squared[squared.length - 1];

  for (let index = squared.length - 2; index >= 0; index -= 1) {
    if (Math.hypot(tip.x - squared[index].x, tip.y - squared[index].y) >= ARROW_LENGTH * 1.2) return squared[index];
  }

  return squared[0];
};

/**
 * Cuts `distance` off the end of a path, so a line stops where its arrowhead
 * starts instead of running under the fill and out through the tip.
 */
const trimTail = (points: GeometryPoint[], distance: number, aspect: number) => {
  const squared = points.map((point) => toSquare(point, aspect));
  const tip = squared[squared.length - 1];

  for (let index = squared.length - 2; index >= 0; index -= 1) {
    const span = direction(squared[index], tip);
    if (!span || span.length <= distance) continue;

    const cut = { x: tip.x - span.ux * distance, y: tip.y - span.uy * distance };
    return [...squared.slice(0, index + 1), cut].map((point) => fromSquare(point, aspect));
  }

  return points.slice(0, 1);
};

/**
 * A point offset from the end of a path: `across` pushes sideways (right of the
 * direction of travel), `along` pulls back down the path. Used to park the ball
 * beside a ghost marker without it landing on top of the token.
 */
export const projectFromEnd = (
  points: GeometryPoint[],
  aspect: number,
  offset: { along?: number; across?: number },
): GeometryPoint => {
  const end = points[points.length - 1];
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const tip = toSquare(end, safeAspect);
  const vector = direction(tailPoint(points, safeAspect), tip);
  if (!vector) return end;

  return fromSquare(
    {
      x: tip.x - vector.ux * (offset.along ?? 0) - vector.uy * (offset.across ?? 0),
      y: tip.y - vector.uy * (offset.along ?? 0) + vector.ux * (offset.across ?? 0),
    },
    safeAspect,
  );
};

const arrowHeadPoints = (points: GeometryPoint[], aspect: number) => {
  const tip = toSquare(points[points.length - 1], aspect);
  const vector = direction(tailPoint(points, aspect), tip);
  if (!vector) return null;

  const leg = (spread: number) => ({
    x: tip.x - ARROW_LENGTH * Math.cos(vector.angle + spread),
    y: tip.y - ARROW_LENGTH * Math.sin(vector.angle + spread),
  });

  return [leg(ARROW_SPREAD), tip, leg(-ARROW_SPREAD)].map((point) => fromSquare(point, aspect));
};

const crossPoints = (points: GeometryPoint[], aspect: number) => {
  const centre = toSquare(points[points.length - 1], aspect);
  const vector = direction(tailPoint(points, aspect), centre);
  if (!vector) return null;

  const corner = (spread: number) => ({
    x: centre.x + CROSS_SIZE * Math.cos(vector.angle + spread),
    y: centre.y + CROSS_SIZE * Math.sin(vector.angle + spread),
  });
  const [a, b, c, d] = [corner(Math.PI / 4), corner((3 * Math.PI) / 4), corner((5 * Math.PI) / 4), corner((7 * Math.PI) / 4)].map(
    (point) => fromSquare(point, aspect),
  );

  return [
    [a, c],
    [b, d],
  ];
};

/** The dribble zig-zag: straight legs between alternating peaks, tip on axis. */
const wavePoints = (from: GeometryPoint, to: GeometryPoint, aspect: number) => {
  const start = toSquare(from, aspect);
  const end = toSquare(to, aspect);
  const vector = direction(start, end);
  if (!vector) return [from, to];

  const peaks = Math.max(2, Math.round(vector.length / WAVE_LENGTH));
  const along = (progress: number, offset: number) =>
    fromSquare(
      {
        x: start.x + vector.ux * vector.length * progress - vector.uy * offset,
        y: start.y + vector.uy * vector.length * progress + vector.ux * offset,
      },
      aspect,
    );

  return [
    along(0, 0),
    ...Array.from({ length: peaks }, (_, index) =>
      along((index + 0.5) / peaks, index % 2 === 0 ? WAVE_AMPLITUDE : -WAVE_AMPLITUDE),
    ),
    along(1, 0),
  ];
};

const boundingBox = (a: GeometryPoint, b: GeometryPoint) => ({
  left: Math.min(a.x, b.x),
  right: Math.max(a.x, b.x),
  top: Math.min(a.y, b.y),
  bottom: Math.max(a.y, b.y),
});

const rectPoints = (a: GeometryPoint, b: GeometryPoint) => {
  const box = boundingBox(a, b);
  return [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
  ];
};

const ellipsePoints = (a: GeometryPoint, b: GeometryPoint) => {
  const box = boundingBox(a, b);
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const rx = (box.right - box.left) / 2;
  const ry = (box.bottom - box.top) / 2;

  return Array.from({ length: ELLIPSE_STEPS }, (_, index) => {
    const angle = (index / ELLIPSE_STEPS) * Math.PI * 2;
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });
};

const withHalo = (strokes: DrawStroke[]): DrawStroke[] =>
  strokes.flatMap((stroke) => [
    { ...stroke, color: HALO_COLOR, width: stroke.width + HALO_EXTRA_WIDTH, fill: undefined },
    stroke,
  ]);

/**
 * Turns a stored line into the polylines that draw it. The single source of
 * shape truth for the board SVG, the PNG export and the locker thumbnail —
 * none of them do any trigonometry of their own.
 */
export const buildDrawGeometry = (line: DrawGeometryInput, aspect: number): DrawStroke[] => {
  const points = line.points;
  if (points.length < 2) return [];

  const kind = isDrawKind(line.kind) ? line.kind : "free";
  const side = isDrawSide(line.side) ? line.side : "us";
  const palette = SIDE_PALETTE[side];
  const color = resolveDrawColor(kind, side);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const start = points[0];
  const end = points[points.length - 1];

  if (kind === "free") {
    return withHalo([{ points, dash: null, color, width: 1 }]);
  }

  // Zones are always red: they mark space to press, attack or protect, and are
  // drawn on empty grass, so they have no starting marker to take a side from.
  if (kind === "zoneRect") {
    return [
      { points: rectPoints(start, end), dash: DASH_ZONE, color: ZONE_PALETTE.dim, width: 0.95, fill: ZONE_PALETTE.fill, closed: true },
    ];
  }

  if (kind === "zoneEllipse") {
    return [
      { points: ellipsePoints(start, end), dash: DASH_ZONE, color: ZONE_PALETTE.dim, width: 0.95, fill: ZONE_PALETTE.fill, closed: true },
    ];
  }

  // Always straight: a formation line is a relationship between two players,
  // not a path anyone runs.
  if (kind === "link") {
    return [{ points: [start, end], dash: DASH_LINK, color: palette.dim, width: 0.7 }];
  }

  if (kind === "block") {
    const cross = crossPoints(points, safeAspect);
    return withHalo([
      { points, dash: null, color, width: 1 },
      ...(cross ?? []).map((segment) => ({ points: segment, dash: null, color, width: 1 })),
    ]);
  }

  // A dribble is a zig-zag between two points; every other line follows the
  // path the coach actually drew, so a curved run stays curved.
  const drawn = kind === "dribble" ? wavePoints(start, end, safeAspect) : points;
  // Stop at the ghost's edge rather than burying the tip under the token.
  const path = line.ghostRadius ? trimTail(drawn, line.ghostRadius, safeAspect) : drawn;
  const head = path.length >= 2 ? arrowHeadPoints(path, safeAspect) : null;
  // The line stops at the back of the head; the head owns the tip.
  const body = head ? trimTail(path, ARROW_LENGTH * Math.cos(ARROW_SPREAD), safeAspect) : path;

  return withHalo([
    ...(body.length >= 2 ? [{ points: body, dash: kind === "pass" ? DASH_PASS : null, color, width: 1 }] : []),
    // Filled head: an outline reads as a thin V once the line gets thick.
    ...(head ? [{ points: head, dash: null, color, width: 0.6, fill: color, closed: true }] : []),
  ]);
};

/** Convenience for callers holding a stored line already mapped to display space. */
export const drawLineGeometry = (line: DrawLine, displayPoints: GeometryPoint[], aspect: number) =>
  buildDrawGeometry({ kind: line.kind, side: line.side, points: displayPoints }, aspect);

/**
 * Paints geometry onto a canvas. Shared by the PNG export and the locker
 * thumbnail so neither can drift from the board; `px`/`py` map display space
 * into each canvas, `baseWidth` is that canvas' stroke unit in pixels.
 */
export const strokeDrawGeometry = (
  context: CanvasRenderingContext2D,
  strokes: DrawStroke[],
  px: (value: number) => number,
  py: (value: number) => number,
  baseWidth: number,
) => {
  strokes.forEach((stroke) => {
    if (stroke.points.length < 2) return;

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = stroke.width * baseWidth;
    context.strokeStyle = stroke.color;
    context.setLineDash(stroke.dash ? stroke.dash.map((step) => step * baseWidth) : []);
    context.beginPath();
    context.moveTo(px(stroke.points[0].x), py(stroke.points[0].y));
    stroke.points.slice(1).forEach((point) => context.lineTo(px(point.x), py(point.y)));
    if (stroke.closed) context.closePath();
    if (stroke.fill) {
      context.fillStyle = stroke.fill;
      context.fill();
    }
    context.stroke();
    context.restore();
  });
};
