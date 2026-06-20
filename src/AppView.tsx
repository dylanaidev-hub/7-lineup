import { useEffect, useRef, useState } from "react";
import { AnimationTimeline } from "./AnimationTimeline";
import { AppContent } from "./AppContent";
import { AppHeader } from "./AppHeader";
import { AppOverlays } from "./AppOverlays";
import { DashboardShell } from "./DashboardShell";
import { LineupDragPreview } from "./DragPreview";
import { DrawControls } from "./DrawControls";
import { LineupColumn } from "./LineupColumn";
import { LineupFooterActions } from "./LineupFooterActions";
import { LineupHeaderActions } from "./LineupHeaderActions";
import { LineupStage } from "./LineupStage";
import { LineupWorkspace } from "./LineupWorkspace";
import { LockerRoom } from "./LockerRoom";
import { MarkerTray } from "./MarkerTray";
import { MobileLandscapePrompt } from "./MobileLandscapePrompt";
import { PitchField } from "./PitchField";
import { ProfileView } from "./ProfileView";
import { MobilePlayerEditor, MobileSquadDrawer, SquadEditor } from "./SquadEditor";
import { ToastStack } from "./ToastStack";
import { getDisplayPosition } from "./formationData";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { localizeError } from "./appI18n";
import type { useAppController } from "./hooks/useAppController";
import { useFullscreen } from "./hooks/useFullscreen";

type AppViewProps = { model: ReturnType<typeof useAppController> };

const isPortableTouchDevice = () => {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroidDevice = /Android/i.test(userAgent);
  const hasTouchInput = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const shortestScreenSide = Math.min(window.screen.width, window.screen.height);

  return isIOSDevice || isAndroidDevice || (hasTouchInput && shortestScreenSide <= 1024);
};

const isViewportLandscape = () => {
  if (typeof window === "undefined") return false;

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  if (Math.abs(viewportWidth - viewportHeight) > 1) return viewportWidth > viewportHeight;

  const legacyOrientation = (window as Window & { orientation?: number }).orientation;
  if (typeof legacyOrientation === "number") return Math.abs(legacyOrientation) === 90;

  return window.screen.orientation?.type.startsWith("landscape")
    ?? window.matchMedia("(orientation: landscape)").matches;
};

