import type { PitchSize } from "./appRouting";
import { clampCoordinate, clampCustomCount, clampDrawCoordinate, type SharedLineup } from "./lineupShare";
import type { WorkspaceMode } from "./stores/tacticalStore";

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

export type FormationPoint = {
  id: number;
  x: number;
  y: number;
};

export type FormationPlayer = FormationPoint & {
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  onPitch: boolean;
};

export type OpponentMarker = {
  id: number;
  x: number;
  y: number;
  onPitch: boolean;
};

export type DrawLine = {
  id: number;
  points: { x: number; y: number }[];
};

type PitchZone = {
  name: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

export const pitchOptions: { value: PitchSize; label: string }[] = [
  { value: 5, label: "Sân 5" },
  { value: 7, label: "Sân 7" },
  { value: 11, label: "Sân 11" },
  { value: "custom", label: "Cá nhân hóa" },
];

export const createOpponentMarkers = (): OpponentMarker[] =>
  Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    x: 50,
    y: 50,
    onPitch: false,
  }));

const pitchZonesBySize: Record<PitchSize, PitchZone[]> = {
  5: [
    { name: "Left Forward", x1: 4, x2: 50, y1: 4, y2: 38 },
    { name: "Right Forward", x1: 50, x2: 96, y1: 4, y2: 38 },
    { name: "Left Midfielder", x1: 4, x2: 34, y1: 38, y2: 68 },
    { name: "Center Midfielder", x1: 34, x2: 66, y1: 38, y2: 68 },
    { name: "Right Midfielder", x1: 66, x2: 96, y1: 38, y2: 68 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
  7: [
    { name: "Left Forward", x1: 4, x2: 36, y1: 4, y2: 34 },
    { name: "Striker", x1: 36, x2: 64, y1: 4, y2: 34 },
    { name: "Right Forward", x1: 64, x2: 96, y1: 4, y2: 34 },
    { name: "Left Midfielder", x1: 4, x2: 34, y1: 34, y2: 62 },
    { name: "Center Midfielder", x1: 34, x2: 66, y1: 34, y2: 62 },
    { name: "Right Midfielder", x1: 66, x2: 96, y1: 34, y2: 62 },
    { name: "Left Defender", x1: 4, x2: 34, y1: 62, y2: 82 },
    { name: "Center Defender", x1: 34, x2: 66, y1: 62, y2: 82 },
    { name: "Right Defender", x1: 66, x2: 96, y1: 62, y2: 82 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 82, y2: 96 },
  ],
  11: [
    { name: "Left Forward", x1: 4, x2: 34, y1: 4, y2: 28 },
    { name: "Striker", x1: 34, x2: 66, y1: 4, y2: 28 },
    { name: "Right Forward", x1: 66, x2: 96, y1: 4, y2: 28 },
    { name: "Left Midfielder", x1: 4, x2: 30, y1: 45, y2: 62 },
    { name: "Center Midfielder", x1: 30, x2: 70, y1: 45, y2: 62 },
    { name: "Right Midfielder", x1: 70, x2: 96, y1: 45, y2: 62 },
    { name: "Left Back", x1: 4, x2: 24, y1: 62, y2: 84 },
    { name: "Center Back", x1: 24, x2: 76, y1: 62, y2: 84 },
    { name: "Right Back", x1: 76, x2: 96, y1: 62, y2: 84 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
  custom: [
    { name: "Left Forward", x1: 4, x2: 34, y1: 4, y2: 28 },
    { name: "Striker", x1: 34, x2: 66, y1: 4, y2: 28 },
    { name: "Right Forward", x1: 66, x2: 96, y1: 4, y2: 28 },
    { name: "Left Midfielder", x1: 4, x2: 34, y1: 28, y2: 62 },
    { name: "Center Midfielder", x1: 34, x2: 66, y1: 28, y2: 62 },
    { name: "Right Midfielder", x1: 66, x2: 96, y1: 28, y2: 62 },
    { name: "Left Defender", x1: 4, x2: 34, y1: 62, y2: 84 },
    { name: "Center Defender", x1: 34, x2: 66, y1: 62, y2: 84 },
    { name: "Right Defender", x1: 66, x2: 96, y1: 62, y2: 84 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
};

export const getZoneName = (pitchSize: PitchSize, x: number, y: number) =>
  pitchZonesBySize[pitchSize].find((zone) => x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2)?.name ??
  "Free Role";

export const formationsBySize: Record<PitchSize, Partial<Record<FormationKey, FormationPoint[]>>> = {
  5: {
    "1-2-1": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 50, y: 70 },
      { id: 3, x: 35, y: 48 },
      { id: 4, x: 65, y: 48 },
      { id: 5, x: 50, y: 22 },
    ],
    "2-1-1": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 34, y: 70 },
      { id: 3, x: 66, y: 70 },
      { id: 4, x: 50, y: 48 },
      { id: 5, x: 50, y: 22 },
    ],
    "1-1-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 50, y: 70 },
      { id: 3, x: 50, y: 48 },
      { id: 4, x: 36, y: 22 },
      { id: 5, x: 64, y: 22 },
    ],
  },
  7: {
    "2-3-1": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 34, y: 68 },
      { id: 3, x: 66, y: 68 },
      { id: 4, x: 24, y: 45 },
      { id: 5, x: 50, y: 42 },
      { id: 6, x: 76, y: 45 },
      { id: 7, x: 50, y: 20 },
    ],
    "3-2-1": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 25, y: 68 },
      { id: 3, x: 50, y: 70 },
      { id: 4, x: 75, y: 68 },
      { id: 5, x: 38, y: 43 },
      { id: 6, x: 62, y: 43 },
      { id: 7, x: 50, y: 19 },
    ],
    "2-2-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 34, y: 68 },
      { id: 3, x: 66, y: 68 },
      { id: 4, x: 34, y: 45 },
      { id: 5, x: 66, y: 45 },
      { id: 6, x: 39, y: 21 },
      { id: 7, x: 61, y: 21 },
    ],
  },
  11: {
    "4-4-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 16, y: 70 },
      { id: 3, x: 38, y: 72 },
      { id: 4, x: 62, y: 72 },
      { id: 5, x: 84, y: 70 },
      { id: 6, x: 18, y: 50 },
      { id: 7, x: 40, y: 50 },
      { id: 8, x: 60, y: 50 },
      { id: 9, x: 82, y: 50 },
      { id: 10, x: 40, y: 20 },
      { id: 11, x: 60, y: 20 },
    ],
    "4-3-3": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 16, y: 70 },
      { id: 3, x: 38, y: 72 },
      { id: 4, x: 62, y: 72 },
      { id: 5, x: 84, y: 70 },
      { id: 6, x: 30, y: 50 },
      { id: 7, x: 50, y: 48 },
      { id: 8, x: 70, y: 50 },
      { id: 9, x: 24, y: 20 },
      { id: 10, x: 50, y: 18 },
      { id: 11, x: 76, y: 20 },
    ],
    "3-5-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 28, y: 72 },
      { id: 3, x: 50, y: 73 },
      { id: 4, x: 72, y: 72 },
      { id: 5, x: 14, y: 52 },
      { id: 6, x: 36, y: 50 },
      { id: 7, x: 50, y: 46 },
      { id: 8, x: 64, y: 50 },
      { id: 9, x: 86, y: 52 },
      { id: 10, x: 40, y: 20 },
      { id: 11, x: 60, y: 20 },
    ],
  },
  custom: { custom: [] },
};

