import type { Dispatch, SetStateAction } from "react";
import type { CanvasTool } from "../CanvasToolSidebar";
import {
  createOpponentMarkers,
  createPlayers,
  type DrawLine,
  type FormationKey,
  type FormationPlayer,
  type OpponentMarker,
} from "../formationData";
import { clampCustomCount } from "../lineupShare";
import type { PitchSize } from "../appRouting";
import type { WorkspaceMode } from "../stores/tacticalStore";

type PlayerNameField = "starterName" | "substituteName";

type UseSquadEditorControlsOptions = {
  setPitchSize: Dispatch<SetStateAction<PitchSize>>;
  setFormation: Dispatch<SetStateAction<FormationKey>>;
  setCustomCount: Dispatch<SetStateAction<number>>;
  setPlayers: Dispatch<SetStateAction<FormationPlayer[]>>;
  setOpponentMarkers: Dispatch<SetStateAction<OpponentMarker[]>>;
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
  setRedoDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
  setCurrentMode: Dispatch<SetStateAction<WorkspaceMode>>;
  setActiveTool: Dispatch<SetStateAction<CanvasTool>>;
  setActiveBottomSheetTool: Dispatch<SetStateAction<CanvasTool | null>>;
};

export function useSquadEditorControls({
  setPitchSize,
  setFormation,
  setCustomCount,
  setPlayers,
  setOpponentMarkers,
  setDrawLines,
  setRedoDrawLines,
  setIsDrawMode,
  setCurrentMode,
  setActiveTool,
  setActiveBottomSheetTool,
}: UseSquadEditorControlsOptions) {
  const renamePlayer = (id: number, field: PlayerNameField, name: string) => {
    setPlayers((current) => current.map((player) => (player.id === id ? { ...player, [field]: name } : player)));
  };

  const renameExtraPlayer = (id: number, index: number, name: string) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? {
              ...player,
              extraNames: player.extraNames.map((extraName, extraIndex) => (extraIndex === index ? name : extraName)),
            }
          : player,
      ),
    );
  };

  const addPlayerInput = (id: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id && player.extraNames.length < 1
          ? { ...player, extraNames: [...player.extraNames, ""] }
          : player,
      ),
    );
  };

  const removeExtraPlayerInput = (id: number, index: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? { ...player, extraNames: player.extraNames.filter((_, extraIndex) => extraIndex !== index) }
          : player,
      ),
    );
  };

  const applyCustomCount = (nextCount: number) => {
    const count = clampCustomCount(nextCount);
    setCustomCount(count);
    setPitchSize("custom");
    setFormation("custom");
    setCurrentMode("CUSTOM");
    setActiveTool("PERSONNEL_TOOL");
    setActiveBottomSheetTool("PERSONNEL_TOOL");
    setPlayers((current) => createPlayers("custom", "custom", count, current));
    setOpponentMarkers(createOpponentMarkers());
    setDrawLines([]);
    setRedoDrawLines([]);
    setIsDrawMode(false);
  };

  return {
    renamePlayer,
    renameExtraPlayer,
    addPlayerInput,
    removeExtraPlayerInput,
    applyCustomCount,
  };
}
