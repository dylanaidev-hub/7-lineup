import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { buildDrawGeometry, projectFromEnd, type DrawStroke } from "./drawGeometry";
import { carriesBall, type DrawLine } from "./formationTypes";
import { useElementAspect } from "./hooks/useElementAspect";
import { pitchPointToDisplay, type PitchOrientation } from "./pitchPointer";

type PitchPlayer = {
  id: number;
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  x: number;
  y: number;
};

type PitchMarker = {
  id: number;
  x: number;
  y: number;
};

type PitchBallMarker = {
  id: string;
  x: number;
  y: number;
  onPitch: boolean;
};

type AnimationMarker = {
  x: number;
  y: number;
  onPitch: boolean;
};

type PitchFieldProps = {
  pitchRef: RefObject<HTMLDivElement | null>;
  drawLayerRef: RefObject<SVGSVGElement | null>;
  players: PitchPlayer[];
  opponentMarkers: PitchMarker[];
  ballMarker: PitchBallMarker | undefined;
  animationMarkerMap: Map<string, AnimationMarker>;
  drawLines: DrawLine[];
  isDrawMode: boolean;
  showDrawTools: boolean;
  isAnimationTool: boolean;
  isPlaying: boolean;
  isLandscape: boolean;
  showAllCanvasObjects: boolean;
  draggingPlayerId: number | null;
  draggingOpponentId: number | null;
  draggingBallId: string | null;
  labels: {
    player: string;
    dragPlayer: string;
    dragOpponent: string;
  };
  hoveredAnchor: string | null;
  getPositionLabel: (position: string) => string;
  onClearDrawHover: () => void;
  onStartDrawing: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onContinueDrawing: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onStopDrawing: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPlayerPointerDown: (event: ReactPointerEvent<HTMLElement>, id: number) => void;
  onPlayerPointerMove: (event: ReactPointerEvent<HTMLElement>, id: number) => void;
  onPlayerPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onOpponentPointerDown: (event: ReactPointerEvent<HTMLElement>, id: number) => void;
  onOpponentPointerMove: (event: ReactPointerEvent<HTMLElement>, id: number) => void;
  onOpponentPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onBallPointerDown: (event: ReactPointerEvent<HTMLElement>, id: string) => void;
  onBallPointerMove: (event: ReactPointerEvent<HTMLElement>, id: string) => void;
  onBallPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
};

/** CSS px, because the strokes are `non-scaling-stroke`. Geometry stays pitch-relative. */
const BASE_STROKE_WIDTH = 2;
/** Half of `.draw-ghost-marker`'s 22px box, plus its border. */
const GHOST_RADIUS_PX = 13;
/** Half of the ball marker's 26px box. */
const BALL_RADIUS_PX = 13;
/** How close the ball has to sit to count as being at a player's feet. */
const BALL_ATTACH_RADIUS = 5;

const getBenchNames = (player: PitchPlayer) =>
  [player.substituteName, ...player.extraNames].map((name) => name.trim()).filter(Boolean);

