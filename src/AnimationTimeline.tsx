import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { Pause, Play, Plus, Repeat, Square, Trash2 } from "lucide-react";

type AnimationTimelineProps = {
  frames: readonly unknown[];
  currentFrameIndex: number;
  isPlaying: boolean;
  isLooping: boolean;
  isShowingPlayback: boolean;
  labels: {
    tacticalTimeline: string;
    framesUnit: string;
    frame: string;
    addFrame: string;
    clearAll: string;
    delete: string;
  };
  frameListRef: RefObject<HTMLDivElement | null>;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onClearFrames: () => void;
  onSelectFrame: (index: number) => void;
  onDeleteFrame: (index: number) => void;
  onAddFrame: () => void;
  onFrameListPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onFrameListPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onFrameListPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onFrameListPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export function AnimationTimeline({
  frames,
  currentFrameIndex,
  isPlaying,
  isLooping,
  isShowingPlayback,
  labels,
  frameListRef,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
  onClearFrames,
  onSelectFrame,
  onDeleteFrame,
  onAddFrame,
  onFrameListPointerDown,
  onFrameListPointerMove,
  onFrameListPointerUp,
  onFrameListPointerCancel,
}: AnimationTimelineProps) {
  const frameCount = frames.length;

  return (
    <aside className="workspace-timeline" aria-label={labels.tacticalTimeline}>
      <div className="workspace-timeline-title">
        <span>Tạo chuyển động</span>
        <strong>
          {frameCount} {labels.framesUnit}
        </strong>
      </div>
      <div className="workspace-timeline-controls">
        <button
          type="button"
          className="playback-button"
          onClick={isPlaying ? onPause : onPlay}
          disabled={frameCount === 0}
          aria-label={isPlaying ? "Pause" : "Play"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          className="playback-button"
          onClick={onStop}
          disabled={frameCount === 0}
          aria-label="Stop"
          title="Stop"
        >
          <Square size={15} />
        </button>
        <button
          type="button"
          className={`playback-button ${isLooping ? "active" : ""}`}
          onClick={onToggleLoop}
          aria-label="Loop"
          title="Loop"
        >
          <Repeat size={16} />
        </button>
        <button type="button" className="clear-frames-mobile-button" onClick={onClearFrames} disabled={frameCount === 0}>
          <Trash2 size={15} />
          <span>{labels.clearAll}</span>
        </button>
      </div>
      <div
        ref={frameListRef}
        className="workspace-frame-list"
        onPointerDown={onFrameListPointerDown}
        onPointerMove={onFrameListPointerMove}
        onPointerUp={onFrameListPointerUp}
        onPointerCancel={onFrameListPointerCancel}
      >
        {frameCount === 0 ? (
          <div className="workspace-frame-empty">Chưa có bước nào. Bấm Thêm bước để tạo Bước 1.</div>
        ) : null}
        {frames.map((_, index) => (
          <div
            key={index}
            className={`workspace-frame-item ${
              currentFrameIndex === index && currentFrameIndex < frameCount && !isShowingPlayback ? "active" : ""
            }`}
          >
            <button type="button" className="workspace-frame-select" onClick={() => onSelectFrame(index)}>
              {labels.frame} {index + 1}
            </button>
            <button
              type="button"
              className="workspace-frame-delete-button"
              data-frame-delete
              data-frame-index={index}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDeleteFrame(index);
              }}
              aria-label={`${labels.delete} ${labels.frame} ${index + 1}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="workspace-add-frame-button" onClick={onAddFrame}>
        <Plus size={15} />
        {labels.addFrame}
      </button>
    </aside>
  );
}
