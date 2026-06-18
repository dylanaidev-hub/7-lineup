import { useEffect, useMemo } from "react";
import type { CanvasTool } from "../CanvasToolSidebar";
import type { FormationKey, FormationPlayer, OpponentMarker } from "../formationData";
import type { SharedLineup } from "../lineupShare";
import { useTacticalStore, type WorkspaceMode } from "../stores/tacticalStore";
import {
  cloneTacticalFrame,
  cloneTacticalFrames,
  createInitialTacticalFrame,
  createTacticalFrameFromWorkspace,
  defaultBallMarker,
} from "../tacticalData";

type Options = {
  sharedLineup: SharedLineup<FormationKey> | null;
  currentMode: WorkspaceMode;
  activeTool: CanvasTool;
  activeBottomSheetTool: CanvasTool | null;
  players: FormationPlayer[];
  opponentMarkers: OpponentMarker[];
};

export function useTacticalWorkspaceSync({
  sharedLineup,
  currentMode,
  activeTool,
  activeBottomSheetTool,
  players,
  opponentMarkers,
}: Options) {
  const store = useTacticalStore();
  const {
    frames: animationFrames,
    draftFrame,
    playbackFrames,
    currentFrameIndex,
    isPlaying,
  } = store;

  const activeAnimationFrame = playbackFrames
    ? (playbackFrames[currentFrameIndex] ?? playbackFrames[0])
    : currentFrameIndex < animationFrames.length
      ? (animationFrames[currentFrameIndex] ?? draftFrame)
      : draftFrame;
  const animationMarkerMap = useMemo(
    () => new Map(activeAnimationFrame.map((marker) => [marker.id, marker])),
    [activeAnimationFrame],
  );
  const animationOpponentMarkers = activeAnimationFrame
    .filter((marker) => marker.type === "opponent" && marker.onPitch)
    .map((marker) => ({ frameId: marker.id, id: Number(marker.id.replace("o", "")), x: marker.x, y: marker.y }))
    .filter((marker) => Number.isFinite(marker.id));
  const ballMarker = activeAnimationFrame.find((marker) => marker.type === "ball");
  const isAnimationTool = activeTool === "ANIMATION_TOOL";

  useEffect(() => {
    useTacticalStore.setState({ currentMode, isAnimationMode: currentMode === "ANIMATION" });
  }, [currentMode]);

  useEffect(() => {
    if (isAnimationTool || isPlaying || playbackFrames) return;
    const currentBall = useTacticalStore.getState().draftFrame.find((marker) => marker.type === "ball") ?? defaultBallMarker;
    useTacticalStore.setState({
      draftFrame: cloneTacticalFrame(createTacticalFrameFromWorkspace(players, opponentMarkers, currentBall)),
    });
  }, [isAnimationTool, isPlaying, opponentMarkers, playbackFrames, players]);

  useEffect(() => {
    if (!sharedLineup?.animationFrames?.length) return;
    useTacticalStore.setState({
      frames: cloneTacticalFrames(sharedLineup.animationFrames),
      draftFrame: cloneTacticalFrame(sharedLineup.animationFrames[0] ?? createInitialTacticalFrame()),
      playbackFrames: null,
      currentFrameIndex: 0,
      isPlaying: false,
    });
  }, [sharedLineup]);

  return {
    ...store,
    activeAnimationFrame,
    animationMarkerMap,
    animationOpponentMarkers,
    ballMarker,
    isBallOnPitch: Boolean(ballMarker?.onPitch),
    isPersonnelTool: activeTool === "PERSONNEL_TOOL",
    isDrawTool: activeTool === "DRAW_TOOL",
    isAnimationTool,
    showMarkerTray: activeBottomSheetTool === "PERSONNEL_TOOL",
    showDrawTools: activeTool === "DRAW_TOOL",
    showDrawSheet: activeBottomSheetTool === "DRAW_TOOL",
    showAnimationTimeline: activeBottomSheetTool === "ANIMATION_TOOL",
  };
}
