import React, { PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { Check, Clipboard, RotateCcw, Trash2 } from "lucide-react";
import "./styles.css";

type Player = {
  id: number;
  position: string;
  starterName: string;
  substituteName: string;
  x: number;
  y: number;
};

type FormationKey = "2-3-1" | "3-2-1" | "2-2-2";
type PitchZone = {
  name: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type SharedLineup = {
  formation: FormationKey;
  players: Pick<Player, "id" | "starterName" | "substituteName" | "x" | "y">[];
};

const pitchZones: PitchZone[] = [
  { name: "Left Forward", x1: 4, x2: 36, y1: 4, y2: 34 },
  { name: "Striker", x1: 36, x2: 64, y1: 4, y2: 34 },
  { name: "Right Forward", x1: 64, x2: 96, y1: 4, y2: 34 },
  { name: "Left Midfielder", x1: 4, x2: 34, y1: 34, y2: 62 },
  { name: "Center Midfielder", x1: 34, x2: 66, y1: 34, y2: 62 },
  { name: "Right Midfielder", x1: 66, x2: 96, y1: 34, y2: 62 },
  { name: "Left Defender", x1: 4, x2: 34, y1: 62, y2: 82 },
  { name: "Center Defender", x1: 34, x2: 66, y1: 62, y2: 82 },
  { name: "Right Defender", x1: 66, x2: 96, y1: 62, y2: 82 },
  { name: "Goalkeeper", x1: 4, x2: 96, y1: 82, y2: 96 },
];

const getZoneName = (x: number, y: number) =>
  pitchZones.find((zone) => x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2)?.name ?? "Free Role";

const formations: Record<FormationKey, Omit<Player, "position" | "starterName" | "substituteName">[]> = {
  "2-3-1": [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 34, y: 68 },
    { id: 3, x: 66, y: 68 },
    { id: 4, x: 24, y: 45 },
    { id: 5, x: 50, y: 42 },
    { id: 6, x: 76, y: 45 },
    { id: 7, x: 50, y: 20 },
  ],
  "3-2-1": [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 25, y: 68 },
    { id: 3, x: 50, y: 70 },
    { id: 4, x: 75, y: 68 },
    { id: 5, x: 38, y: 43 },
    { id: 6, x: 62, y: 43 },
    { id: 7, x: 50, y: 19 },
  ],
  "2-2-2": [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 34, y: 68 },
    { id: 3, x: 66, y: 68 },
    { id: 4, x: 34, y: 45 },
    { id: 5, x: 66, y: 45 },
    { id: 6, x: 39, y: 21 },
    { id: 7, x: 61, y: 21 },
  ],
};

const createPlayers = (formation: FormationKey, roster?: Pick<Player, "starterName" | "substituteName">[]): Player[] =>
  formations[formation].map((point, index) => ({
    ...point,
    position: getZoneName(point.x, point.y),
    starterName: roster?.[index]?.starterName ?? "",
    substituteName: roster?.[index]?.substituteName ?? "",
  }));

const isFormationKey = (value: unknown): value is FormationKey =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(formations, value);

const clampCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(96, Math.max(4, value)) : fallback;

const createPlayersFromSharedLineup = (sharedLineup: SharedLineup): Player[] =>
  formations[sharedLineup.formation].map((point) => {
    const sharedPlayer = sharedLineup.players.find((player) => player.id === point.id);
    const x = clampCoordinate(sharedPlayer?.x, point.x);
    const y = clampCoordinate(sharedPlayer?.y, point.y);

    return {
      ...point,
      x,
      y,
      position: getZoneName(x, y),
      starterName: sharedPlayer?.starterName ?? "",
      substituteName: sharedPlayer?.substituteName ?? "",
    };
  });

const encodeSharePayload = (formation: FormationKey, players: Player[]) => {
  const payload: SharedLineup = {
    formation,
    players: players.map(({ id, starterName, substituteName, x, y }) => ({
      id,
      starterName,
      substituteName,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    })),
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const decodeSharePayload = (value: string): SharedLineup | null => {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SharedLineup>;

    if (!isFormationKey(parsed.formation) || !Array.isArray(parsed.players)) {
      return null;
    }

    return {
      formation: parsed.formation,
      players: parsed.players.filter((player) => typeof player?.id === "number") as SharedLineup["players"],
    };
  } catch {
    return null;
  }
};

const getSharedLineupFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get("lineup");
  return value ? decodeSharePayload(value) : null;
};

