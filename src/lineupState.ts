import type { PitchSize } from "./appRouting";
import type { WorkspaceMode } from "./stores/tacticalStore";
import { cloneTacticalFrames, type TacticalFrame, type TacticalPlaybook } from "./tacticalData";

export type StoredLineupPlayer = {
  id: number;
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  x: number;
  y: number;
  onPitch: boolean;
};

export type StoredOpponentMarker = {
  id: number;
  x: number;
  y: number;
  onPitch: boolean;
};

export type StoredDrawLine = {
  id: number;
  points: { x: number; y: number }[];
};

export type StoredLineupState<TFormation extends string = string> = {
  version: 1;
  kind?: "unified";
  currentMode?: WorkspaceMode;
  pitchSize: PitchSize;
  formation: TFormation;
  customCount: number;
  players: StoredLineupPlayer[];
  savedPlayersByPitch: Partial<Record<PitchSize, StoredLineupPlayer[]>>;
  savedFormationByPitch: Partial<Record<PitchSize, TFormation>>;
  savedCustomCountByPitch: Partial<Record<PitchSize, number>>;
  opponentMarkers: StoredOpponentMarker[];
  savedOpponentMarkersByPitch: Partial<Record<PitchSize, StoredOpponentMarker[]>>;
  drawLines: StoredDrawLine[];
  savedDrawLinesByPitch: Partial<Record<PitchSize, StoredDrawLine[]>>;
  animationFrames?: TacticalFrame[];
  thumbnailDataUrl?: string;
  savedAt?: string;
};

export type SavedTacticsState = {
  kind: "tactics";
  tactics: TacticalPlaybook[];
};

export type SavedLineupRecord<TFormation extends string = string> = {
  id: string;
  user_id: string;
  name: string;
  format: string;
  players_data: StoredLineupState<TFormation> | SavedTacticsState;
  created_at: string;
};

export type StoredLineupStateInput<TFormation extends string = string> = {
  currentMode: WorkspaceMode;
  pitchSize: PitchSize;
  formation: TFormation;
  customCount: number;
  players: StoredLineupPlayer[];
  savedPlayersByPitch: Partial<Record<PitchSize, StoredLineupPlayer[]>>;
  savedFormationByPitch: Partial<Record<PitchSize, TFormation>>;
  savedCustomCountByPitch: Partial<Record<PitchSize, number>>;
  opponentMarkers: StoredOpponentMarker[];
  savedOpponentMarkersByPitch: Partial<Record<PitchSize, StoredOpponentMarker[]>>;
  drawLines: StoredDrawLine[];
  savedDrawLinesByPitch: Partial<Record<PitchSize, StoredDrawLine[]>>;
  animationFrames?: TacticalFrame[];
};

export const createStoredLineupState = <TFormation extends string>(
  input: StoredLineupStateInput<TFormation>,
  metadata: Partial<Pick<StoredLineupState<TFormation>, "thumbnailDataUrl" | "savedAt">> = {},
): StoredLineupState<TFormation> => ({
  version: 1,
  kind: "unified",
  currentMode: input.currentMode,
  pitchSize: input.pitchSize,
  formation: input.formation,
  customCount: input.customCount,
  players: input.players,
  savedPlayersByPitch: {
    ...input.savedPlayersByPitch,
    [input.pitchSize]: input.players,
  },
  savedFormationByPitch: {
    ...input.savedFormationByPitch,
    [input.pitchSize]: input.formation,
  },
  savedCustomCountByPitch: {
    ...input.savedCustomCountByPitch,
    [input.pitchSize]: input.customCount,
  },
  opponentMarkers: input.opponentMarkers,
  savedOpponentMarkersByPitch: {
    ...input.savedOpponentMarkersByPitch,
    [input.pitchSize]: input.opponentMarkers,
  },
  drawLines: input.drawLines,
  savedDrawLinesByPitch: {
    ...input.savedDrawLinesByPitch,
    [input.pitchSize]: input.drawLines,
  },
  animationFrames: input.animationFrames,
  ...metadata,
});

export const createSavedTacticsState = (
  tacticalState: Pick<SavedTacticsState, "tactics"> & { activeTacticId: string },
  committedFrames: TacticalFrame[],
): SavedTacticsState => ({
  kind: "tactics",
  tactics: tacticalState.tactics.map((tactic) =>
    tactic.id === tacticalState.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(committedFrames) } : tactic,
  ),
});
