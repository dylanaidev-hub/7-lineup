import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import type { PitchSize } from "../appRouting";
import type { DrawLine, FormationKey, FormationPlayer, OpponentMarker } from "../formationData";
import { saveLineupRecord } from "../lineupRepository";
import { isStoredLineupState, serializeLineupState } from "../lineupSerializer";
import type { SavedLineupRecord } from "../lineupState";
import { createLineupThumbnail } from "../lineupThumbnail";
import { createSavedLineupShareUrl } from "../savedLineupShare";
import { copyTextOrPrompt } from "../shareUtils";
import { useTacticalStore, type WorkspaceMode } from "../stores/tacticalStore";
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
  copiedShortLink: string;
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
}: UseLineupStorageActionsOptions) {
  const openAuthForSave = () => {
    setAuthDialogMode("sign_in");
    setIsAuthScreenOpen(true);
  };

  const getCurrentLineupState = (metadata: { thumbnailDataUrl?: string; savedAt?: string } = {}) => {
    const animationFrames = useTacticalStore.getState().commitDraftIfChanged();
    return serializeLineupState(
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
      },
      animationFrames,
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

    const { error } = await saveLineupRecord({
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

  const shareSavedLineup = async (lineup: SavedLineupRecord<FormationKey>) => {
    const data = lineup.players_data;
    if ("kind" in data && data.kind === "tactics") {
      showToast(copy.invalidLineupData, "error");
      return;
    }

    if (!isStoredLineupState(data)) {
      showToast(copy.invalidLineupData, "error");
      return;
    }

    const { url, isShortLink } = await createSavedLineupShareUrl(data, window.location.href);
    const copied = await copyTextOrPrompt(url.toString(), copy.share);
    if (copied) {
      showToast(isShortLink ? copy.copiedShortLink : copy.copied);
    }
  };

  return {
    handleSaveCurrentLineup,
    shareSavedLineup,
  };
}