const getFormationEntries = (pitchSize: PitchSize) =>
  Object.entries(formationsBySize[pitchSize]) as [FormationKey, FormationPoint[]][];

export const getDefaultFormation = (pitchSize: PitchSize) => getFormationEntries(pitchSize)[0][0];

const createCustomFormationPoints = (count: number) => {
  const playerCount = Math.min(11, Math.max(1, Math.round(count)));
  const baseFive: FormationPoint[] = [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 50, y: 70 },
    { id: 3, x: 35, y: 48 },
    { id: 4, x: 65, y: 48 },
    { id: 5, x: 50, y: 22 },
  ];
  if (playerCount <= baseFive.length) return baseFive.slice(0, playerCount);

  return [
    ...baseFive,
    ...Array.from({ length: playerCount - baseFive.length }, (_, index) => ({
      id: baseFive.length + index + 1,
      x: 24 + (index % 4) * 17,
      y: 18 + Math.floor(index / 4) * 16,
    })),
  ];
};

export const getFormationPoints = (pitchSize: PitchSize, formation: FormationKey, customCount = 8) =>
  pitchSize === "custom" ? createCustomFormationPoints(customCount) : (formationsBySize[pitchSize][formation] ?? []);

export const isFormationKey = (value: unknown): value is FormationKey =>
  typeof value === "string" &&
  pitchOptions.some((option) => Object.prototype.hasOwnProperty.call(formationsBySize[option.value], value));

export const createPlayers = (
  pitchSize: PitchSize,
  formation: FormationKey,
  customCount: number,
  roster?: (Pick<FormationPlayer, "starterName" | "substituteName" | "extraNames"> & Partial<Pick<FormationPlayer, "onPitch">>)[],
): FormationPlayer[] => {
  const formationPoints = getFormationPoints(pitchSize, formation, customCount);
  return Array.from({ length: 11 }, (_, index) => {
    const id = index + 1;
    const point = formationPoints.find((item) => item.id === id) ?? { id, x: 50, y: 50 };
    const rosterPlayer = roster?.[index];

    return {
      ...point,
      position: getZoneName(pitchSize, point.x, point.y),
      starterName: rosterPlayer?.starterName ?? "",
      substituteName: rosterPlayer?.substituteName ?? "",
      extraNames: rosterPlayer?.extraNames ?? [],
      onPitch:
        pitchSize === "custom"
          ? (rosterPlayer?.onPitch ?? index < customCount)
          : (rosterPlayer?.onPitch ?? formationPoints.some((item) => item.id === id)),
    };
  });
};

