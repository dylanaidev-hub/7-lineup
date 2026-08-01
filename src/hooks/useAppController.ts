import React, { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import type { CanvasTool } from "../CanvasToolSidebar";
import {
  formationsBySize,
  getDefaultFormation,
  getDisplayPosition,
  getRegisteredNames,
  getZoneName,
  isFormationKey,
  pitchOptions,
  type FormationKey,
} from "../formationData";
import { isPitchSize, type PitchSize } from "../appRouting";
import { useAnimationPlaybackControls } from "./useAnimationPlaybackControls";
import { useAppRouting } from "./useAppRouting";
import { useAuth } from "./useAuth";
import { useDrawingControls } from "./useDrawingControls";
import { useLineupExportActions } from "./useLineupExportActions";
import { useLineupDragControls } from "./useLineupDragControls";
import { useLockerRoomData, type LockerCategory } from "./useLockerRoomData";
import { useLineupStorageActions } from "./useLineupStorageActions";
import { useLineupRestoreActions } from "./useLineupRestoreActions";
import { useOutsidePointerDown } from "./useOutsidePointerDown";
import { usePasswordRecoveryFlow } from "./usePasswordRecoveryFlow";
import { useProfile } from "./useProfile";
import { useSquadEditorControls } from "./useSquadEditorControls";
import { useToasts } from "./useToasts";
import { useWorkspaceControls } from "./useWorkspaceControls";
import { useHorizontalDragScroll } from "./useHorizontalDragScroll";
import { useUnifiedWorkspaceState } from "./useUnifiedWorkspaceState";
import { useLanguage } from "../LanguageContext";
import { useTacticalWorkspaceSync } from "./useTacticalWorkspaceSync";
import { decodeSharePayload } from "../lineupShare";
import type { SavedLineupRecord } from "../lineupState";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import {
  getSavedLineupDateTime as getSavedLineupDateTimeValue,
  getSavedLineupFormatLabel as getSavedLineupFormatLabelValue,
  getSavedLineupThumbnail as getSavedLineupThumbnailValue,
} from "../lockerDisplay";
import { tacticalStorageKey, useTacticalStore, type WorkspaceMode } from "../stores/tacticalStore";
import { copyByLanguage, getSupabaseErrorMessage, localizeError } from "../appI18n";
import {
  cloneTacticalFrame,
  createTacticalFrameFromWorkspace,
  defaultBallMarker,
  type TacticalFrame,
} from "../tacticalData";

type SandboxTool = CanvasTool;

const lineupStorageKey = "lineup-football-default-state-v1";

const pitchSizes: PitchSize[] = [5, 7, 11];

const getSharedLineupFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get("lineup");
  return value
    ? decodeSharePayload<FormationKey>(value, {
        isPitchSize,
        isFormationKey,
        hasFormation: (pitchSize, formation) => Boolean(formationsBySize[pitchSize][formation]),
      })
    : null;
};

