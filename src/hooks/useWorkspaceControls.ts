import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import type { CanvasTool } from "../CanvasToolSidebar";
import { getAppRouteUrl, type PitchSize } from "../appRouting";
import {
  createOpponentMarkers,
  createPlayers,
  getDefaultFormation,
  type DrawLine,
  type FormationKey,
  type FormationPlayer,
  type OpponentMarker,
} from "../formationData";
import { useTacticalStore, type WorkspaceMode } from "../stores/tacticalStore";
import { cloneTacticalFrame, createTacticalFrameFromWorkspace } from "../tacticalData";

type UseWorkspaceControlsOptions = {
  pitchSize: PitchSize;
  formation: FormationKey;
  customCount: number;
  players: FormationPlayer[];
  activePlayers: FormationPlayer[];
  opponentMarkers: OpponentMarker[];
  drawLines: DrawLine[];
  savedPlayersByPitch: Partial<Record<PitchSize, FormationPlayer[]>>;
  savedFormationByPitch: Partial<Record<PitchSize, FormationKey>>;
  savedCustomCountByPitch: Partial<Record<PitchSize, number>>;
  savedOpponentMarkersByPitch: Partial<Record<PitchSize, OpponentMarker[]>>;
  savedDrawLinesByPitch: Partial<Record<PitchSize, DrawLine[]>>;
  showAllCanvasObjects: boolean;
  clearDragState: () => void;
  setPitchSize: Dispatch<SetStateAction<PitchSize>>;
  setFormation: Dispatch<SetStateAction<FormationKey>>;
  setCustomCount: Dispatch<SetStateAction<number>>;
  setPlayers: Dispatch<SetStateAction<FormationPlayer[]>>;
  setSavedPlayersByPitch: Dispatch<SetStateAction<Partial<Record<PitchSize, FormationPlayer[]>>>>;
  setSavedFormationByPitch: Dispatch<SetStateAction<Partial<Record<PitchSize, FormationKey>>>>;
  setSavedCustomCountByPitch: Dispatch<SetStateAction<Partial<Record<PitchSize, number>>>>;
  setOpponentMarkers: Dispatch<SetStateAction<OpponentMarker[]>>;
  setSavedOpponentMarkersByPitch: Dispatch<SetStateAction<Partial<Record<PitchSize, OpponentMarker[]>>>>;
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
  setSavedDrawLinesByPitch: Dispatch<SetStateAction<Partial<Record<PitchSize, DrawLine[]>>>>;
  setRedoDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
  setCurrentMode: Dispatch<SetStateAction<WorkspaceMode>>;
  setActiveTool: Dispatch<SetStateAction<CanvasTool>>;
  setActiveBottomSheetTool: Dispatch<SetStateAction<CanvasTool | null>>;
};

