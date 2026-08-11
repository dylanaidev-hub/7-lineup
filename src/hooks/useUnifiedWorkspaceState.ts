import { useMemo, useRef, useState } from "react";
import type { CanvasTool } from "../CanvasToolSidebar";
import {
  createDrawLinesFromSharedLineup,
  createOpponentMarkers,
  createOpponentMarkersFromSharedLineup,
  createPlayers,
  createPlayersFromSharedLineup,
  getBenchCount,
  getInitialWorkspaceMode,
  type DrawLine,
  type FormationKey,
  type FormationPlayer,
  type OpponentMarker,
} from "../formationData";
import { getPitchSizeFromUrl, type PitchSize } from "../appRouting";
import { clampCustomCount, type SharedLineup } from "../lineupShare";
import type { WorkspaceMode } from "../stores/tacticalStore";
import type { Language } from "../languagePreference";

export type { Language };

export function useUnifiedWorkspaceState(sharedLineup: SharedLineup<FormationKey> | null) {
  const initial = useMemo(() => {
    const pitchSize = sharedLineup?.pitchSize ?? getPitchSizeFromUrl() ?? 7;
    const formation = sharedLineup?.formation ?? "2-3-1";
    const customCount = sharedLineup ? clampCustomCount(sharedLineup.customCount) : 0;
    const players = sharedLineup
      ? createPlayersFromSharedLineup(sharedLineup)
      : createPlayers(pitchSize, formation, customCount || 5);
    const opponentMarkers =
      sharedLineup?.version === 2 || sharedLineup?.pitchSize === "custom"
        ? createOpponentMarkersFromSharedLineup(sharedLineup)
        : createOpponentMarkers();
    const drawLines =
      sharedLineup?.version === 2 || sharedLineup?.pitchSize === "custom"
        ? createDrawLinesFromSharedLineup(sharedLineup)
        : [];
    const requestedTool = new URLSearchParams(window.location.search).get("tool");
    const tool: CanvasTool =
      requestedTool === "animation"
        ? "ANIMATION_TOOL"
        : requestedTool === "draw"
          ? "DRAW_TOOL"
          : "PERSONNEL_TOOL";
    const mode: WorkspaceMode =
      tool === "ANIMATION_TOOL"
        ? "ANIMATION"
        : tool === "DRAW_TOOL"
          ? "CUSTOM"
          : getInitialWorkspaceMode(sharedLineup, pitchSize);

    return {
      pitchSize,
      formation,
      customCount,
      players,
      opponentMarkers,
      drawLines,
      mode,
      tool,
    };
  }, [sharedLineup]);

  const [pitchSize, setPitchSize] = useState<PitchSize>(initial.pitchSize);
  const [formation, setFormation] = useState<FormationKey>(initial.formation);
  const [customCount, setCustomCount] = useState(initial.customCount);
  const [players, setPlayers] = useState<FormationPlayer[]>(initial.players);
  const [savedPlayersByPitch, setSavedPlayersByPitch] = useState<Partial<Record<PitchSize, FormationPlayer[]>>>({
    [initial.pitchSize]: initial.players,
  });
  const [savedFormationByPitch, setSavedFormationByPitch] = useState<Partial<Record<PitchSize, FormationKey>>>({
    [initial.pitchSize]: initial.formation,
  });
  const [savedCustomCountByPitch, setSavedCustomCountByPitch] = useState<Partial<Record<PitchSize, number>>>({
    [initial.pitchSize]: initial.customCount,
  });
  const [opponentMarkers, setOpponentMarkers] = useState<OpponentMarker[]>(initial.opponentMarkers);
  const [savedOpponentMarkersByPitch, setSavedOpponentMarkersByPitch] = useState<
    Partial<Record<PitchSize, OpponentMarker[]>>
  >({ [initial.pitchSize]: initial.opponentMarkers });
  const [drawLines, setDrawLines] = useState<DrawLine[]>(initial.drawLines);
  const [savedDrawLinesByPitch, setSavedDrawLinesByPitch] = useState<Partial<Record<PitchSize, DrawLine[]>>>({
    [initial.pitchSize]: initial.drawLines,
  });
  const [isDrawMode, setIsDrawMode] = useState(initial.tool === "DRAW_TOOL");
  const [isMobileSquadDrawerOpen, setIsMobileSquadDrawerOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [selectedMobilePlayerId, setSelectedMobilePlayerId] = useState(1);
  const [currentMode, setCurrentMode] = useState<WorkspaceMode>(initial.mode);
  const initialTool = initial.tool;
  const [activeTool, setActiveTool] = useState<CanvasTool>(initialTool);
  const [activeBottomSheetTool, setActiveBottomSheetTool] = useState<CanvasTool | null>(() => {
    if (typeof window === "undefined") return initialTool;
    return window.matchMedia("(max-width: 1024px)").matches ? null : initialTool;
  });
  const pitchRef = useRef<HTMLDivElement>(null);
  const drawLayerRef = useRef<SVGSVGElement>(null);
  const frameListRef = useRef<HTMLDivElement>(null);

  const activePlayers = useMemo(() => players.filter((player) => player.onPitch), [players]);
  const benchCount = useMemo(() => getBenchCount(activePlayers), [activePlayers]);
  const selectedMobilePlayer =
    activePlayers.find((player) => player.id === selectedMobilePlayerId) ?? activePlayers[0] ?? null;

  return {
    pitchSize,
    setPitchSize,
    formation,
    setFormation,
    customCount,
    setCustomCount,
    players,
    setPlayers,
    savedPlayersByPitch,
    setSavedPlayersByPitch,
    savedFormationByPitch,
    setSavedFormationByPitch,
    savedCustomCountByPitch,
    setSavedCustomCountByPitch,
    opponentMarkers,
    setOpponentMarkers,
    savedOpponentMarkersByPitch,
    setSavedOpponentMarkersByPitch,
    drawLines,
    setDrawLines,
    savedDrawLinesByPitch,
    setSavedDrawLinesByPitch,
    isDrawMode,
    setIsDrawMode,
    isMobileSquadDrawerOpen,
    setIsMobileSquadDrawerOpen,
    copyStatus,
    setCopyStatus,
    selectedMobilePlayerId,
    setSelectedMobilePlayerId,
    selectedMobilePlayer,
    currentMode,
    setCurrentMode,
    activeTool,
    setActiveTool,
    activeBottomSheetTool,
    setActiveBottomSheetTool,
    activePlayers,
    benchCount,
    pitchRef,
    drawLayerRef,
    frameListRef,
  };
}
