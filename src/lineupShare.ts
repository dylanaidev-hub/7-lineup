import type { PitchSize } from "./appRouting";
import type { WorkspaceMode } from "./stores/tacticalStore";
import { cloneTacticalFrames, normalizeTacticalFrame, type TacticalFrame } from "./tacticalData";

type SharedPlayer = {
  id: number;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  x: number;
  y: number;
  onPitch: boolean;
};

type SharedOpponentMarker = {
  id: number;
  x: number;
  y: number;
  onPitch: boolean;
};

type SharedDrawLine = {
  id: number;
  points: { x: number; y: number }[];
};

export type SharedLineup<TFormation extends string = string> = {
  version?: 1 | 2;
  currentMode?: WorkspaceMode;
  pitchSize?: PitchSize;
  customCount?: number;
  formation: TFormation;
  players: SharedPlayer[];
  opponentMarkers?: SharedOpponentMarker[];
  drawLines?: SharedDrawLine[];
  animationFrames?: TacticalFrame[];
};

type SharePayloadPlayer = Pick<SharedPlayer, "id" | "starterName" | "substituteName" | "extraNames" | "x" | "y" | "onPitch">;

type SharePayloadOpponent = Pick<SharedOpponentMarker, "id" | "x" | "y" | "onPitch">;

export type DecodeValidators<TFormation extends string> = {
  isPitchSize: (value: unknown) => value is PitchSize;
  isFormationKey: (value: unknown) => value is TFormation;
  hasFormation: (pitchSize: PitchSize, formation: TFormation) => boolean;
};

export const clampCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(96, Math.max(4, value)) : fallback;

export const clampDrawCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;

export const clampCustomCount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(11, Math.max(0, Math.round(value))) : 0;

export const buildSharePayload = <TFormation extends string>(
  pitchSize: PitchSize,
  formation: TFormation,
  customCount: number,
  players: SharePayloadPlayer[],
  opponentMarkers: SharePayloadOpponent[],
  drawLines: SharedDrawLine[],
  animationFrames: TacticalFrame[] = [],
  currentMode: WorkspaceMode = pitchSize === "custom" ? "CUSTOM" : "LINEUP",
): SharedLineup<TFormation> => {
  const payload: SharedLineup<TFormation> = {
    version: 2,
    currentMode,
    pitchSize,
    customCount: pitchSize === "custom" ? customCount : undefined,
    formation,
    players: players.map(({ id, starterName, substituteName, extraNames, x, y, onPitch }) => ({
      id,
      starterName,
      substituteName,
      extraNames,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      onPitch,
    })),
    opponentMarkers: opponentMarkers.map(({ id, x, y, onPitch }) => ({
      id,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      onPitch,
    })),
    drawLines: drawLines.map((line) => ({
      id: line.id,
      points: line.points.map((point) => ({
        x: Math.round(point.x * 10) / 10,
        y: Math.round(point.y * 10) / 10,
      })),
    })),
    animationFrames: cloneTacticalFrames(animationFrames),
  };

  return payload;
};

export const encodeSharePayloadObject = <TFormation extends string>(payload: SharedLineup<TFormation>) => {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

export const encodeSharePayload = <TFormation extends string>(
  ...args: Parameters<typeof buildSharePayload<TFormation>>
) => encodeSharePayloadObject(buildSharePayload<TFormation>(...args));

/**
 * Validates an untrusted lineup payload, whether it came from a pasted URL or
 * from a `share_links` row (which anyone holding the public anon key can write).
 */
export const normalizeSharedLineup = <TFormation extends string>(
  value: unknown,
  validators: DecodeValidators<TFormation>,
): SharedLineup<TFormation> | null => {
  if (!value || typeof value !== "object") return null;

  const parsed = value as Partial<SharedLineup<TFormation>>;
  const pitchSize = validators.isPitchSize(parsed.pitchSize) ? parsed.pitchSize : 7;

  if (
    !validators.isFormationKey(parsed.formation) ||
    !validators.hasFormation(pitchSize, parsed.formation) ||
    !Array.isArray(parsed.players)
  ) {
    return null;
  }

  return {
    version: parsed.version === 2 ? 2 : 1,
    currentMode:
      parsed.currentMode === "LINEUP" || parsed.currentMode === "CUSTOM" || parsed.currentMode === "ANIMATION"
        ? parsed.currentMode
        : pitchSize === "custom"
          ? "CUSTOM"
          : "LINEUP",
    pitchSize,
    customCount: clampCustomCount(parsed.customCount),
    formation: parsed.formation,
    players: parsed.players.filter((player) => typeof player?.id === "number") as SharedLineup<TFormation>["players"],
    opponentMarkers: Array.isArray(parsed.opponentMarkers) ? parsed.opponentMarkers : [],
    drawLines: Array.isArray(parsed.drawLines) ? parsed.drawLines : [],
    animationFrames: Array.isArray(parsed.animationFrames)
      ? (parsed.animationFrames.map(normalizeTacticalFrame).filter(Boolean) as TacticalFrame[])
      : [],
  };
};

export const decodeSharePayload = <TFormation extends string>(
  value: string,
  validators: DecodeValidators<TFormation>,
): SharedLineup<TFormation> | null => {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return normalizeSharedLineup(JSON.parse(new TextDecoder().decode(bytes)), validators);
  } catch {
    return null;
  }
};

