import React, { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { AnimationTimeline } from "./AnimationTimeline";
import { AppContent } from "./AppContent";
import { AppHeader } from "./AppHeader";
import { AppOverlays } from "./AppOverlays";
import type { CanvasTool } from "./CanvasToolSidebar";
import { DashboardShell } from "./DashboardShell";
import { LineupDragPreview } from "./DragPreview";
import { DrawControls } from "./DrawControls";
import {
  formationsBySize,
  getDefaultFormation,
  getDisplayPosition,
  getRegisteredNames,
  getZoneName,
  isFormationKey,
  pitchOptions,
  type FormationKey,
} from "./formationData";
import { LineupColumn } from "./LineupColumn";
import { LineupFooterActions } from "./LineupFooterActions";
import { LineupHeaderActions } from "./LineupHeaderActions";
import { LineupStage } from "./LineupStage";
import { LineupWorkspace } from "./LineupWorkspace";
import { LockerRoom } from "./LockerRoom";
import { MarkerTray } from "./MarkerTray";
import { PitchField } from "./PitchField";
import { ProfileView } from "./ProfileView";
import { MobilePlayerEditor, MobileSquadDrawer, SquadEditor } from "./SquadEditor";
import { ToastStack } from "./ToastStack";
import { isPitchSize, type PitchSize } from "./appRouting";
import { useAnimationPlaybackControls } from "./hooks/useAnimationPlaybackControls";
import { useAppRouting } from "./hooks/useAppRouting";
import { useAuth } from "./hooks/useAuth";
import { useDrawingControls } from "./hooks/useDrawingControls";
import { useLineupExportActions } from "./hooks/useLineupExportActions";
import { useLineupDragControls } from "./hooks/useLineupDragControls";
import { useLockerRoomData, type LockerCategory } from "./hooks/useLockerRoomData";
import { useLineupStorageActions } from "./hooks/useLineupStorageActions";
import { useOutsidePointerDown } from "./hooks/useOutsidePointerDown";
import { usePasswordRecoveryFlow } from "./hooks/usePasswordRecoveryFlow";
import { useProfile } from "./hooks/useProfile";
import { useSquadEditorControls } from "./hooks/useSquadEditorControls";
import { useToasts } from "./hooks/useToasts";
import { useWorkspaceControls } from "./hooks/useWorkspaceControls";
import { useHorizontalDragScroll } from "./hooks/useHorizontalDragScroll";
import { useUnifiedWorkspaceState, type Language } from "./hooks/useUnifiedWorkspaceState";
import { useTacticalWorkspaceSync } from "./hooks/useTacticalWorkspaceSync";
import { decodeSharePayload } from "./lineupShare";
import type { SavedLineupRecord } from "./lineupState";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import {
  getSavedLineupDateTime as getSavedLineupDateTimeValue,
  getSavedLineupFormatLabel as getSavedLineupFormatLabelValue,
  getSavedLineupThumbnail as getSavedLineupThumbnailValue,
} from "./lockerDisplay";
import { tacticalStorageKey, useTacticalStore, type WorkspaceMode } from "./stores/tacticalStore";
import { copyByLanguage, getSupabaseErrorMessage, localizeError } from "./appI18n";
import {
  cloneTacticalFrame,
  createTacticalFrameFromWorkspace,
  defaultBallMarker,
} from "./tacticalData";
import "./styles.css";

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

export default function App({ initialLanguage = "vi" }: { initialLanguage?: Language }) {
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
    language, setLanguage, activePlayers, benchCount, pitchRef, drawLayerRef, frameListRef,
  } = useUnifiedWorkspaceState(sharedLineup, initialLanguage);
  const [isLineupMenuOpen, setIsLineupMenuOpen] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState<"sign_in" | "sign_up" | "reset">("sign_in");
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [lineupName, setLineupName] = useState("");
  const { toasts, showToast } = useToasts();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const lineupMenuRef = useRef<HTMLDivElement>(null);
  const copy = copyByLanguage[language];
  const languageMeta =
    language === "vi" ? { flag: "🇻🇳", label: "VI", next: "en" as const } : { flag: "🇺🇸", label: "EN", next: "vi" as const };
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
    animationFrames,
    draftFrame,
    pitchSize,
    nextFrame,
    commitDraftIfChanged,
    stop,
    setPlayers,
    setOpponentMarkers,
  });
  const { handleSaveCurrentLineup, loadSavedLineup, shareSavedLineup } = useLineupStorageActions({
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
      const workspaceFrame = createTacticalFrameFromWorkspace(players, opponentMarkers, currentBallMarker);
      useTacticalStore.setState({
        draftFrame: cloneTacticalFrame(workspaceFrame),
        currentFrameIndex: useTacticalStore.getState().frames.length,
        isPlaying: false,
        playbackFrames: null,
      });
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

  return (
    <main className="match-bg min-h-screen p-4 text-slate-900 antialiased sm:p-6 lg:p-10">
      <AppHeader
        copy={copy}
        user={user}
        languageMeta={languageMeta}
        isUserMenuOpen={isUserMenuOpen}
        userMenuRef={userMenuRef}
        onSwitchLanguage={() => setLanguage(languageMeta.next)}
        onOpenSignIn={() => {
          setAuthDialogMode("sign_in");
          setIsAuthScreenOpen(true);
        }}
        onToggleUserMenu={() => setIsUserMenuOpen((current) => !current)}
        onOpenProfile={() => switchAppTab("profile")}
        onOpenLocker={() => switchAppTab("locker")}
        onSignOut={async () => {
          await signOut();
          navigate("/", { replace: true });
        }}
      />
      <AppOverlays
        copy={copy}
        language={language}
        authHashErrorMessage={authHashError ? localizeError(authHashError.description, copy) : null}
        isPasswordRecovery={isPasswordRecovery}
        hasAuthHashError={Boolean(authHashError)}
        isRecoveryExpiryError={isRecoveryExpiryError}
        isSupabaseConfigured={isSupabaseConfigured}
        recoveryDone={recoveryDone}
        recoveryPassword={recoveryPassword}
        recoveryConfirm={recoveryConfirm}
        recoveryStatus={recoveryStatus}
        isRecoverySubmitting={isRecoverySubmitting}
        isAuthScreenOpen={isAuthScreenOpen}
        authDialogMode={authDialogMode}
        onRecoveryPasswordChange={setRecoveryPassword}
        onRecoveryConfirmChange={setRecoveryConfirm}
        onSubmitRecovery={handleUpdatePassword}
        onCloseRecovery={closeRecoveryScreen}
        onRequestNewResetLink={requestNewResetLink}
        onOpenSignInFromRecovery={openSignInFromRecovery}
        onCloseAuth={() => setIsAuthScreenOpen(false)}
        onAuthenticated={() => setIsAuthScreenOpen(false)}
      />
      <DashboardShell isTacticsView={false}>
        <AppContent
          activeTab={activeTab}
          profileView={
          <ProfileView
            copy={copy}
            user={user}
            isSupabaseConfigured={isSupabaseConfigured}
            profileUsername={profileUsername}
            profileAvatarUrl={profileAvatarUrl}
            profileBio={profileBio}
            profileFavoriteTeam={profileFavoriteTeam}
            profileFavoritePosition={profileFavoritePosition}
            profileLocation={profileLocation}
            isAvatarUploading={isAvatarUploading}
            isProfileLoading={isProfileLoading}
            avatarInputRef={avatarInputRef}
            onAvatarFileChange={handleAvatarFileChange}
            onProfileUsernameChange={setProfileUsername}
            onProfileBioChange={setProfileBio}
            onProfileFavoriteTeamChange={setProfileFavoriteTeam}
            onProfileFavoritePositionChange={setProfileFavoritePosition}
            onProfileLocationChange={setProfileLocation}
            onUpdateProfile={updateProfile}
          />
          }
          lockerView={
          <LockerRoom
            copy={copy}
            savedLineupCount={savedLineups.length}
            categories={lockerCategories}
            activeCategory={lockerCategory}
            savedLineups={filteredSavedLineups}
            deletingLineupId={deletingLineupId}
            getFormatLabel={getSavedLineupFormatLabel}
            getThumbnail={getSavedLineupThumbnail}
            getDateTime={getSavedLineupDateTime}
            onCategoryChange={setLockerCategory}
            onLoadLineup={loadSavedLineup}
            onShareLineup={shareSavedLineup}
            onDeleteLineup={deleteSavedLineup}
          />
          }
          lineupView={
          <LineupWorkspace
            squadEditor={
              <SquadEditor
                copy={copy}
                players={activePlayers}
                benchCount={benchCount}
                getPositionLabel={(position) => getDisplayPosition(position, language)}
                onRenamePlayer={renamePlayer}
                onRenameExtraPlayer={renameExtraPlayer}
                onAddPlayerInput={addPlayerInput}
                onRemoveExtraPlayerInput={removeExtraPlayerInput}
              />
            }
            lineupColumn={
              <LineupColumn
              mode={isAnimationTool ? "animation" : isDrawMode ? "draw" : "personnel"}
              isCustomPitch={pitchSize === "custom"}
              header={
                <LineupHeaderActions
                  saveLabel={copy.save}
                  resetLabel={copy.reset}
                  savedLabel={copy.saved}
                  status={lockerStatus}
                  isSaving={isLockerLoading}
                  onSave={handleSaveCurrentLineup}
                  onReset={resetWorkspace}
                />
              }
              mobileEditor={
                <MobilePlayerEditor
                  copy={copy}
                  players={activePlayers}
                  selectedPlayer={selectedMobilePlayer}
                  getPositionLabel={(position) => getDisplayPosition(position, language)}
                  onSelectedPlayerChange={setSelectedMobilePlayerId}
                  onRenamePlayer={renamePlayer}
                  onRenameExtraPlayer={renameExtraPlayer}
                  onAddPlayerInput={addPlayerInput}
                  onRemoveExtraPlayerInput={removeExtraPlayerInput}
                />
              }
              stage={
                <LineupStage
                  mode={isAnimationTool ? "animation" : isDrawMode ? "draw" : "personnel"}
                  activeTool={activeBottomSheetTool}
                  drawLabel={copy.draw}
                  isDragging={draggingId !== null || draggingOpponentId !== null || draggingTacticalMarkerId !== null}
                  showMarkerTray={showMarkerTray}
                  showAnimationPanel={showAnimationTimeline}
                  onSelectTool={applySandboxTool}
                  markerTray={
                    showMarkerTray ? (
                      <MarkerTray
                        copy={copy}
                        players={players}
                        opponentMarkers={opponentMarkers}
                        ballMarker={ballMarker}
                        isBallOnPitch={isBallOnPitch}
                        onPlayerPointerDown={handleDragStart}
                        onPlayerPointerMove={handleDragMove}
                        onPlayerPointerEnd={stopDragging}
                        onOpponentPointerDown={handleOpponentDragStart}
                        onOpponentPointerMove={handleOpponentDragMove}
                        onOpponentPointerEnd={stopOpponentDragging}
                        onBallPointerDown={handleTacticalMarkerPointerDown}
                        onBallPointerMove={handleTacticalMarkerPointerMove}
                        onBallPointerEnd={stopTacticalMarkerDragging}
                      />
                    ) : null
                  }
                  pitch={
                    <PitchField
                      pitchRef={pitchRef}
                      drawLayerRef={drawLayerRef}
                      players={activePlayers}
                      opponentMarkers={isAnimationTool ? animationOpponentMarkers : opponentMarkers.filter((marker) => marker.onPitch)}
                      ballMarker={ballMarker}
                      animationMarkerMap={animationMarkerMap}
                      drawLines={drawLines}
                      isDrawMode={isDrawMode}
                      showDrawTools={showDrawTools}
                      isAnimationTool={isAnimationTool}
                      isPlaying={isPlaying}
                      showAllCanvasObjects={showAllCanvasObjects}
                      draggingPlayerId={draggingId}
                      draggingOpponentId={draggingOpponentId}
                      draggingBallId={draggingTacticalMarkerId}
                      labels={{ player: copy.player, dragPlayer: copy.dragPlayer, dragOpponent: copy.dragOpponent }}
                      getPositionLabel={(position) => getDisplayPosition(position, language)}
                      onStartDrawing={startDrawing}
                      onContinueDrawing={continueDrawing}
                      onStopDrawing={stopDrawing}
                      onPlayerPointerDown={handleDragStart}
                      onPlayerPointerMove={handleDragMove}
                      onPlayerPointerEnd={stopDragging}
                      onOpponentPointerDown={handleOpponentDragStart}
                      onOpponentPointerMove={handleOpponentDragMove}
                      onOpponentPointerEnd={stopOpponentDragging}
                      onBallPointerDown={handleTacticalMarkerPointerDown}
                      onBallPointerMove={handleTacticalMarkerPointerMove}
                      onBallPointerEnd={stopTacticalMarkerDragging}
                    />
                  }
                  mobileSquadDrawer={
                    <MobileSquadDrawer
                      copy={copy}
                      players={activePlayers}
                      isOpen={isMobileSquadDrawerOpen}
                      getPositionLabel={(position) => getDisplayPosition(position, language)}
                      onOpen={() => setIsMobileSquadDrawerOpen(true)}
                      onClose={() => setIsMobileSquadDrawerOpen(false)}
                      onRenamePlayer={renamePlayer}
                      onRenameExtraPlayer={renameExtraPlayer}
                      onAddPlayerInput={addPlayerInput}
                      onRemoveExtraPlayerInput={removeExtraPlayerInput}
                    />
                  }
                  animationTimeline={
                    showAnimationTimeline ? (
                      <AnimationTimeline
                        frames={animationFrames}
                        currentFrameIndex={currentFrameIndex}
                        isPlaying={isPlaying}
                        isLooping={isLooping}
                        isShowingPlayback={Boolean(playbackFrames)}
                        labels={{
                          tacticalTimeline: copy.tacticalTimeline,
                          framesUnit: copy.framesUnit,
                          frame: copy.frame,
                          addFrame: copy.addFrame,
                          clearAll: copy.clearAll,
                          delete: copy.delete,
                        }}
                        frameListRef={frameListRef}
                        onPlay={playAnimationFromStart}
                        onPause={pause}
                        onStop={stopAnimationPlayback}
                        onToggleLoop={toggleLoop}
                        onClearFrames={clearFrames}
                        onSelectFrame={selectFrameFromList}
                        onDeleteFrame={removeFrame}
                        onAddFrame={addFrame}
                        onFrameListPointerDown={frameListDrag.onPointerDown}
                        onFrameListPointerMove={frameListDrag.onPointerMove}
                        onFrameListPointerUp={frameListDrag.onPointerUp}
                        onFrameListPointerCancel={frameListDrag.onPointerCancel}
                      />
                    ) : null
                  }
                />
              }
              drawControls={
                showDrawSheet && isDrawMode ? (
                    <DrawControls
                      undoLabel={copy.undo}
                      redoLabel={copy.redo}
                      clearLabel={copy.clearLines}
                      canUndo={drawLines.length > 0}
                      canRedo={redoDrawLines.length > 0}
                      canClear={drawLines.length > 0}
                      onUndo={undoDrawLine}
                      onRedo={redoDrawLine}
                      onClear={clearDrawLines}
                    />
                ) : null
              }
              footerActions={
                <LineupFooterActions
                  shareLabel={copy.share}
                  copiedLabel={copy.copied}
                  downloadLabel={copy.download}
                  isCopied={copyStatus === "copied"}
                  onShare={copyShareLink}
                  onDownload={downloadLineupImage}
                />
              }
              />
            }
          />
          }
        />
      </DashboardShell>
      <LineupDragPreview preview={activeTab === "lineup" ? dragPreview : null} />
      <ToastStack toasts={toasts} />
    </main>
  );
}
