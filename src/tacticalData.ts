export type TacticalMarker = {
  id: string;
  label: string;
  type: "player" | "opponent" | "ball";
  x: number;
  y: number;
  onPitch: boolean;
};

export type TacticalFrame = TacticalMarker[];

export type TacticalPlaybook = {
  id: string;
  name: string;
  frames: TacticalFrame[];
};

type WorkspacePlayer = {
  id: number;
  x: number;
  y: number;
  onPitch: boolean;
};

type WorkspaceOpponent = {
  id: number;
  x: number;
  y: number;
  onPitch: boolean;
};

export const defaultBallMarker: TacticalMarker = { id: "ball", label: "", type: "ball", x: 50, y: 56, onPitch: true };

export const createInitialTacticalFrame = (): TacticalFrame => [
  { id: "p1", label: "1", type: "player", x: 50, y: 90, onPitch: true },
  { id: "p2", label: "2", type: "player", x: 34, y: 68, onPitch: true },
  { id: "p3", label: "3", type: "player", x: 66, y: 68, onPitch: true },
  { id: "p4", label: "4", type: "player", x: 24, y: 45, onPitch: true },
  { id: "p5", label: "5", type: "player", x: 50, y: 42, onPitch: true },
  { id: "p6", label: "6", type: "player", x: 76, y: 45, onPitch: true },
  { id: "p7", label: "7", type: "player", x: 50, y: 20, onPitch: true },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `p${index + 8}`,
    label: `${index + 8}`,
    type: "player" as const,
    x: 50,
    y: 50,
    onPitch: false,
  })),
  ...Array.from({ length: 11 }, (_, index) => ({
    id: `o${index + 1}`,
    label: `${index + 1}`,
    type: "opponent" as const,
    x: 50,
    y: 50,
    onPitch: false,
  })),
  { ...defaultBallMarker },
];

export const cloneTacticalFrame = (frame: TacticalFrame): TacticalFrame => frame.map((marker) => ({ ...marker }));

export const cloneTacticalFrames = (frames: TacticalFrame[]): TacticalFrame[] => frames.map(cloneTacticalFrame);

export const areTacticalFramesEqual = (a: TacticalFrame | undefined, b: TacticalFrame | undefined) => {
  if (!a || !b || a.length !== b.length) return false;
  const bMarkers = new Map(b.map((marker) => [marker.id, marker]));
  return a.every((marker) => {
    const other = bMarkers.get(marker.id);
    return (
      !!other &&
      marker.type === other.type &&
      marker.label === other.label &&
      marker.onPitch === other.onPitch &&
      Math.abs(marker.x - other.x) < 0.05 &&
      Math.abs(marker.y - other.y) < 0.05
    );
  });
};

export const createTacticalFrameFromWorkspace = (
  players: WorkspacePlayer[],
  opponentMarkers: WorkspaceOpponent[],
  ballMarker: TacticalMarker = defaultBallMarker,
): TacticalFrame => [
  ...players.map((player) => ({
    id: `p${player.id}`,
    label: `${player.id}`,
    type: "player" as const,
    x: player.x,
    y: player.y,
    onPitch: player.onPitch,
  })),
  ...opponentMarkers.map((marker) => ({
    id: `o${marker.id}`,
    label: `${marker.id}`,
    type: "opponent" as const,
    x: marker.x,
    y: marker.y,
    onPitch: marker.onPitch,
  })),
  { ...defaultBallMarker, ...ballMarker, id: "ball", label: "", type: "ball" as const },
];

export const createTacticalId = () => `tactic-${Date.now()}-${Math.round(Math.random() * 1000)}`;

export const createDefaultTacticalPlaybook = (): TacticalPlaybook => ({
  id: "tactic-default",
  name: "Chiến thuật 1",
  frames: [],
});

const clampTacticalCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(96, Math.max(4, value)) : fallback;

export const normalizeTacticalFrame = (frame: unknown): TacticalFrame | null => {
  if (!Array.isArray(frame)) return null;

  const normalized = frame
    .filter((marker) => marker && typeof marker === "object")
    .map((marker) => {
      const item = marker as Partial<TacticalMarker>;
      if (typeof item.id !== "string" || (item.type !== "player" && item.type !== "opponent" && item.type !== "ball")) {
        return null;
      }

      return {
        id: item.id,
        label: typeof item.label === "string" ? item.label : "",
        type: item.type,
        x: clampTacticalCoordinate(item.x, 50),
        y: clampTacticalCoordinate(item.y, 50),
        onPitch: Boolean(item.onPitch),
      };
    })
    .filter(Boolean) as TacticalFrame;

  return normalized.length > 0 ? normalized : null;
};

export const normalizeTacticalPlaybooks = (value: unknown): TacticalPlaybook[] => {
  if (!Array.isArray(value)) return [createDefaultTacticalPlaybook()];

  const tactics = value
    .filter((tactic) => tactic && typeof tactic === "object")
    .map((tactic, index) => {
      const item = tactic as Partial<TacticalPlaybook>;
      const frames = Array.isArray(item.frames) ? item.frames.map(normalizeTacticalFrame).filter(Boolean) : [];

      return {
        id: typeof item.id === "string" && item.id ? item.id : `tactic-${index + 1}`,
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : `Chiến thuật ${index + 1}`,
        frames: frames as TacticalFrame[],
      };
    })
    .filter(Boolean) as TacticalPlaybook[];

  return tactics.length > 0 ? tactics : [createDefaultTacticalPlaybook()];
};

export const encodeTacticalPayload = (tactics: TacticalPlaybook[]) => {
  const json = JSON.stringify({
    version: 1,
    tactics: tactics.map((tactic) => ({
      ...tactic,
      frames: tactic.frames.map((frame) =>
        frame.map((marker) => ({
          ...marker,
          x: Math.round(marker.x * 10) / 10,
          y: Math.round(marker.y * 10) / 10,
        })),
      ),
    })),
  });
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

export const decodeTacticalPayload = (value: string): TacticalPlaybook[] | null => {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { tactics?: unknown };

    return normalizeTacticalPlaybooks(parsed.tactics);
  } catch {
    return null;
  }
};