export function PitchField({
  pitchRef,
  drawLayerRef,
  players,
  opponentMarkers,
  ballMarker,
  animationMarkerMap,
  drawLines,
  isDrawMode,
  showDrawTools,
  isAnimationTool,
  isPlaying,
  isLandscape,
  showAllCanvasObjects,
  draggingPlayerId,
  draggingOpponentId,
  draggingBallId,
  labels,
  hoveredAnchor,
  getPositionLabel,
  onClearDrawHover,
  onStartDrawing,
  onContinueDrawing,
  onStopDrawing,
  onPlayerPointerDown,
  onPlayerPointerMove,
  onPlayerPointerEnd,
  onOpponentPointerDown,
  onOpponentPointerMove,
  onOpponentPointerEnd,
  onBallPointerDown,
  onBallPointerMove,
  onBallPointerEnd,
}: PitchFieldProps) {
  const orientation: PitchOrientation = isLandscape ? "landscape" : "portrait";
  const displayPoint = (x: number, y: number) => pitchPointToDisplay(x, y, orientation);
  const ballDisplayPosition = ballMarker ? displayPoint(ballMarker.x, ballMarker.y) : null;
  const { aspect: pitchAspect, height: pitchHeight } = useElementAspect(drawLayerRef);
  const strokePath = (stroke: DrawStroke) =>
    `M${stroke.points.map((point) => `${point.x},${point.y}`).join("L")}${stroke.closed ? "Z" : ""}`;
  const resolveGhost = (line: DrawLine) => {
    if (!showAllCanvasObjects || !line.anchor || line.points.length < 2) return null;
    const id = Number(line.anchor.slice(1));
    const isOpponent = line.anchor.startsWith("o");
    const source = isOpponent
      ? opponentMarkers.find((marker) => marker.id === id)
      : players.find((player) => player.id === id);
    return source ? { id, isOpponent } : null;
  };
  // The ghost token is a fixed pixel size; the geometry works in 0-100 units.
  const ghostRadius = pitchHeight > 0 ? (GHOST_RADIUS_PX / pitchHeight) * 100 : 0;
  const ghosts = drawLines.flatMap((line) => {
    const ghost = resolveGhost(line);
    if (!ghost) return [];
    const end = line.points[line.points.length - 1];
    return [{ ...ghost, key: `ghost-${line.id}`, position: displayPoint(end.x, end.y) }];
  });
  /**
   * Where the ball ends up. Derived from its current position rather than
   * stored, so moving the ball away from the passer drops the projection
   * instead of leaving a stale one behind.
   */
  const ballRadius = pitchHeight > 0 ? (BALL_RADIUS_PX / pitchHeight) * 100 : 0;
  const ballGhosts = drawLines.flatMap((line) => {
    if (!showAllCanvasObjects || !ballMarker?.onPitch || !carriesBall(line.kind) || line.points.length < 2) return [];
    const start = line.points[0];
    if (Math.hypot(ballMarker.x - start.x, ballMarker.y - start.y) > BALL_ATTACH_RADIUS) return [];

    const displayPoints = line.points.map((point) => displayPoint(point.x, point.y));
    const end = line.points[line.points.length - 1];
    // Beside whatever token the action ends on — the ghost of the player who
    // carried it, or the team-mate who receives the pass — so the ball never
    // vanishes behind a marker. Otherwise: exactly where the line ends.
    const endsOnToken =
      Boolean(resolveGhost(line)) ||
      [...players, ...opponentMarkers].some(
        (marker) => Math.hypot(marker.x - end.x, marker.y - end.y) <= BALL_ATTACH_RADIUS,
      );
    const position = endsOnToken
      ? projectFromEnd(displayPoints, pitchAspect, { across: ghostRadius + ballRadius })
      : displayPoints[displayPoints.length - 1];

    return [{ key: `ball-${line.id}`, position }];
  });

  return (
    <div
      ref={pitchRef}
      data-orientation={orientation}
      className={`pitch relative mx-auto w-auto max-w-full min-w-0 border-[4px] border-white/80 touch-none select-none ${
        isLandscape ? "landscape" : ""
      } ${
        isDrawMode ? "draw-mode" : ""
      } ${isPlaying && isAnimationTool ? "playback-mode" : ""}`}
    >
      <div className="absolute inset-[4%] border-[3px] border-white/90" />
      {isLandscape ? (
        <>
          <div className="absolute bottom-[4%] left-1/2 top-[4%] w-[3px] -translate-x-1/2 bg-white/90" />
          <div className="absolute left-1/2 top-1/2 h-[31%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/90" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute left-[4%] top-1/2 h-[48%] w-[15%] -translate-y-1/2 border-y-[3px] border-r-[3px] border-white/90" />
          <div className="absolute left-[4%] top-1/2 h-[26%] w-[7%] -translate-y-1/2 border-y-[3px] border-r-[3px] border-white/90" />
          <div className="absolute right-[4%] top-1/2 h-[48%] w-[15%] -translate-y-1/2 border-y-[3px] border-l-[3px] border-white/90" />
          <div className="absolute right-[4%] top-1/2 h-[26%] w-[7%] -translate-y-1/2 border-y-[3px] border-l-[3px] border-white/90" />
        </>
      ) : (
        <>
          <div className="absolute left-[4%] right-[4%] top-1/2 h-[3px] -translate-y-1/2 bg-white/90" />
          <div className="absolute left-1/2 top-1/2 h-[22%] w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/90" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute left-1/2 top-[4%] h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
          <div className="absolute left-1/2 top-[4%] h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
          <div className="absolute bottom-[4%] left-1/2 h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />
          <div className="absolute bottom-[4%] left-1/2 h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />
        </>
      )}

      <svg ref={drawLayerRef} className="draw-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {showAllCanvasObjects
          ? drawLines.flatMap((line) => {
              const displayPoints = line.points.map((point) => displayPoint(point.x, point.y));
              return buildDrawGeometry(
                {
                  kind: line.kind,
                  side: line.side,
                  points: displayPoints,
                  ghostRadius: resolveGhost(line) ? ghostRadius : 0,
                },
                pitchAspect,
              ).map(
                (stroke, index) => (
                  <path
                    key={`${line.id}-${index}`}
                    d={strokePath(stroke)}
                    fill={stroke.fill ?? "none"}
                    stroke={stroke.color}
                    strokeDasharray={stroke.dash ? stroke.dash.map((step) => step * BASE_STROKE_WIDTH).join(" ") : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={stroke.width * BASE_STROKE_WIDTH}
                    vectorEffect="non-scaling-stroke"
                  />
                ),
              );
            })
          : null}
      </svg>
      {isDrawMode && showDrawTools ? (
        <div
          className="draw-hit-layer"
          onPointerDown={onStartDrawing}
          onPointerMove={onContinueDrawing}
          onPointerUp={onStopDrawing}
          onPointerCancel={onStopDrawing}
          onPointerLeave={onClearDrawHover}
          aria-hidden="true"
        />
      ) : null}

      {ballGhosts.map((ball) => (
        <span
          key={ball.key}
          className="draw-ghost-ball"
          style={{ left: `${ball.position.x}%`, top: `${ball.position.y}%` }}
          aria-hidden="true"
        />
      ))}

      {ghosts.map((ghost) => (
        <span
          key={ghost.key}
          className={`draw-ghost-marker${ghost.isOpponent ? " draw-ghost-marker--opponent" : ""}`}
          style={{ left: `${ghost.position.x}%`, top: `${ghost.position.y}%` }}
          aria-hidden="true"
        >
          {ghost.id}
        </span>
      ))}

      {players.map((player) => {
        const animationMarker = isAnimationTool ? animationMarkerMap.get(`p${player.id}`) : null;
        if (animationMarker && !animationMarker.onPitch) return null;
        const starterName = player.starterName.trim() || `${labels.player} ${player.id}`;
        const benchNames = getBenchNames(player);
        const position = displayPoint(animationMarker?.x ?? player.x, animationMarker?.y ?? player.y);

        return (
          <div
            key={player.id}
            data-player-id={player.id}
            onPointerDown={(event) => onPlayerPointerDown(event, player.id)}
            onPointerMove={(event) => onPlayerPointerMove(event, player.id)}
            onPointerUp={onPlayerPointerEnd}
            onPointerCancel={onPlayerPointerEnd}
            className={`player-token group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none ${
              draggingPlayerId === player.id ? "dragging" : ""
            } ${hoveredAnchor === `p${player.id}` ? "draw-anchor-hover" : ""}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            role="button"
            tabIndex={0}
            aria-label={`${labels.dragPlayer} ${getPositionLabel(player.position)}`}
          >
            <span className={`kit-disc transition group-active:scale-110 ${draggingPlayerId === player.id ? "ring-4 ring-emerald-200" : ""}`}>
              <span className="kit-number">{player.id}</span>
            </span>
            <span className="token-name">{starterName}</span>
            {benchNames.length > 0 ? (
              <span className="bench-list">
                {benchNames.slice(0, 2).map((name, index) => (
                  <small key={`${name}-${index}`}>{name}</small>
                ))}
              </span>
            ) : null}
          </div>
        );
      })}
      {showAllCanvasObjects
        ? opponentMarkers.map((marker) => {
            const position = displayPoint(marker.x, marker.y);
            return (
              <button
                key={`opponent-${marker.id}`}
                type="button"
                className={`opponent-pitch-dot ${draggingOpponentId === marker.id ? "dragging" : ""} ${
                  hoveredAnchor === `o${marker.id}` ? "draw-anchor-hover" : ""
                }`}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                onPointerDown={(event) => onOpponentPointerDown(event, marker.id)}
                onPointerMove={(event) => onOpponentPointerMove(event, marker.id)}
                onPointerUp={onOpponentPointerEnd}
                onPointerCancel={onOpponentPointerEnd}
                aria-label={`${labels.dragOpponent} ${marker.id}`}
              />
            );
          })
        : null}
      {ballMarker?.onPitch && ballDisplayPosition ? (
        <button
          type="button"
          className={`tactical-ball-marker ${draggingBallId === ballMarker.id ? "dragging" : ""}`}
          style={{ left: `${ballDisplayPosition.x}%`, top: `${ballDisplayPosition.y}%` }}
          onPointerDown={(event) => onBallPointerDown(event, ballMarker.id)}
          onPointerMove={(event) => onBallPointerMove(event, ballMarker.id)}
          onPointerUp={onBallPointerEnd}
          onPointerCancel={onBallPointerEnd}
          aria-label="Drag ball marker"
        />
      ) : null}
    </div>
  );
}
