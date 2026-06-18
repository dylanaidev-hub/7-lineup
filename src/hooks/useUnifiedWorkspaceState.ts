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
import { getInitialAppTab, getPitchSizeFromUrl, type AppTab, type PitchSize } from "../appRouting";
import { clampCustomCount, type SharedLineup } from "../lineupShare";
import type { WorkspaceMode } from "../stores/tacticalStore";

export type Language = "vi" | "en";

export function useUnifiedWorkspaceState(
  sharedLineup: SharedLineup<FormationKey> | null,
  initialLanguage: Language,
) {
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

    return {
      pitchSize,
      formation,
      customCount,
      players,
      opponentMarkers,
      drawLines,
      mode: getInitialWorkspaceMode(sharedLineup, pitchSize),
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
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isMobileSquadDrawerOpen, setIsMobileSquadDrawerOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [selectedMobilePlayerId, setSelectedMobilePlayerId] = useState(1);
  const [activeTab, setActiveTab] = useState<AppTab>(() => getInitialAppTab());
  const [currentMode, setCurrentMode] = useState<WorkspaceMode>(initial.mode);
  const initialTool: CanvasTool = initial.mode === "ANIMATION" ? "ANIMATION_TOOL" : "PERSONNEL_TOOL";
  const [activeTool, setActiveTool] = useState<CanvasTool>(initialTool);
  const [activeBottomSheetTool, setActiveBottomSheetTool] = useState<CanvasTool | null>(initialTool);
  const [language, setLanguage] = useState<Language>(initialLanguage);
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
    activeTab,
    setActiveTab,
    currentMode,
    setCurrentMode,
    activeTool,
    setActiveTool,
    activeBottomSheetTool,
    setActiveBottomSheetTool,
    language,
    setLanguage,
    activePlayers,
    benchCount,
    pitchRef,
    drawLayerRef,
    frameListRef,
  };
}
