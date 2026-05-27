import React, { PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { RotateCcw, Trash2 } from "lucide-react";
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

function App() {
  const [formation, setFormation] = useState<FormationKey>("2-3-1");
  const [players, setPlayers] = useState<Player[]>(() => createPlayers("2-3-1"));
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);

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
    updatePlayerPosition(event, id);
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLButtonElement>, id: number) => {
    if (draggingId !== id) return;
    updatePlayerPosition(event, id);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
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

  return (
    <main className="min-h-screen bg-stone-100 text-slate-950">
      <div className="app-shell mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:py-8">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Formation board</p>
              <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
                7-a-side lineup designer
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(formations) as FormationKey[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => applyFormation(item)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition ${
                    formation === item
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-slate-800 hover:bg-emerald-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 shadow-xl shadow-slate-200/80 sm:p-5">
            <div
              ref={pitchRef}
              className="pitch relative mx-auto aspect-[7/10] max-h-[calc(100vh-180px)] min-h-[520px] w-full max-w-[620px] overflow-hidden rounded-xl border-[6px] border-white shadow-pitch touch-none select-none"
            >
              <div className="absolute inset-[4%] border-[3px] border-white/95" />
              <div className="absolute left-[4%] right-[4%] top-1/2 h-[3px] -translate-y-1/2 bg-white/95" />
              <div className="absolute left-1/2 top-1/2 h-[22%] w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/95" />
              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />

              <div className="absolute left-1/2 top-[4%] h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/95" />
              <div className="absolute left-1/2 top-[4%] h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/95" />
              <div className="absolute left-1/2 top-[4%] h-[2.2%] w-[20%] -translate-x-1/2 -translate-y-full rounded-t-md border-x-[3px] border-t-[3px] border-white bg-slate-100" />
              <div className="absolute left-1/2 top-[15.5%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />

              <div className="absolute bottom-[4%] left-1/2 h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/95" />
              <div className="absolute bottom-[4%] left-1/2 h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/95" />
              <div className="absolute bottom-[4%] left-1/2 h-[2.2%] w-[20%] -translate-x-1/2 translate-y-full rounded-b-md border-x-[3px] border-b-[3px] border-white bg-slate-100" />
              <div className="absolute bottom-[15.5%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />

              <div className="pointer-events-none absolute inset-[4%] z-[1]">
                {pitchZones.map((zone) => (
                  <div
                    key={zone.name}
                    className="zone-tile absolute grid place-items-center border border-dashed border-white/20"
                    style={{
                      left: `${zone.x1}%`,
                      top: `${zone.y1}%`,
                      width: `${zone.x2 - zone.x1}%`,
                      height: `${zone.y2 - zone.y1}%`,
                    }}
                  >
                    <span>{zone.name}</span>
                  </div>
                ))}
              </div>

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
                    className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 outline-none"
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    aria-label={`Drag ${player.position}`}
                  >
                    <span className="max-w-32 rounded-md bg-slate-950/85 px-2 py-1 text-[10px] font-black uppercase leading-tight text-white shadow-md">
                      {player.position}
                    </span>
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-full border-4 border-white bg-red-600 text-sm font-black text-white shadow-lg shadow-black/30 transition group-active:scale-110 sm:h-14 sm:w-14 ${
                        draggingId === player.id ? "ring-4 ring-red-200" : ""
                      }`}
                    >
                      {player.id}
                    </span>
                    {starterName || substituteName ? (
                      <span className="lineup-name-stack max-w-36 rounded-lg bg-white/95 px-2 py-1 text-slate-950 shadow-md">
                        <span className="block text-xs font-black leading-tight">{starterName || "Starter"}</span>
                        <span className="block border-t border-slate-200 pt-0.5 text-[10px] font-bold leading-tight text-slate-500">
                          {substituteName || "Substitute"}
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/80 sm:p-5 md:sticky md:top-6 md:self-start lg:top-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Players</h2>
              <p className="mt-1 text-sm text-slate-500">Top name starts, bottom name is substitute.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {players.map((player) => (
              <div key={player.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Position {player.id}</span>
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-black uppercase text-emerald-800">
                    {player.position}
                  </span>
                </div>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-xs font-bold text-slate-700">Đá chính</span>
                  <input
                    value={player.starterName}
                    onChange={(event) => renamePlayer(player.id, "starterName", event.target.value)}
                    placeholder="Starter player"
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <label className="mt-2 grid gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Dự bị</span>
                  <input
                    value={player.substituteName}
                    onChange={(event) => renamePlayer(player.id, "substituteName", event.target.value)}
                    placeholder="Substitute player"
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={resetPositions}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              <RotateCcw size={17} aria-hidden="true" />
              Reset
            </button>
            <button
              type="button"
              onClick={clearNames}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Trash2 size={17} aria-hidden="true" />
              Clear
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