export const createOpponentMarkersFromSharedLineup = (sharedLineup: SharedLineup<FormationKey>): OpponentMarker[] => {
  const sharedMarkers = Array.isArray(sharedLineup.opponentMarkers) ? sharedLineup.opponentMarkers : [];

  return createOpponentMarkers().map((marker) => {
    const sharedMarker = sharedMarkers.find((item) => item.id === marker.id);
    return sharedMarker
      ? {
          id: marker.id,
          x: clampCoordinate(sharedMarker.x, marker.x),
          y: clampCoordinate(sharedMarker.y, marker.y),
          onPitch: Boolean(sharedMarker.onPitch),
        }
      : marker;
  });
};

export const createDrawLinesFromSharedLineup = (sharedLineup: SharedLineup<FormationKey>): DrawLine[] =>
  Array.isArray(sharedLineup.drawLines)
    ? sharedLineup.drawLines
        .filter((line) => typeof line?.id === "number" && Array.isArray(line.points))
        .map((line) => ({
          id: line.id,
          points: line.points
            .filter((point) => typeof point?.x === "number" && typeof point?.y === "number")
            .map((point) => ({
              x: clampDrawCoordinate(point.x, 50),
              y: clampDrawCoordinate(point.y, 50),
            })),
        }))
        .filter((line) => line.points.length > 0)
    : [];

export const createPlayersFromSharedLineup = (sharedLineup: SharedLineup<FormationKey>): FormationPlayer[] => {
  const pitchSize = sharedLineup.pitchSize ?? 7;
  const customCount = clampCustomCount(sharedLineup.customCount);
  const formationPoints = getFormationPoints(pitchSize, sharedLineup.formation, customCount);
  return Array.from({ length: 11 }, (_, index) => {
    const id = index + 1;
    const point = formationPoints.find((item) => item.id === id) ?? { id, x: 50, y: 50 };
    const sharedPlayer = sharedLineup.players.find((player) => player.id === point.id);
    const x = clampCoordinate(sharedPlayer?.x, point.x);
    const y = clampCoordinate(sharedPlayer?.y, point.y);

    return {
      ...point,
      x,
      y,
      position: getZoneName(pitchSize, x, y),
      starterName: sharedPlayer?.starterName ?? "",
      substituteName: sharedPlayer?.substituteName ?? "",
      extraNames: Array.isArray(sharedPlayer?.extraNames) ? sharedPlayer.extraNames : [],
      onPitch:
        typeof sharedPlayer?.onPitch === "boolean"
          ? sharedPlayer.onPitch
          : pitchSize === "custom"
            ? point.id <= customCount
            : formationPoints.some((item) => item.id === point.id),
    };
  });
};

export const getInitialWorkspaceMode = (
  sharedLineup: SharedLineup<FormationKey> | null,
  initialPitchSize: PitchSize,
): WorkspaceMode => {
  const params = new URLSearchParams(window.location.search);
  if (sharedLineup?.currentMode) return sharedLineup.currentMode;
  if (params.get("tab") === "tactics") return "ANIMATION";
  return initialPitchSize === "custom" ? "CUSTOM" : "LINEUP";
};

export const getRegisteredNames = (player: FormationPlayer) =>
  [player.starterName, player.substituteName, ...player.extraNames].map((name) => name.trim()).filter(Boolean);

export const getBenchNames = (player: FormationPlayer) =>
  [player.substituteName, ...player.extraNames].map((name) => name.trim()).filter(Boolean);

export const getBenchCount = (players: FormationPlayer[]) =>
  players.reduce((total, player) => total + getBenchNames(player).length, 0);

const positionTranslations: Record<string, string> = {
  "Left Forward": "Tiền đạo trái",
  Striker: "Tiền đạo",
  "Right Forward": "Tiền đạo phải",
  "Left Midfielder": "Tiền vệ trái",
  "Center Midfielder": "Tiền vệ trung tâm",
  "Right Midfielder": "Tiền vệ phải",
  "Left Defender": "Hậu vệ trái",
  "Center Defender": "Hậu vệ trung tâm",
  "Right Defender": "Hậu vệ phải",
  Goalkeeper: "Thủ môn",
  "Center Back": "Trung vệ",
  "Left Back": "Hậu vệ trái",
  "Right Back": "Hậu vệ phải",
  "Free Role": "Tự do",
};

export const getDisplayPosition = (position: string, language: "vi" | "en") =>
  language === "vi" ? (positionTranslations[position] ?? position) : position;