export function useWorkspaceControls({
  pitchSize,
  formation,
  customCount,
  players,
  activePlayers,
  opponentMarkers,
  drawLines,
  savedPlayersByPitch,
  savedFormationByPitch,
  savedCustomCountByPitch,
  savedOpponentMarkersByPitch,
  savedDrawLinesByPitch,
  showAllCanvasObjects,
  clearDragState,
  setPitchSize,
  setFormation,
  setCustomCount,
  setPlayers,
  setSavedPlayersByPitch,
  setSavedFormationByPitch,
  setSavedCustomCountByPitch,
  setOpponentMarkers,
  setSavedOpponentMarkersByPitch,
  setDrawLines,
  setSavedDrawLinesByPitch,
  setRedoDrawLines,
  setIsDrawMode,
  setCurrentMode,
  setActiveTool,
  setActiveBottomSheetTool,
}: UseWorkspaceControlsOptions) {
  const navigate = useNavigate();

  const applyPitchSize = useCallback((nextPitchSize: PitchSize, options: { updateUrl?: boolean } = {}) => {
    setSavedPlayersByPitch((current) => ({ ...current, [pitchSize]: players }));
    setSavedFormationByPitch((current) => ({ ...current, [pitchSize]: formation }));
    setSavedCustomCountByPitch((current) => ({ ...current, [pitchSize]: customCount }));
    setSavedOpponentMarkersByPitch((current) => ({ ...current, [pitchSize]: opponentMarkers }));
    setSavedDrawLinesByPitch((current) => ({ ...current, [pitchSize]: drawLines }));

    const nextFormation = savedFormationByPitch[nextPitchSize] ?? getDefaultFormation(nextPitchSize);
    const nextCustomCount = savedCustomCountByPitch[nextPitchSize] ?? (nextPitchSize === "custom" ? 5 : customCount);
    const savedPlayers = savedPlayersByPitch[nextPitchSize];
    const savedOpponentMarkers = savedOpponentMarkersByPitch[nextPitchSize];
    const savedDrawLines = savedDrawLinesByPitch[nextPitchSize];
    setPitchSize(nextPitchSize);
    setFormation(nextFormation);
    setCustomCount(nextCustomCount);
    setPlayers(savedPlayers ?? createPlayers(nextPitchSize, nextFormation, nextCustomCount));
    setOpponentMarkers(savedOpponentMarkers ?? createOpponentMarkers());
    setDrawLines(savedDrawLines ?? []);
    setRedoDrawLines([]);
    setIsDrawMode(false);
    setCurrentMode(nextPitchSize === "custom" ? "CUSTOM" : "LINEUP");
    setActiveTool("PERSONNEL_TOOL");
    setActiveBottomSheetTool("PERSONNEL_TOOL");
    if (options.updateUrl !== false) {
      const nextUrl = getAppRouteUrl("lineup", nextPitchSize);
      navigate(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    }
  }, [
    customCount,
    drawLines,
    formation,
    navigate,
    opponentMarkers,
    pitchSize,
    players,
    savedCustomCountByPitch,
    savedDrawLinesByPitch,
    savedFormationByPitch,
    savedOpponentMarkersByPitch,
    savedPlayersByPitch,
    setActiveBottomSheetTool,
    setActiveTool,
    setCurrentMode,
    setCustomCount,
    setDrawLines,
    setFormation,
    setIsDrawMode,
    setOpponentMarkers,
    setPitchSize,
    setPlayers,
    setRedoDrawLines,
  ]);

  const resetPositions = () => {
    const nextCustomCount = pitchSize === "custom" ? activePlayers.length || 5 : customCount;
    if (showAllCanvasObjects) {
      setCustomCount(nextCustomCount);
    }
    setPlayers((current) =>
      createPlayers(
        pitchSize,
        formation,
        nextCustomCount,
        current.map(({ starterName, substituteName, extraNames }) => ({ starterName, substituteName, extraNames })),
      ),
    );
    if (showAllCanvasObjects) {
      setOpponentMarkers(createOpponentMarkers());
      setDrawLines([]);
      setRedoDrawLines([]);
      setIsDrawMode(false);
    }
  };

  const resetWorkspace = () => {
    const nextCustomCount = pitchSize === "custom" ? activePlayers.length || 5 : customCount;
    const nextOpponentMarkers = createOpponentMarkers();
    const nextPlayers = createPlayers(
      pitchSize,
      formation,
      nextCustomCount,
      players.map(({ starterName, substituteName, extraNames }) => ({ starterName, substituteName, extraNames })),
    ).map((player) => ({
      ...player,
      starterName: "",
      substituteName: "",
      extraNames: [],
    }));
    const nextDraftFrame = createTacticalFrameFromWorkspace(nextPlayers, nextOpponentMarkers);

    if (showAllCanvasObjects) {
      setCustomCount(nextCustomCount);
    }
    setPlayers(nextPlayers);
    setOpponentMarkers(nextOpponentMarkers);
    setDrawLines([]);
    setRedoDrawLines([]);
    setIsDrawMode(false);
    clearDragState();
    useTacticalStore.setState((state) => ({
      tactics: state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: [] } : tactic,
      ),
      frames: [],
      draftFrame: cloneTacticalFrame(nextDraftFrame),
      playbackFrames: null,
      currentFrameIndex: 0,
      isPlaying: false,
    }));
  };

  return {
    applyPitchSize,
    resetPositions,
    resetWorkspace,
  };
}
