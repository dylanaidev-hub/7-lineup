import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import type { AppTab, PitchSize } from "../appRouting";
import type { CanvasTool } from "../CanvasToolSidebar";
import {
  createOpponentMarkers,
  isFormationKey,
  type DrawLine,
  type FormationKey,
  type FormationPlayer,
  type OpponentMarker,
} from "../formationData";
import { clampCustomCount } from "../lineupShare";
import { saveLineupRecordToSupabase } from "../lineupPersistence";
import {
  createStoredLineupState,
  type SavedLineupRecord,
  type StoredLineupState,
} from "../lineupState";
import { createLineupThumbnail } from "../lineupThumbnail";
import { createSavedLineupShareUrl } from "../savedLineupShare";
import { copyTextOrPrompt } from "../shareUtils";
import { useTacticalStore, type WorkspaceMode } from "../stores/tacticalStore";
import {
  cloneTacticalFrame,
  cloneTacticalFrames,
  createDefaultTacticalPlaybook,
  createInitialTacticalFrame,
  normalizeTacticalPlaybooks,
} from "../tacticalData";
import { isPitchSize } from "../appRouting";
import { supabase } from "../lib/supabaseClient";
import type { LockerCategory } from "./useLockerRoomData";

type StorageCopy = {
  supabaseMissing: string;
  pitchLabels: Record<PitchSize, string>;
  player: string;
  saved: string;
  tacticsTab: string;
  invalidLineupData: string;
  share: string;
  copied: string;
};

type UseLineupStorageActionsOptions = {
  user: User | null;
  copy: StorageCopy;
  lineupName: string;
  currentMode: WorkspaceMode;
  pitchSize: PitchSize;
  formation: FormationKey;
  customCount: number;
  players: FormationPlayer[];
  activePlayers: FormationPlayer[];
  savedPlayersByPitch: Partial<Record<PitchSize, FormationPlayer[]>>;
  savedFormationByPitch: Partial<Record<PitchSize, FormationKey>>;
  savedCustomCountByPitch: Partial<Record<PitchSize, number>>;
  opponentMarkers: OpponentMarker[];
  savedOpponentMarkersByPitch: Partial<Record<PitchSize, OpponentMarker[]>>;
  drawLines: DrawLine[];
  savedDrawLinesByPitch: Partial<Record<PitchSize, DrawLine[]>>;
  showAllCanvasObjects: boolean;
  fetchSavedLineups: () => Promise<void>;
  getErrorMessage: (error: unknown) => string;
  showToast: (message: string, tone?: "success" | "error") => void;
  setAuthDialogMode: Dispatch<SetStateAction<"sign_in" | "sign_up" | "reset">>;
  setIsAuthScreenOpen: Dispatch<SetStateAction<boolean>>;
  setLockerStatus: Dispatch<SetStateAction<string>>;
  setIsLockerLoading: Dispatch<SetStateAction<boolean>>;
  setLineupName: Dispatch<SetStateAction<string>>;
  setLockerCategory: Dispatch<SetStateAction<LockerCategory>>;
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
  setActiveTab: Dispatch<SetStateAction<AppTab>>;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
};

