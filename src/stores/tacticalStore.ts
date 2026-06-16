import { create } from "zustand";
import {
  areTacticalFramesEqual,
  cloneTacticalFrame,
  cloneTacticalFrames,
  createDefaultTacticalPlaybook,
  createInitialTacticalFrame,
  createTacticalId,
  decodeTacticalPayload,
  type TacticalFrame,
  type TacticalPlaybook,
} from "../tacticalData";

export type WorkspaceMode = "LINEUP" | "CUSTOM" | "ANIMATION";

type TacticalStore = {
  currentMode: WorkspaceMode;
  isAnimationMode: boolean;
  tactics: TacticalPlaybook[];
  activeTacticId: string;
  frames: TacticalFrame[];
  draftFrame: TacticalFrame;
  playbackFrames: TacticalFrame[] | null;
  currentFrameIndex: number;
  isPlaying: boolean;
  isLooping: boolean;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setAnimationMode: (value: boolean) => void;
  selectFrame: (index: number) => void;
  addFrame: () => void;
  commitDraftIfChanged: () => TacticalFrame[];
  removeFrame: (index: number) => void;
  clearFrames: () => void;
  updateMarker: (id: string, x: number, y: number, onPitch?: boolean) => void;
  toggleLoop: () => void;
  saveTactic: () => void;
  createTactic: () => void;
  loadTactic: (id: string) => void;
  deleteTactic: (id: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextFrame: () => void;
};

export const tacticalStorageKey = "lineup-football-tactics-state-v1";

const saveStoredTactics = (tactics: TacticalPlaybook[]) => {
  void tactics;
};

const getInitialTacticalPlaybooks = () => {
  const sharedValue = new URLSearchParams(window.location.search).get("tactics");
  const sharedTactics = sharedValue ? decodeTacticalPayload(sharedValue) : null;
  return sharedTactics ?? [createDefaultTacticalPlaybook()];
};

const initialTacticalPlaybooks = getInitialTacticalPlaybooks();
const initialTacticalPlaybook = initialTacticalPlaybooks[0] ?? createDefaultTacticalPlaybook();

export const useTacticalStore = create<TacticalStore>((set) => ({
  currentMode: "LINEUP",
  isAnimationMode: true,
  tactics: initialTacticalPlaybooks,
  activeTacticId: initialTacticalPlaybook.id,
  frames: cloneTacticalFrames(initialTacticalPlaybook.frames),
  draftFrame: createInitialTacticalFrame(),
  playbackFrames: null,
  currentFrameIndex: 0,
  isPlaying: false,
  isLooping: false,
  setWorkspaceMode: (mode) => set({ currentMode: mode, isAnimationMode: mode === "ANIMATION" }),
  setAnimationMode: (value) => set({ isAnimationMode: value }),
  selectFrame: (index) =>
    set((state) => {
      const selectedIndex = state.frames.length === 0 ? 0 : Math.min(Math.max(index, 0), state.frames.length - 1);
      const selectedFrame = state.frames[selectedIndex] ?? state.draftFrame;
      return {
        currentFrameIndex: selectedIndex,
        draftFrame: cloneTacticalFrame(selectedFrame),
        isPlaying: false,
        playbackFrames: null,
      };
    }),
  addFrame: () =>
    set((state) => {
      const currentFrame = state.draftFrame;
      const nextFrames = [...state.frames, cloneTacticalFrame(currentFrame)];
      return {
        frames: nextFrames,
        draftFrame: cloneTacticalFrame(currentFrame),
        currentFrameIndex: nextFrames.length,
        isAnimationMode: true,
        isPlaying: false,
        playbackFrames: null,
      };
    }),
  commitDraftIfChanged: () => {
    let committedFrames: TacticalFrame[] = [];
    set((state) => {
      const lastFrame = state.frames[state.frames.length - 1];
      const shouldCommit = state.frames.length === 0 || !areTacticalFramesEqual(state.draftFrame, lastFrame);
      const nextFrames = shouldCommit ? [...state.frames, cloneTacticalFrame(state.draftFrame)] : state.frames;
      const nextTactics = shouldCommit
        ? state.tactics.map((tactic) =>
            tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(nextFrames) } : tactic,
          )
        : state.tactics;
      committedFrames = cloneTacticalFrames(nextFrames);
      if (!shouldCommit) return state;
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        frames: nextFrames,
        currentFrameIndex: nextFrames.length,
        isPlaying: false,
        playbackFrames: null,
      };
    });
    return committedFrames;
  },
  removeFrame: (index) =>
    set((state) => {
      if (state.frames.length === 0) return state;
      if (state.frames.length === 1) {
        const nextTactics = state.tactics.map((tactic) =>
          tactic.id === state.activeTacticId ? { ...tactic, frames: [] } : tactic,
        );
        saveStoredTactics(nextTactics);
        return {
          tactics: nextTactics,
          frames: [],
          draftFrame: cloneTacticalFrame(state.frames[0] ?? state.draftFrame),
          currentFrameIndex: 0,
          isPlaying: false,
          playbackFrames: null,
        };
      }
      const nextFrames = state.frames.filter((_, frameIndex) => frameIndex !== index);
      const nextTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(nextFrames) } : tactic,
      );
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        frames: nextFrames,
        currentFrameIndex: Math.min(state.currentFrameIndex, nextFrames.length),
        isPlaying: false,
        playbackFrames: null,
      };
    }),
  clearFrames: () =>
    set((state) => {
      const visibleFrame =
        state.playbackFrames?.[state.currentFrameIndex] ??
        state.frames[state.currentFrameIndex] ??
        state.frames[0] ??
        state.draftFrame;
      const nextTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: [] } : tactic,
      );
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        frames: [],
        draftFrame: cloneTacticalFrame(visibleFrame),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  updateMarker: (id, x, y, onPitch) =>
    set((state) => {
      const updateFrame = (frame: TacticalFrame) =>
        frame.map((marker) => (marker.id === id ? { ...marker, x, y, onPitch: onPitch ?? marker.onPitch } : marker));

      return { draftFrame: updateFrame(state.draftFrame), currentFrameIndex: state.frames.length, playbackFrames: null };
    }),
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
  saveTactic: () =>
    set((state) => {
      const nextTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(state.frames) } : tactic,
      );
      saveStoredTactics(nextTactics);
      return { tactics: nextTactics };
    }),
  createTactic: () =>
    set((state) => {
      const savedTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(state.frames) } : tactic,
      );
      const nextTactic: TacticalPlaybook = {
        id: createTacticalId(),
        name: `Chiến thuật ${savedTactics.length + 1}`,
        frames: [],
      };
      const nextTactics = [...savedTactics, nextTactic];
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        activeTacticId: nextTactic.id,
        frames: cloneTacticalFrames(nextTactic.frames),
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  loadTactic: (id) =>
    set((state) => {
      const currentSavedTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(state.frames) } : tactic,
      );
      const tactic = currentSavedTactics.find((item) => item.id === id);
      if (!tactic) return state;

      saveStoredTactics(currentSavedTactics);
      return {
        tactics: currentSavedTactics,
        activeTacticId: tactic.id,
        frames: cloneTacticalFrames(tactic.frames),
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  deleteTactic: (id) =>
    set((state) => {
      if (state.tactics.length <= 1) return state;

      const savedTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(state.frames) } : tactic,
      );
      const nextTactics = savedTactics.filter((tactic) => tactic.id !== id);
      const nextActive = id === state.activeTacticId ? nextTactics[0] : nextTactics.find((tactic) => tactic.id === state.activeTacticId);
      if (!nextActive) return state;

      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        activeTacticId: nextActive.id,
        frames: cloneTacticalFrames(nextActive.frames),
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  play: () =>
    set((state) => {
      const lastFrame = state.frames[state.frames.length - 1];
      const shouldCommit = state.frames.length === 0 || !areTacticalFramesEqual(state.draftFrame, lastFrame);
      const nextFrames = shouldCommit ? [...state.frames, cloneTacticalFrame(state.draftFrame)] : state.frames;
      const nextTactics = shouldCommit
        ? state.tactics.map((tactic) =>
            tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(nextFrames) } : tactic,
          )
        : state.tactics;
      if (nextFrames.length === 0) return { isPlaying: false, currentFrameIndex: 0, playbackFrames: null };
      return {
        tactics: nextTactics,
        frames: nextFrames,
        isPlaying: true,
        currentFrameIndex: 0,
        isAnimationMode: true,
        playbackFrames: cloneTacticalFrames(nextFrames),
      };
    }),
  pause: () => set({ isPlaying: false, currentFrameIndex: 0, playbackFrames: null }),
  stop: () =>
    set((state) => ({
      isPlaying: false,
      currentFrameIndex: 0,
      playbackFrames: state.frames.length > 0 ? [cloneTacticalFrame(state.frames[0])] : [cloneTacticalFrame(state.draftFrame)],
    })),
  nextFrame: () =>
    set((state) => {
      if (!state.isPlaying) return state;
      const sequenceLength = state.playbackFrames?.length ?? state.frames.length;
      const nextIndex = state.currentFrameIndex + 1;
      if (nextIndex >= sequenceLength) {
        const finalFrame = state.playbackFrames?.[sequenceLength - 1] ?? state.frames[sequenceLength - 1] ?? state.draftFrame;
        if (state.isLooping) {
          return { currentFrameIndex: 0, isPlaying: true };
        }
        return {
          currentFrameIndex: state.frames.length,
          draftFrame: cloneTacticalFrame(finalFrame),
          playbackFrames: null,
          isPlaying: false,
        };
      }
      return { currentFrameIndex: nextIndex };
    }),
}));

