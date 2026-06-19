import type { PointerEvent as ReactPointerEvent } from "react";

type TrayPlayer = {
  id: number;
  onPitch: boolean;
};

type TrayOpponent = {
  id: number;
  onPitch: boolean;
};

type TrayBall = {
  id: string;
  onPitch: boolean;
};

type MarkerTrayCopy = {
  customPlayerTray: string;
  players: string;
  opponentTray: string;
  opponent: string;
  dragPlayer: string;
  dragOpponent: string;
};

type MarkerTrayProps<TPlayer extends TrayPlayer, TOpponent extends TrayOpponent, TBall extends TrayBall> = {
  copy: MarkerTrayCopy;
  players: TPlayer[];
  opponentMarkers: TOpponent[];
  ballMarker: TBall | undefined;
  isBallOnPitch: boolean;
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

export function MarkerTray<TPlayer extends TrayPlayer, TOpponent extends TrayOpponent, TBall extends TrayBall>({
  copy,
  players,
  opponentMarkers,
  ballMarker,
  isBallOnPitch,
  onPlayerPointerDown,
  onPlayerPointerMove,
  onPlayerPointerEnd,
  onOpponentPointerDown,
  onOpponentPointerMove,
  onOpponentPointerEnd,
  onBallPointerDown,
  onBallPointerMove,
  onBallPointerEnd,
}: MarkerTrayProps<TPlayer, TOpponent, TBall>) {
  return (
    <div className="custom-side-tray">
      <div className="custom-player-tray" aria-label={copy.customPlayerTray}>
        <span>{copy.players}</span>
        <div className="custom-player-dot-list">
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              className={`custom-player-dot ${player.onPitch ? "placed" : ""}`}
              onPointerDown={(event) => onPlayerPointerDown(event, player.id)}
              onPointerMove={(event) => onPlayerPointerMove(event, player.id)}
              onPointerUp={onPlayerPointerEnd}
              onPointerCancel={onPlayerPointerEnd}
              aria-label={`${copy.dragPlayer} ${player.id}`}
            >
              {player.id}
            </button>
          ))}
        </div>
      </div>
      <div className="opponent-tray" aria-label={copy.opponentTray}>
        <span>{copy.opponent}</span>
        <div className="opponent-dot-list">
          {opponentMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className={`opponent-dot ${marker.onPitch ? "placed" : ""}`}
              onPointerDown={(event) => onOpponentPointerDown(event, marker.id)}
              onPointerMove={(event) => onOpponentPointerMove(event, marker.id)}
              onPointerUp={onOpponentPointerEnd}
              onPointerCancel={onOpponentPointerEnd}
              aria-label={`${copy.dragOpponent} ${marker.id}`}
            />
          ))}
        </div>
      </div>
      <div className="ball-tray" aria-label="Ball marker tray">
        <span>Bóng</span>
        {ballMarker && !isBallOnPitch ? (
          <button
            type="button"
            className="tactical-ball-tray-dot"
            onPointerDown={(event) => onBallPointerDown(event, ballMarker.id)}
            onPointerMove={(event) => onBallPointerMove(event, ballMarker.id)}
            onPointerUp={onBallPointerEnd}
            onPointerCancel={onBallPointerEnd}
            aria-label="Drag ball marker"
          />
        ) : null}
      </div>
    </div>
  );
}
