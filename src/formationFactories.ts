import type { PitchSize } from "./appRouting";
import { clampCoordinate, clampCustomCount, clampDrawCoordinate, type SharedLineup } from "./lineupShare";
import type { WorkspaceMode } from "./stores/tacticalStore";
import type { DrawLine, FormationKey, FormationPlayer, OpponentMarker } from "./formationTypes";
import { getFormationPoints } from "./formationPresets";
import { getZoneName } from "./pitchZones";

export const createOpponentMarkers = (): OpponentMarker[] =>
  Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    x: 50,
    y: 50,
    onPitch: false,
  }));

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
