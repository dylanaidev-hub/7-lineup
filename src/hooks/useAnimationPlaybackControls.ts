import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";
import { getZoneName, type FormationPlayer, type OpponentMarker } from "../formationData";
import { useTacticalStore } from "../stores/tacticalStore";
import { cloneTacticalFrame, cloneTacticalFrames, type TacticalFrame } from "../tacticalData";
import type { PitchSize } from "../appRouting";

type UseAnimationPlaybackControlsOptions = {
  isAnimationTool: boolean;
  isPlaying: boolean;
  currentFrameIndex: number;
  animationFrames: TacticalFrame[];
  draftFrame: TacticalFrame;
  pitchSize: PitchSize;
  nextFrame: () => void;
  commitDraftIfChanged: () => TacticalFrame[];
  stop: () => void;
  setPlayers: Dispatch<SetStateAction<FormationPlayer[]>>;
  setOpponentMarkers: Dispatch<SetStateAction<OpponentMarker[]>>;
};

export function useAnimationPlaybackControls({
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
}: UseAnimationPlaybackControlsOptions) {
  const wasAnimationPlayingRef = useRef(false);
  const playbackStartTimerRef = useRef<number | null>(null);

  const clearPlaybackStartTimer = () => {
    if (!playbackStartTimerRef.current) return;
    window.clearTimeout(playbackStartTimerRef.current);
    playbackStartTimerRef.current = null;
  };

  const playAnimationFromStart = () => {
    clearPlaybackStartTimer();
    const committedFrames = commitDraftIfChanged();
    const nextFrames = committedFrames.length > 0 ? committedFrames : useTacticalStore.getState().frames;
    if (nextFrames.length === 0) return;

    const playbackFramesFromStart = cloneTacticalFrames(nextFrames);
    useTacticalStore.setState({
      playbackFrames: [cloneTacticalFrame(playbackFramesFromStart[0])],
      currentFrameIndex: 0,
      isPlaying: false,
      isAnimationMode: true,
    });

    playbackStartTimerRef.current = window.setTimeout(() => {
      useTacticalStore.setState({
        playbackFrames: playbackFramesFromStart,
        currentFrameIndex: 0,
        isPlaying: true,
        isAnimationMode: true,
      });
      playbackStartTimerRef.current = null;
    }, 80);
  };

  const stopAnimationPlayback = () => {
    clearPlaybackStartTimer();
    stop();
  };

  useEffect(() => {
    if (!isPlaying || !isAnimationTool) return;
    const timer = window.setTimeout(nextFrame, 900);
    return () => window.clearTimeout(timer);
  }, [currentFrameIndex, isAnimationTool, isPlaying, nextFrame]);

  useEffect(() => {
    return () => {
      if (playbackStartTimerRef.current) {
        window.clearTimeout(playbackStartTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const finishedPlayback = wasAnimationPlayingRef.current && !isPlaying && currentFrameIndex >= animationFrames.length;
    wasAnimationPlayingRef.current = isPlaying;
    if (!isAnimationTool || !finishedPlayback) return;

    setPlayers((current) =>
      current.map((player) => {
        const marker = draftFrame.find((item) => item.id === `p${player.id}`);
        if (!marker) return player;
        return {
          ...player,
          x: marker.x,
          y: marker.y,
          position: getZoneName(pitchSize, marker.x, marker.y),
          onPitch: marker.onPitch,
        };
      }),
    );
    setOpponentMarkers((current) =>
      current.map((marker) => {
        const frameMarker = draftFrame.find((item) => item.id === `o${marker.id}`);
        if (!frameMarker) return marker;
        return {
          ...marker,
          x: frameMarker.x,
          y: frameMarker.y,
          onPitch: frameMarker.onPitch,
        };
      }),
    );
  }, [animationFrames.length, currentFrameIndex, draftFrame, isAnimationTool, isPlaying, pitchSize, setOpponentMarkers, setPlayers]);

  return { playAnimationFromStart, stopAnimationPlayback };
}