export function AppView({ model }: AppViewProps) {
  const { copy, user, languageMeta, isUserMenuOpen, userMenuRef, toggleLanguage, setAuthDialogMode, setIsAuthScreenOpen, setIsUserMenuOpen, switchAppTab, signOut, navigate, language, authHashError, isPasswordRecovery, isRecoveryExpiryError, isAuthScreenOpen, recoveryDone, recoveryPassword, recoveryConfirm, recoveryStatus, isRecoverySubmitting, authDialogMode, setRecoveryPassword, setRecoveryConfirm, handleUpdatePassword, closeRecoveryScreen, requestNewResetLink, openSignInFromRecovery, activeTab, profileUsername, profileAvatarUrl, profileBio, profileFavoriteTeam, profileFavoritePosition, profileLocation, isAvatarUploading, isProfileLoading, avatarInputRef, handleAvatarFileChange, setProfileUsername, setProfileBio, setProfileFavoriteTeam, setProfileFavoritePosition, setProfileLocation, updateProfile, savedLineups, lockerCategories, lockerCategory, filteredSavedLineups, deletingLineupId, getSavedLineupFormatLabel, getSavedLineupThumbnail, getSavedLineupDateTime, setLockerCategory, loadSavedLineup, shareSavedLineup, deleteSavedLineup, activePlayers, benchCount, renamePlayer, renameExtraPlayer, addPlayerInput, removeExtraPlayerInput, isAnimationTool, isDrawMode, pitchSize, lockerStatus, isLockerLoading, handleSaveCurrentLineup, resetWorkspace, selectedMobilePlayer, setSelectedMobilePlayerId, activeBottomSheetTool, draggingId, draggingOpponentId, draggingTacticalMarkerId, showMarkerTray, showAnimationTimeline, applySandboxTool, players, opponentMarkers, ballMarker, isBallOnPitch, handleDragStart, handleDragMove, stopDragging, handleOpponentDragStart, handleOpponentDragMove, stopOpponentDragging, handleTacticalMarkerPointerDown, handleTacticalMarkerPointerMove, stopTacticalMarkerDragging, pitchRef, drawLayerRef, animationOpponentMarkers, animationMarkerMap, drawLines, showDrawTools, isPlaying, startDrawing, continueDrawing, stopDrawing, isMobileSquadDrawerOpen, setIsMobileSquadDrawerOpen, animationFrames, currentFrameIndex, isLooping, playbackFrames, frameListRef, playAnimationFromStart, pause, stopAnimationPlayback, toggleLoop, clearFrames, selectFrameFromList, removeFrame, addFrame, frameListDrag, showDrawSheet, redoDrawLines, undoDrawLine, redoDrawLine, clearDrawLines, copyStatus, copyShareLink, downloadLineupImage, dragPreview, toasts, showAllCanvasObjects } = model;
  const workspaceRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(workspaceRef);
  const [prefersLandscapePitch, setPrefersLandscapePitch] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1025px)").matches,
  );
  const [isLandscapeViewport, setIsLandscapeViewport] = useState(() =>
    isViewportLandscape(),
  );
  const [isPortableViewport, setIsPortableViewport] = useState(() => isPortableTouchDevice());
  const [isLandscapePromptDismissed, setIsLandscapePromptDismissed] = useState(false);
  const wasLandscapeViewportRef = useRef(isLandscapeViewport);
  const isPitchLandscape = isFullscreen || (prefersLandscapePitch && isDesktopViewport);
  const isPortraitFullscreen = isFullscreen && !isLandscapeViewport;
  const workspaceShellClassName = [
    "workspace-fullscreen-shell",
    isFullscreen ? "workspace-fullscreen-shell--active" : "",
    isPortraitFullscreen ? "workspace-fullscreen-shell--portrait" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const fullscreenLabel = language === "vi"
    ? isFullscreen ? "Thoát toàn màn hình (F)" : "Toàn màn hình (F)"
    : isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)";
  const rotateLabel = language === "vi"
    ? isPitchLandscape ? "Sân dọc" : "Sân ngang"
    : isPitchLandscape ? "Portrait pitch" : "Landscape pitch";

  useEffect(() => {
    if (isFullscreen) {
      setPrefersLandscapePitch(true);
    }
    document.body.classList.toggle("lineup-mobile-dock", isFullscreen);
    return () => document.body.classList.remove("lineup-mobile-dock");
  }, [isFullscreen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1025px)");
    const landscapeQuery = window.matchMedia("(orientation: landscape)");
    const pendingSyncs: number[] = [];
    const syncViewport = () => {
      const nextLandscape = isViewportLandscape();

      setIsDesktopViewport(desktopQuery.matches);
      setIsLandscapeViewport(nextLandscape);
      setIsPortableViewport(isPortableTouchDevice());

      if (!nextLandscape || (nextLandscape && !wasLandscapeViewportRef.current)) {
        setIsLandscapePromptDismissed(false);
      }
      wasLandscapeViewportRef.current = nextLandscape;
    };
    const syncAfterOrientationChange = () => {
      window.requestAnimationFrame(syncViewport);
      pendingSyncs.push(window.setTimeout(syncViewport, 120));
      pendingSyncs.push(window.setTimeout(syncViewport, 320));
      pendingSyncs.push(window.setTimeout(syncViewport, 600));
    };

    syncViewport();
    desktopQuery.addEventListener("change", syncViewport);
    landscapeQuery.addEventListener("change", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncAfterOrientationChange);
    window.screen.orientation?.addEventListener("change", syncAfterOrientationChange);
    window.visualViewport?.addEventListener("resize", syncViewport);
    return () => {
      desktopQuery.removeEventListener("change", syncViewport);
      landscapeQuery.removeEventListener("change", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncAfterOrientationChange);
      window.screen.orientation?.removeEventListener("change", syncAfterOrientationChange);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      pendingSyncs.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const openMobileLandscapeFullscreen = () => {
    setPrefersLandscapePitch(true);
    void toggleFullscreen();
  };

  return (
    <main className="match-bg min-h-screen px-0 py-0 text-slate-900 antialiased sm:px-4 sm:py-6 lg:p-10">
      <div ref={workspaceRef} className={workspaceShellClassName}>
      {!isFullscreen ? (
      <AppHeader
        copy={copy}
        user={user}
        languageMeta={languageMeta}
        isUserMenuOpen={isUserMenuOpen}
        userMenuRef={userMenuRef}
        onSwitchLanguage={toggleLanguage}
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
      ) : null}
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
      {isPortableViewport &&
      isLandscapeViewport &&
      !isFullscreen &&
      !isLandscapePromptDismissed &&
      activeTab === "lineup" ? (
        <MobileLandscapePrompt
          title={language === "vi" ? "Chế độ màn hình ngang" : "Landscape mode"}
          description={
            language === "vi"
              ? "Mở toàn màn hình để có thêm không gian chỉnh đội hình và thao tác trên sân."
              : "Open fullscreen for more room to edit the lineup and work on the pitch."
          }
          openLabel={language === "vi" ? "Mở toàn màn hình" : "Open fullscreen"}
          dismissLabel={language === "vi" ? "Để sau" : "Not now"}
          onOpenFullscreen={openMobileLandscapeFullscreen}
          onDismiss={() => setIsLandscapePromptDismissed(true)}
        />
      ) : null}
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
              isFullscreen={isFullscreen}
              header={
                <LineupHeaderActions
                  saveLabel={copy.save}
                  resetLabel={copy.reset}
                  savedLabel={copy.saved}
                  status={lockerStatus}
                  isSaving={isLockerLoading}
                  isFullscreen={isFullscreen}
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
                  isFullscreen={isFullscreen}
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
                      isLandscape={isPitchLandscape}
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
                  fullscreenLabel={fullscreenLabel}
                  rotateLabel={rotateLabel}
                  isCopied={copyStatus === "copied"}
                  isFullscreen={isFullscreen}
                  isLandscape={isPitchLandscape}
                  onShare={copyShareLink}
                  onDownload={downloadLineupImage}
                  onToggleFullscreen={() => void toggleFullscreen()}
                  onToggleOrientation={() => setPrefersLandscapePitch((current) => !current)}
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
      </div>
    </main>
  );
}
