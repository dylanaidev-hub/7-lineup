import type { Dispatch, SetStateAction } from "react";
import type { PitchSize } from "../appRouting";
import type { CanvasTool } from "../CanvasToolSidebar";
import { createOpponentMarkers, type DrawLine, type FormationKey, type FormationPlayer, type OpponentMarker } from "../formationData";
import { clampCustomCount } from "../lineupShare";
import { isStoredLineupState } from "../lineupSerializer";
import type { SavedLineupRecord } from "../lineupState";
import { useTacticalStore, type WorkspaceMode } from "../stores/tacticalStore";
import {
  cloneTacticalFrame,
  cloneTacticalFrames,
  createDefaultTacticalPlaybook,
  createInitialTacticalFrame,
  normalizeTacticalPlaybooks,
} from "../tacticalData";

type Options = {
  invalidMessage: string;
  showToast: (message: string, tone?: "success" | "error") => void;
  setLockerStatus: Dispatch<SetStateAction<string>>;
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
  setCurrentMode: Dispatch<SetStateAction<WorkspaceMode>>;
  setActiveTool: Dispatch<SetStateAction<CanvasTool>>;
  setActiveBottomSheetTool: Dispatch<SetStateAction<CanvasTool | null>>;
  navigateToLineup: () => void;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
};

export function useLineupRestoreActions(options: Options) {
  const loadSavedLineup = (lineup: SavedLineupRecord<FormationKey>) => {
    const data = lineup.players_data;
    if ("kind" in data && data.kind === "tactics") {
      const tactics = normalizeTacticalPlaybooks(data.tactics);
      const activeTactic = tactics[0] ?? createDefaultTacticalPlaybook();
      useTacticalStore.setState({
        tactics,
        activeTacticId: activeTactic.id,
        frames: cloneTacticalFrames(activeTactic.frames),
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      });
      options.setCurrentMode("ANIMATION");
      options.setActiveTool("ANIMATION_TOOL");
      options.setActiveBottomSheetTool("ANIMATION_TOOL");
      options.navigateToLineup();
      options.setLockerStatus("");
      return;
    }

    if (!isStoredLineupState(data)) {
      options.setLockerStatus(options.invalidMessage);
      options.showToast(options.invalidMessage, "error");
      return;
    }

    options.setPitchSize(data.pitchSize);
    options.setFormation(data.formation);
    options.setCustomCount(clampCustomCount(data.customCount));
    options.setPlayers(data.players);
    options.setSavedPlayersByPitch(data.savedPlayersByPitch ?? {});
    options.setSavedFormationByPitch(data.savedFormationByPitch ?? {});
    options.setSavedCustomCountByPitch(data.savedCustomCountByPitch ?? {});
    options.setOpponentMarkers(Array.isArray(data.opponentMarkers) ? data.opponentMarkers : createOpponentMarkers());
    options.setSavedOpponentMarkersByPitch(data.savedOpponentMarkersByPitch ?? {});
    options.setDrawLines(Array.isArray(data.drawLines) ? data.drawLines : []);
    options.setSavedDrawLinesByPitch(data.savedDrawLinesByPitch ?? {});
    const loadedMode = data.currentMode ?? (data.pitchSize === "custom" ? "CUSTOM" : "LINEUP");
    const loadedTool = loadedMode === "ANIMATION" ? "ANIMATION_TOOL" : "PERSONNEL_TOOL";
    options.setCurrentMode(loadedMode);
    options.setActiveTool(loadedTool);
    options.setActiveBottomSheetTool(loadedTool);
    if (Array.isArray(data.animationFrames)) {
      useTacticalStore.setState({
        frames: cloneTacticalFrames(data.animationFrames),
        draftFrame: cloneTacticalFrame(data.animationFrames[0] ?? createInitialTacticalFrame()),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      });
    }
    options.setRedoDrawLines([]);
    options.setIsDrawMode(false);
    options.navigateToLineup();
    options.setLockerStatus("");
  };

  return { loadSavedLineup };
}