export function useLineupStorageActions({
  user,
  copy,
  lineupName,
  currentMode,
  pitchSize,
  formation,
  customCount,
  players,
  activePlayers,
  savedPlayersByPitch,
  savedFormationByPitch,
  savedCustomCountByPitch,
  opponentMarkers,
  savedOpponentMarkersByPitch,
  drawLines,
  savedDrawLinesByPitch,
  showAllCanvasObjects,
  fetchSavedLineups,
  getErrorMessage,
  showToast,
  setAuthDialogMode,
  setIsAuthScreenOpen,
  setLockerStatus,
  setIsLockerLoading,
  setLineupName,
  setLockerCategory,
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
  setCurrentMode,
  setActiveTool,
  setActiveBottomSheetTool,
  setActiveTab,
  setIsDrawMode,
}: UseLineupStorageActionsOptions) {
  const openAuthForSave = () => {
    setAuthDialogMode("sign_in");
    setIsAuthScreenOpen(true);
  };

  const getCurrentLineupState = (
    metadata: Partial<Pick<StoredLineupState<FormationKey>, "thumbnailDataUrl" | "savedAt">> = {},
  ): StoredLineupState<FormationKey> => {
    const animationFrames = useTacticalStore.getState().commitDraftIfChanged();
    return createStoredLineupState(
      {
        currentMode,
        pitchSize,
        formation,
        customCount,
        players,
        savedPlayersByPitch,
        savedFormationByPitch,
        savedCustomCountByPitch,
        opponentMarkers,
        savedOpponentMarkersByPitch,
        drawLines,
        savedDrawLinesByPitch,
        animationFrames,
      },
      metadata,
    );
  };

  const saveCurrentLineupToSupabase = async () => {
    if (!supabase) {
      setLockerStatus(copy.supabaseMissing);
      showToast(copy.supabaseMissing, "error");
      return;
    }
    if (!user) {
      openAuthForSave();
      return;
    }

    setLockerStatus("");
    setIsLockerLoading(true);
    const savedAt = new Date().toISOString();
    const displayName = lineupName.trim() || `${copy.pitchLabels[pitchSize]} ${new Date(savedAt).toLocaleString()}`;
    const thumbnailDataUrl = createLineupThumbnail({
      players: activePlayers,
      opponentMarkers,
      drawLines,
      showAllCanvasObjects,
      playerLabel: copy.player,
    });

    const { error } = await saveLineupRecordToSupabase({
      supabase,
      user,
      name: displayName,
      format: "unified",
      playersData: getCurrentLineupState({ thumbnailDataUrl, savedAt }),
    });

    if (error) {
      const message = getErrorMessage(error);
      setLockerStatus(message);
      showToast(message, "error");
    } else {
      setLineupName("");
      setLockerCategory("all");
      setLockerStatus(copy.saved);
      showToast(copy.saved);
      await fetchSavedLineups();
    }
    setIsLockerLoading(false);
  };

  const handleSaveCurrentLineup = () => {
    if (!user) {
      openAuthForSave();
      return;
    }
    void saveCurrentLineupToSupabase();
  };

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
      setCurrentMode("ANIMATION");
      setActiveTool("ANIMATION_TOOL");
      setActiveBottomSheetTool("ANIMATION_TOOL");
      setActiveTab("lineup");
      setLockerStatus("");
      return;
    }

    const lineupData = data as StoredLineupState<FormationKey>;
    if (!lineupData || !isPitchSize(lineupData.pitchSize) || !isFormationKey(lineupData.formation) || !Array.isArray(lineupData.players)) {
      setLockerStatus(copy.invalidLineupData);
      showToast(copy.invalidLineupData, "error");
      return;
    }

    setPitchSize(lineupData.pitchSize);
    setFormation(lineupData.formation);
    setCustomCount(clampCustomCount(lineupData.customCount));
    setPlayers(lineupData.players);
    setSavedPlayersByPitch(lineupData.savedPlayersByPitch ?? {});
    setSavedFormationByPitch(lineupData.savedFormationByPitch ?? {});
    setSavedCustomCountByPitch(lineupData.savedCustomCountByPitch ?? {});
    setOpponentMarkers(Array.isArray(lineupData.opponentMarkers) ? lineupData.opponentMarkers : createOpponentMarkers());
    setSavedOpponentMarkersByPitch(lineupData.savedOpponentMarkersByPitch ?? {});
    setDrawLines(Array.isArray(lineupData.drawLines) ? lineupData.drawLines : []);
    setSavedDrawLinesByPitch(lineupData.savedDrawLinesByPitch ?? {});
    const loadedMode = lineupData.currentMode ?? (lineupData.pitchSize === "custom" ? "CUSTOM" : "LINEUP");
    const loadedTool = loadedMode === "ANIMATION" ? "ANIMATION_TOOL" : "PERSONNEL_TOOL";
    setCurrentMode(loadedMode);
    setActiveTool(loadedTool);
    setActiveBottomSheetTool(loadedTool);
    if (Array.isArray(lineupData.animationFrames)) {
      useTacticalStore.setState({
        frames: cloneTacticalFrames(lineupData.animationFrames),
        draftFrame: cloneTacticalFrame(lineupData.animationFrames[0] ?? createInitialTacticalFrame()),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      });
    }
    setRedoDrawLines([]);
    setIsDrawMode(false);
    setActiveTab("lineup");
    setLockerStatus("");
  };

  const shareSavedLineup = async (lineup: SavedLineupRecord<FormationKey>) => {
    const data = lineup.players_data;
    if ("kind" in data && data.kind === "tactics") {
      showToast(copy.invalidLineupData, "error");
      return;
    }

    const lineupData = data as StoredLineupState<FormationKey>;
    if (!lineupData || !isPitchSize(lineupData.pitchSize) || !isFormationKey(lineupData.formation) || !Array.isArray(lineupData.players)) {
      showToast(copy.invalidLineupData, "error");
      return;
    }

    const url = createSavedLineupShareUrl(lineupData, window.location.href);
    const copied = await copyTextOrPrompt(url.toString(), copy.share);
    if (copied) {
      showToast(copy.copied);
    }
  };

  return {
    handleSaveCurrentLineup,
    loadSavedLineup,
    shareSavedLineup,
  };
}
