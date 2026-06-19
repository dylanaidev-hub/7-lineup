import { useEffect, useRef } from "react";
import { useTacticalStore } from "../stores/tacticalStore";
import { cloneTacticalFrame, cloneTacticalFrames, type TacticalFrame } from "../tacticalData";

type UseAnimationPlaybackControlsOptions = {
  isAnimationTool: boolean;
  isPlaying: boolean;
  currentFrameIndex: number;
  nextFrame: () => void;
  commitDraftIfChanged: () => TacticalFrame[];
  stop: () => void;
};

export function useAnimationPlaybackControls({
  isAnimationTool,
  isPlaying,
  currentFrameIndex,
  nextFrame,
  commitDraftIfChanged,
  stop,
}: UseAnimationPlaybackControlsOptions) {
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

  return { playAnimationFromStart, stopAnimationPlayback };
}
