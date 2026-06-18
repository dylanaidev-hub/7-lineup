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
import { PitchField } from "./PitchField";
import { ProfileView } from "./ProfileView";
import { MobilePlayerEditor, MobileSquadDrawer, SquadEditor } from "./SquadEditor";
import { ToastStack } from "./ToastStack";
import { getDisplayPosition } from "./formationData";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { localizeError } from "./appI18n";
import type { useAppController } from "./hooks/useAppController";

type AppViewProps = { model: ReturnType<typeof useAppController> };

export function AppView({ model }: AppViewProps) {
  const { copy, user, languageMeta, isUserMenuOpen, userMenuRef, setLanguage, setAuthDialogMode, setIsAuthScreenOpen, setIsUserMenuOpen, switchAppTab, signOut, navigate, language, authHashError, isPasswordRecovery, isRecoveryExpiryError, isAuthScreenOpen, recoveryDone, recoveryPassword, recoveryConfirm, recoveryStatus, isRecoverySubmitting, authDialogMode, setRecoveryPassword, setRecoveryConfirm, handleUpdatePassword, closeRecoveryScreen, requestNewResetLink, openSignInFromRecovery, activeTab, profileUsername, profileAvatarUrl, profileBio, profileFavoriteTeam, profileFavoritePosition, profileLocation, isAvatarUploading, isProfileLoading, avatarInputRef, handleAvatarFileChange, setProfileUsername, setProfileBio, setProfileFavoriteTeam, setProfileFavoritePosition, setProfileLocation, updateProfile, savedLineups, lockerCategories, lockerCategory, filteredSavedLineups, deletingLineupId, getSavedLineupFormatLabel, getSavedLineupThumbnail, getSavedLineupDateTime, setLockerCategory, loadSavedLineup, shareSavedLineup, deleteSavedLineup, activePlayers, benchCount, renamePlayer, renameExtraPlayer, addPlayerInput, removeExtraPlayerInput, isAnimationTool, isDrawMode, pitchSize, lockerStatus, isLockerLoading, handleSaveCurrentLineup, resetWorkspace, selectedMobilePlayer, setSelectedMobilePlayerId, activeBottomSheetTool, draggingId, draggingOpponentId, draggingTacticalMarkerId, showMarkerTray, showAnimationTimeline, applySandboxTool, players, opponentMarkers, ballMarker, isBallOnPitch, handleDragStart, handleDragMove, stopDragging, handleOpponentDragStart, handleOpponentDragMove, stopOpponentDragging, handleTacticalMarkerPointerDown, handleTacticalMarkerPointerMove, stopTacticalMarkerDragging, pitchRef, drawLayerRef, animationOpponentMarkers, animationMarkerMap, drawLines, showDrawTools, isPlaying, startDrawing, continueDrawing, stopDrawing, isMobileSquadDrawerOpen, setIsMobileSquadDrawerOpen, animationFrames, currentFrameIndex, isLooping, playbackFrames, frameListRef, playAnimationFromStart, pause, stopAnimationPlayback, toggleLoop, clearFrames, selectFrameFromList, removeFrame, addFrame, frameListDrag, showDrawSheet, redoDrawLines, undoDrawLine, redoDrawLine, clearDrawLines, copyStatus, copyShareLink, downloadLineupImage, dragPreview, toasts, showAllCanvasObjects } = model;
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