export function useAppController() {
  const { language, setLanguage, toggleLanguage, languageMeta } = useLanguage();
  const { user, isAuthLoading, signOut, isPasswordRecovery, authHashError, clearPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const isRecoveryExpiryError = Boolean(
    authHashError && /otp|recovery|expired|invalid/i.test(`${authHashError.code} ${authHashError.description}`),
  );
  const sharedLineup = useMemo(() => getSharedLineupFromUrl(), []);
  const {
    pitchSize, setPitchSize, formation, setFormation, customCount, setCustomCount, players, setPlayers,
    savedPlayersByPitch, setSavedPlayersByPitch, savedFormationByPitch, setSavedFormationByPitch,
    savedCustomCountByPitch, setSavedCustomCountByPitch, opponentMarkers, setOpponentMarkers,
    savedOpponentMarkersByPitch, setSavedOpponentMarkersByPitch, drawLines, setDrawLines,
    savedDrawLinesByPitch, setSavedDrawLinesByPitch, isDrawMode, setIsDrawMode,
    isMobileSquadDrawerOpen, setIsMobileSquadDrawerOpen, copyStatus, setCopyStatus,
    selectedMobilePlayerId, setSelectedMobilePlayerId, selectedMobilePlayer, activeTab, setActiveTab,
    currentMode, setCurrentMode, activeTool, setActiveTool, activeBottomSheetTool, setActiveBottomSheetTool,
    activePlayers, benchCount, pitchRef, drawLayerRef, frameListRef,
  } = useUnifiedWorkspaceState(sharedLineup);
  const [isLineupMenuOpen, setIsLineupMenuOpen] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState<"sign_in" | "sign_up" | "reset">("sign_in");
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [lineupName, setLineupName] = useState("");
  const { toasts, notifications, showToast } = useToasts();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const lineupMenuRef = useRef<HTMLDivElement>(null);
  const workspaceBallMarkerRef = useRef({ ...defaultBallMarker });
  const workspaceInitialFrameRef = useRef<TacticalFrame | null>(null);
  const copy = copyByLanguage[language];
  const {
    savedLineups,
    setSavedLineups,
    lockerCategory,
    setLockerCategory,
    lockerStatus,
    setLockerStatus,
    isLockerLoading,
    setIsLockerLoading,
    deletingLineupId,
    fetchSavedLineups,
    deleteSavedLineup,
  } = useLockerRoomData<SavedLineupRecord<FormationKey>>({
    user,
    copy,
    getErrorMessage: (error) => getSupabaseErrorMessage(error as { code?: string; message?: string }, copy),
    showToast,
  });
  const {
    profileUsername,
    profileAvatarUrl,
    profileBio,
    profileFavoriteTeam,
    profileFavoritePosition,
    profileLocation,
    isAvatarUploading,
    isProfileLoading,
    avatarInputRef,
    setProfileUsername,
    setProfileBio,
    setProfileFavoriteTeam,
    setProfileFavoritePosition,
    setProfileLocation,
    fetchProfile,
    updateProfile,
    handleAvatarFileChange,
  } = useProfile({
    user,
    copy,
    setLockerStatus,
    showToast,
    getErrorMessage: (error) => getSupabaseErrorMessage(error as { code?: string; message?: string }, copy),
  });
  const {
    recoveryPassword,
    recoveryConfirm,
    recoveryStatus,
    recoveryDone,
    isRecoverySubmitting,
    setRecoveryPassword,
    setRecoveryConfirm,
    handleUpdatePassword,
    closeRecoveryScreen,
    requestNewResetLink,
    openSignInFromRecovery,
  } = usePasswordRecoveryFlow({
    copy,
    clearPasswordRecovery,
    localizeError: (message) => localizeError(message, copy),
    onOpenReset: () => {
      setAuthDialogMode("reset");
      setIsAuthScreenOpen(true);
    },
    onOpenSignIn: () => {
      setAuthDialogMode("sign_in");
      setIsAuthScreenOpen(true);
    },
  });
  const {
    frames: animationFrames, draftFrame, playbackFrames, currentFrameIndex, isPlaying, isLooping,
    selectFrame, addFrame, removeFrame, clearFrames, updateMarker: updateTacticalMarker,
    commitDraftIfChanged, toggleLoop, play, pause, stop, nextFrame, animationMarkerMap,
    animationOpponentMarkers, ballMarker, isBallOnPitch, isPersonnelTool, isDrawTool,
    isAnimationTool, showMarkerTray, showDrawTools, showDrawSheet, showAnimationTimeline,
  } = useTacticalWorkspaceSync({
    sharedLineup,
    currentMode,
    activeTool,
    activeBottomSheetTool,
    players,
    opponentMarkers,
  });
  const showAllCanvasObjects = true;
  useEffect(() => {
    if (isAnimationTool || isPlaying || !ballMarker) return;
    workspaceBallMarkerRef.current = { ...ballMarker };
  }, [ballMarker, isAnimationTool, isPlaying]);
  const {
    redoDrawLines,
    setRedoDrawLines,
    startDrawing,
    continueDrawing,
    stopDrawing,
    undoDrawLine,
    redoDrawLine,
    clearDrawLines,
  } = useDrawingControls({
    drawLayerRef,
    isDrawMode,
    showDrawTools,
    setDrawLines,
  });
  const {
    draggingId,
    draggingOpponentId,
    draggingTacticalMarkerId,
    dragPreview,
    clearDragState,
    handleDragStart,
    handleDragMove,
    stopDragging,
    handleOpponentDragStart,
    handleOpponentDragMove,
    stopOpponentDragging,
    handleTacticalMarkerPointerDown,
    handleTacticalMarkerPointerMove,
    stopTacticalMarkerDragging,
  } = useLineupDragControls({
    pitchRef,
    pitchSize,
    isDrawMode,
    isAnimationTool,
    isPersonnelTool,
    isPlaying,
    ballMarker,
    updateTacticalMarker,
    setPlayers,
    setCustomCount,
    setOpponentMarkers,
  });
  const { playAnimationFromStart, stopAnimationPlayback } = useAnimationPlaybackControls({
    isAnimationTool,
    isPlaying,
    currentFrameIndex,
    nextFrame,
    commitDraftIfChanged,
    stop,
  });
  const { handleSaveCurrentLineup, shareSavedLineup } = useLineupStorageActions({
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
    getErrorMessage: (error) => getSupabaseErrorMessage(error as { code?: string; message?: string }, copy),
    showToast,
    setAuthDialogMode,
    setIsAuthScreenOpen,
    setLockerStatus,
    setIsLockerLoading,
    setLineupName,
    setLockerCategory,
  });
  const { loadSavedLineup } = useLineupRestoreActions({
    invalidMessage: copy.invalidLineupData,
    showToast,
    setLockerStatus,
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
  });
  const { copyShareLink, downloadLineupImage } = useLineupExportActions({
    copy,
    pitchRef,
    pitchSize,
    formation,
    customCount,
    players,
    activePlayers,
    opponentMarkers,
    drawLines,
    currentMode,
    showAllCanvasObjects,
    showAnimationTimeline,
    ballMarker,
    setCopyStatus,
    showToast,
  });
  const { renamePlayer, renameExtraPlayer, addPlayerInput, removeExtraPlayerInput, applyCustomCount } =
    useSquadEditorControls({
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
    });
  const { applyPitchSize, resetPositions, resetWorkspace } = useWorkspaceControls({
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
  });
  const lockerCategories: { value: LockerCategory; label: string }[] = [
    { value: "all", label: copy.allCategories },
    { value: "5", label: copy.pitchLabels[5] },
    { value: "7", label: copy.pitchLabels[7] },
    { value: "11", label: copy.pitchLabels[11] },
    { value: "custom", label: copy.pitchLabels.custom },
    { value: "tactics", label: copy.tacticsTab },
  ];
  const filteredSavedLineups =
    lockerCategory === "all" ? savedLineups : savedLineups.filter((lineup) => lineup.format === lockerCategory);

  useEffect(() => {
    document.title = "doihinhsanco";
  }, []);

  const frameListDrag = useHorizontalDragScroll(frameListRef, "[data-frame-delete]");

  const selectFrameFromList = (index: number) => {
    if (frameListDrag.didMove()) return;
    selectFrame(index);
  };

  const applySandboxTool = (nextTool: SandboxTool) => {
    if (activeTool === nextTool && activeBottomSheetTool === nextTool) {
      setActiveBottomSheetTool(null);
      return;
    }

    const nextMode: WorkspaceMode =
      nextTool === "ANIMATION_TOOL" ? "ANIMATION" : nextTool === "DRAW_TOOL" ? "CUSTOM" : "LINEUP";
    if (nextTool === "ANIMATION_TOOL") {
      const currentBallMarker =
        useTacticalStore.getState().draftFrame.find((marker) => marker.type === "ball") ?? defaultBallMarker;
      workspaceBallMarkerRef.current = { ...currentBallMarker };
      const workspaceFrame = createTacticalFrameFromWorkspace(players, opponentMarkers, currentBallMarker);
      workspaceInitialFrameRef.current = cloneTacticalFrame(workspaceFrame);
      useTacticalStore.setState({
        draftFrame: cloneTacticalFrame(workspaceFrame),
        currentFrameIndex: useTacticalStore.getState().frames.length,
        isPlaying: false,
        playbackFrames: null,
      });
    } else if (activeTool === "ANIMATION_TOOL") {
      const workspaceInitialFrame =
        workspaceInitialFrameRef.current ??
        createTacticalFrameFromWorkspace(players, opponentMarkers, workspaceBallMarkerRef.current);
      const initialBallMarker = workspaceInitialFrame.find((marker) => marker.type === "ball") ?? defaultBallMarker;
      workspaceBallMarkerRef.current = { ...initialBallMarker };
      useTacticalStore.setState({
        draftFrame: cloneTacticalFrame(workspaceInitialFrame),
        currentFrameIndex: useTacticalStore.getState().frames.length,
        isPlaying: false,
        playbackFrames: null,
      });
      workspaceInitialFrameRef.current = null;
    }
    setActiveTool(nextTool);
    setActiveBottomSheetTool(nextTool);
    setCurrentMode(nextMode);
    setActiveTab("lineup");
    setIsLineupMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsDrawMode(nextTool === "DRAW_TOOL");
    useTacticalStore.setState({
      currentMode: nextMode,
      isAnimationMode: nextMode === "ANIMATION",
      isPlaying: false,
      playbackFrames: null,
    });
  };

  useEffect(() => {
    try {
      window.localStorage.removeItem(lineupStorageKey);
      window.localStorage.removeItem(tacticalStorageKey);
    } catch {
      // Ignore storage access errors in restricted browsing modes.
    }
  }, []);

  useOutsidePointerDown([
    { ref: userMenuRef, isOpen: isUserMenuOpen, onClose: () => setIsUserMenuOpen(false) },
    { ref: lineupMenuRef, isOpen: isLineupMenuOpen, onClose: () => setIsLineupMenuOpen(false) },
  ]);

  const getSavedLineupFormatLabel = (lineup: SavedLineupRecord<FormationKey>) => {
    return getSavedLineupFormatLabelValue(lineup, { pitchLabels: copy.pitchLabels, tacticsLabel: copy.tacticsTab });
  };
  const getSavedLineupThumbnail = getSavedLineupThumbnailValue;
  const getSavedLineupDateTime = getSavedLineupDateTimeValue;

  const { switchAppTab } = useAppRouting({
    pitchSize,
    applyPitchSize,
    setActiveTab,
    setCurrentMode,
    setActiveTool,
    setActiveBottomSheetTool,
    setIsLineupMenuOpen,
    setIsUserMenuOpen,
  });

  return {
    copy,
    user,
    languageMeta,
    isUserMenuOpen,
    userMenuRef,
    setLanguage,
    toggleLanguage,
    setAuthDialogMode,
    setIsAuthScreenOpen,
    setIsUserMenuOpen,
    switchAppTab,
    signOut,
    navigate,
    language,
    authHashError,
    isPasswordRecovery,
    isRecoveryExpiryError,
    isAuthScreenOpen,
    recoveryDone,
    recoveryPassword,
    recoveryConfirm,
    recoveryStatus,
    isRecoverySubmitting,
    authDialogMode,
    setRecoveryPassword,
    setRecoveryConfirm,
    handleUpdatePassword,
    closeRecoveryScreen,
    requestNewResetLink,
    openSignInFromRecovery,
    activeTab,
    profileUsername,
    profileAvatarUrl,
    profileBio,
    profileFavoriteTeam,
    profileFavoritePosition,
    profileLocation,
    isAvatarUploading,
    isProfileLoading,
    avatarInputRef,
    handleAvatarFileChange,
    setProfileUsername,
    setProfileBio,
    setProfileFavoriteTeam,
    setProfileFavoritePosition,
    setProfileLocation,
    updateProfile,
    savedLineups,
    lockerCategories,
    lockerCategory,
    filteredSavedLineups,
    deletingLineupId,
    getSavedLineupFormatLabel,
    getSavedLineupThumbnail,
    getSavedLineupDateTime,
    setLockerCategory,
    loadSavedLineup,
    shareSavedLineup,
    deleteSavedLineup,
    activePlayers,
    benchCount,
    renamePlayer,
    renameExtraPlayer,
    addPlayerInput,
    removeExtraPlayerInput,
    isAnimationTool,
    isDrawMode,
    pitchSize,
    lockerStatus,
    isLockerLoading,
    handleSaveCurrentLineup,
    resetWorkspace,
    selectedMobilePlayer,
    setSelectedMobilePlayerId,
    activeBottomSheetTool,
    draggingId,
    draggingOpponentId,
    draggingTacticalMarkerId,
    showMarkerTray,
    showAnimationTimeline,
    applySandboxTool,
    players,
    opponentMarkers,
    ballMarker,
    isBallOnPitch,
    handleDragStart,
    handleDragMove,
    stopDragging,
    handleOpponentDragStart,
    handleOpponentDragMove,
    stopOpponentDragging,
    handleTacticalMarkerPointerDown,
    handleTacticalMarkerPointerMove,
    stopTacticalMarkerDragging,
    pitchRef,
    drawLayerRef,
    animationOpponentMarkers,
    animationMarkerMap,
    drawLines,
    showDrawTools,
    isPlaying,
    startDrawing,
    continueDrawing,
    stopDrawing,
    isMobileSquadDrawerOpen,
    setIsMobileSquadDrawerOpen,
    animationFrames,
    currentFrameIndex,
    isLooping,
    playbackFrames,
    frameListRef,
    playAnimationFromStart,
    pause,
    stopAnimationPlayback,
    toggleLoop,
    clearFrames,
    selectFrameFromList,
    removeFrame,
    addFrame,
    frameListDrag,
    showDrawSheet,
    redoDrawLines,
    undoDrawLine,
    redoDrawLine,
    clearDrawLines,
    copyStatus,
    copyShareLink,
    downloadLineupImage,
    dragPreview,
    toasts,
    notifications,
    showToast,
    showAllCanvasObjects,
  };
}
