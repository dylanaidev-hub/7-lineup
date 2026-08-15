export type FormationKey =
  | "1-2-1"
  | "2-1-1"
  | "1-1-2"
  | "2-3-1"
  | "3-2-1"
  | "2-2-2"
  | "4-4-2"
  | "4-3-3"
  | "3-5-2"
  | "custom";

export type FormationPoint = { id: number; x: number; y: number };

export type FormationPlayer = FormationPoint & {
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  onPitch: boolean;
};

export type OpponentMarker = FormationPoint & { onPitch: boolean };

/**
 * The meaning of a line, never its stroke. Coaching sources disagree on
 * solid-vs-dashed (solid is "pass" in some, "run" in others), so the renderer
 * owns the convention and a legend swap stays a rendering change.
 */
export type DrawKind = "free" | "run" | "pass" | "dribble" | "block" | "zoneRect" | "zoneEllipse" | "link";

/** Colour is the side, never a stored hex — an enum cannot be injected by a payload. */
export type DrawSide = "us" | "them";

export type DrawLine = {
  id: number;
  points: { x: number; y: number }[];
  kind?: DrawKind; // absent = "free": every line drawn before tactical tools existed
  side?: DrawSide; // absent = "us"
  anchor?: string; // "p3" | "o2" — ghost marker source, run/dribble only
};

export const drawKinds: DrawKind[] = ["run", "pass", "dribble", "block", "zoneRect", "zoneEllipse", "link", "free"];

export const isDrawKind = (value: unknown): value is DrawKind => drawKinds.includes(value as DrawKind);

export const isDrawSide = (value: unknown): value is DrawSide => value === "us" || value === "them";

/** Ghost anchors reference a player (`p7`) or an opponent (`o3`) marker. */
export const isDrawAnchor = (value: unknown): value is string => typeof value === "string" && /^[po]\d{1,2}$/.test(value);

export const canAnchorGhost = (kind: DrawKind) => kind === "run" || kind === "dribble";

/** Actions a player performs, so the ball travels with them if they had it. */
export const carriesBall = (kind: DrawKind | undefined) =>
  kind === "run" || kind === "pass" || kind === "dribble";

/**
 * Kinds defined by two points — the dribble zig-zag, the two zone boxes and the
 * straight link between players. Everything else keeps the whole path the coach
 * drew, curves included.
 */
export const isRubberBandKind = (kind: DrawKind | undefined) =>
  kind === "dribble" || kind === "zoneRect" || kind === "zoneEllipse" || kind === "link";