function App() {
  const sharedLineup = useMemo(() => getSharedLineupFromUrl(), []);
  const [formation, setFormation] = useState<FormationKey>(() => sharedLineup?.formation ?? "2-3-1");
  const [players, setPlayers] = useState<Player[]>(() =>
    sharedLineup ? createPlayersFromSharedLineup(sharedLineup) : createPlayers("2-3-1"),
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const updatePlayerPosition = (event: ReactPointerEvent<Element>, id: number) => {
    const pitch = pitchRef.current;
    if (!pitch) return;

    const rect = pitch.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(96, Math.max(4, ((event.clientY - rect.top) / rect.height) * 100));

    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? {
              ...player,
              position: getZoneName(x, y),
              x,
              y,
            }
          : player,
      ),
    );
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLButtonElement>, id: number) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    dragStartRef.current = { id, x: event.clientX, y: event.clientY };
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLButtonElement>, id: number) => {
    if (draggingId !== id) return;
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.id !== id) return;

    const movedX = event.clientX - dragStart.x;
    const movedY = event.clientY - dragStart.y;
    if (Math.hypot(movedX, movedY) < 6) return;

    updatePlayerPosition(event, id);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    dragStartRef.current = null;
  };

  const renamePlayer = (id: number, field: "starterName" | "substituteName", name: string) => {
    setPlayers((current) => current.map((player) => (player.id === id ? { ...player, [field]: name } : player)));
  };

  const applyFormation = (nextFormation: FormationKey) => {
    setFormation(nextFormation);
    setPlayers((current) => createPlayers(nextFormation, current));
  };

  const resetPositions = () => {
    setPlayers((current) => createPlayers(formation, current));
  };

  const clearNames = () => {
    setPlayers((current) => current.map((player) => ({ ...player, starterName: "", substituteName: "" })));
  };

  const copyShareLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("lineup", encodeSharePayload(formation, players));

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      window.prompt("Copy share link", url.toString());
    }
  };

  return (
    <main className="match-bg min-h-screen p-4 text-slate-900 antialiased sm:p-6 lg:p-10">
      <header className="app-title-bar mx-auto flex w-full max-w-5xl items-center justify-center shadow-2xl">
        <h1>7 LINEUP FOOTBALL</h1>
      </header>
      <div className="dashboard-shell mx-auto grid w-full max-w-5xl overflow-hidden shadow-2xl">
        <div className="content-grid">
            <section className="stats-column">
              <div className="panel-heading">Squad editor</div>
              <div className="squad-editor">
                {players.map((player) => (
                  <div key={player.id} className="squad-row">
                    <span>{player.id}</span>
                    <input
                      value={player.starterName}
                      onChange={(event) => renamePlayer(player.id, "starterName", event.target.value)}
                      placeholder="Đá chính"
                    />
                    <input
                      value={player.substituteName}
                      onChange={(event) => renamePlayer(player.id, "substituteName", event.target.value)}
                      placeholder="Dự bị"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="lineup-column">
              <div className="lineup-header">
                <span>Line up</span>
                <div className="lineup-header-actions">
                  <button type="button" className="share-button" onClick={copyShareLink}>
                    {copyStatus === "copied" ? <Check size={14} /> : <Clipboard size={14} />}
                    {copyStatus === "copied" ? "Copied" : "Share"}
                  </button>
                  <button type="button" onClick={resetPositions}>
                    <RotateCcw size={14} />
                    Reset
                  </button>
                  <button type="button" onClick={clearNames}>
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              </div>
              <div className="formation-switch">
                {(Object.keys(formations) as FormationKey[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyFormation(item)}
                    className={formation === item ? "active" : ""}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div
                ref={pitchRef}
                className="pitch relative mx-auto aspect-[7/10] overflow-hidden border-[4px] border-white/80 touch-none select-none"
              >
                <div className="absolute inset-[4%] border-[3px] border-white/90" />
                <div className="absolute left-[4%] right-[4%] top-1/2 h-[3px] -translate-y-1/2 bg-white/90" />
                <div className="absolute left-1/2 top-1/2 h-[22%] w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/90" />
                <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                <div className="absolute left-1/2 top-[4%] h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
                <div className="absolute left-1/2 top-[4%] h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
                <div className="absolute bottom-[4%] left-1/2 h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />
                <div className="absolute bottom-[4%] left-1/2 h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />

                {players.map((player) => {
                  const starterName = player.starterName.trim();
                  const substituteName = player.substituteName.trim();

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onPointerDown={(event) => handleDragStart(event, player.id)}
                      onPointerMove={(event) => handleDragMove(event, player.id)}
                      onPointerUp={stopDragging}
                      onPointerCancel={stopDragging}
                      className="player-token group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none"
                      style={{ left: `${player.x}%`, top: `${player.y}%` }}
                      aria-label={`Drag ${player.position}`}
                    >
                      <span
                        className={`kit-disc transition group-active:scale-110 ${
                          draggingId === player.id ? "ring-4 ring-emerald-200" : ""
                        }`}
                      >
                        <span className="kit-number">{player.id}</span>
                      </span>
                      <span className="token-name">{starterName || `Player ${player.id}`}</span>
                      {substituteName ? <small>{substituteName}</small> : null}
                    </button>
                  );
                })}
              </div>
            </section>
        </div>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
