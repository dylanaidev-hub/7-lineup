import React, { PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { Check, Clipboard, Download, Plus, Trash2 } from "lucide-react";
import "./styles.css";

type Player = {
  id: number;
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  x: number;
  y: number;
};

type PitchSize = 5 | 7 | 11 | "custom";
type FormationKey =
  | "1-2-1"
  | "2-1-1"
  | "1-1-2"
  | "2-3-1"
  | "3-2-1"
  | "2-2-2"
  | "4-4-2"
  | "4-3-3"
  | "3-5-2"
  | "custom";
type PitchZone = {
  name: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type SharedLineup = {
  pitchSize?: PitchSize;
  customCount?: number;
  formation: FormationKey;
  players: Pick<Player, "id" | "starterName" | "substituteName" | "extraNames" | "x" | "y">[];
};

const pitchSizes: PitchSize[] = [5, 7, 11];
const pitchOptions: { value: PitchSize; label: string }[] = [
  { value: 5, label: "Sân 5" },
  { value: 7, label: "Sân 7" },
  { value: 11, label: "Sân 11" },
  { value: "custom", label: "Cá nhân hóa" },
];

const pitchZonesBySize: Record<PitchSize, PitchZone[]> = {
  5: [
    { name: "Left Forward", x1: 4, x2: 50, y1: 4, y2: 38 },
    { name: "Right Forward", x1: 50, x2: 96, y1: 4, y2: 38 },
    { name: "Left Midfielder", x1: 4, x2: 34, y1: 38, y2: 68 },
    { name: "Center Midfielder", x1: 34, x2: 66, y1: 38, y2: 68 },
    { name: "Right Midfielder", x1: 66, x2: 96, y1: 38, y2: 68 },
    { name: "Left Defender", x1: 4, x2: 34, y1: 68, y2: 84 },
    { name: "Center Defender", x1: 34, x2: 66, y1: 68, y2: 84 },
    { name: "Right Defender", x1: 66, x2: 96, y1: 68, y2: 84 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
  7: [
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
  ],
  11: [
    { name: "Left Forward", x1: 4, x2: 34, y1: 4, y2: 28 },
    { name: "Striker", x1: 34, x2: 66, y1: 4, y2: 28 },
    { name: "Right Forward", x1: 66, x2: 96, y1: 4, y2: 28 },
    { name: "Left Attacking Midfielder", x1: 4, x2: 34, y1: 28, y2: 45 },
    { name: "Attacking Midfielder", x1: 34, x2: 66, y1: 28, y2: 45 },
    { name: "Right Attacking Midfielder", x1: 66, x2: 96, y1: 28, y2: 45 },
    { name: "Left Midfielder", x1: 4, x2: 30, y1: 45, y2: 62 },
    { name: "Center Midfielder", x1: 30, x2: 70, y1: 45, y2: 62 },
    { name: "Right Midfielder", x1: 70, x2: 96, y1: 45, y2: 62 },
    { name: "Left Back", x1: 4, x2: 24, y1: 62, y2: 84 },
    { name: "Left Center Back", x1: 24, x2: 50, y1: 62, y2: 84 },
    { name: "Right Center Back", x1: 50, x2: 76, y1: 62, y2: 84 },
    { name: "Right Back", x1: 76, x2: 96, y1: 62, y2: 84 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
  custom: [
    { name: "Left Forward", x1: 4, x2: 34, y1: 4, y2: 28 },
    { name: "Striker", x1: 34, x2: 66, y1: 4, y2: 28 },
    { name: "Right Forward", x1: 66, x2: 96, y1: 4, y2: 28 },
    { name: "Left Midfielder", x1: 4, x2: 34, y1: 28, y2: 62 },
    { name: "Center Midfielder", x1: 34, x2: 66, y1: 28, y2: 62 },
    { name: "Right Midfielder", x1: 66, x2: 96, y1: 28, y2: 62 },
    { name: "Left Defender", x1: 4, x2: 34, y1: 62, y2: 84 },
    { name: "Center Defender", x1: 34, x2: 66, y1: 62, y2: 84 },
    { name: "Right Defender", x1: 66, x2: 96, y1: 62, y2: 84 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
};

const getZoneName = (pitchSize: PitchSize, x: number, y: number) =>
  pitchZonesBySize[pitchSize].find((zone) => x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2)?.name ??
  "Free Role";

const formationsBySize: Record<
  PitchSize,
  Partial<Record<FormationKey, Omit<Player, "position" | "starterName" | "substituteName" | "extraNames">[]>>
> = {
  5: {
    "1-2-1": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 50, y: 70 },
      { id: 3, x: 35, y: 48 },
      { id: 4, x: 65, y: 48 },
      { id: 5, x: 50, y: 22 },
    ],
    "2-1-1": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 34, y: 70 },
      { id: 3, x: 66, y: 70 },
      { id: 4, x: 50, y: 48 },
      { id: 5, x: 50, y: 22 },
    ],
    "1-1-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 50, y: 70 },
      { id: 3, x: 50, y: 48 },
      { id: 4, x: 36, y: 22 },
      { id: 5, x: 64, y: 22 },
    ],
  },
  7: {
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
  },
  11: {
    "4-4-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 16, y: 70 },
      { id: 3, x: 38, y: 72 },
      { id: 4, x: 62, y: 72 },
      { id: 5, x: 84, y: 70 },
      { id: 6, x: 18, y: 50 },
      { id: 7, x: 40, y: 50 },
      { id: 8, x: 60, y: 50 },
      { id: 9, x: 82, y: 50 },
      { id: 10, x: 40, y: 20 },
      { id: 11, x: 60, y: 20 },
    ],
    "4-3-3": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 16, y: 70 },
      { id: 3, x: 38, y: 72 },
      { id: 4, x: 62, y: 72 },
      { id: 5, x: 84, y: 70 },
      { id: 6, x: 30, y: 50 },
      { id: 7, x: 50, y: 48 },
      { id: 8, x: 70, y: 50 },
      { id: 9, x: 24, y: 20 },
      { id: 10, x: 50, y: 18 },
      { id: 11, x: 76, y: 20 },
    ],
    "3-5-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 28, y: 72 },
      { id: 3, x: 50, y: 73 },
      { id: 4, x: 72, y: 72 },
      { id: 5, x: 14, y: 52 },
      { id: 6, x: 36, y: 50 },
      { id: 7, x: 50, y: 46 },
      { id: 8, x: 64, y: 50 },
      { id: 9, x: 86, y: 52 },
      { id: 10, x: 40, y: 20 },
      { id: 11, x: 60, y: 20 },
    ],
  },
  custom: {
    custom: [],
  },
};

const getFormationEntries = (pitchSize: PitchSize) =>
  Object.entries(formationsBySize[pitchSize]) as [FormationKey, Omit<Player, "position" | "starterName" | "substituteName" | "extraNames">[]][];

const getDefaultFormation = (pitchSize: PitchSize) => getFormationEntries(pitchSize)[0][0];

const createCustomFormationPoints = (count: number) => {
  const playerCount = Math.min(11, Math.max(1, Math.round(count)));
  if (playerCount === 1) {
    return [{ id: 1, x: 50, y: 90 }];
  }

  const rows = [
    { y: 72, slots: Math.min(4, Math.max(1, Math.ceil((playerCount - 1) * 0.35))) },
    { y: 48, slots: Math.min(5, Math.max(1, Math.ceil((playerCount - 1) * 0.4))) },
    { y: 22, slots: 0 },
  ];
  rows[2].slots = Math.max(0, playerCount - 1 - rows[0].slots - rows[1].slots);

  const points = [{ id: 1, x: 50, y: 90 }];
  rows.forEach((row) => {
    const slots = row.slots;
    if (slots <= 0) return;

    Array.from({ length: slots }).forEach((_, index) => {
      const x = slots === 1 ? 50 : 16 + (68 / (slots - 1)) * index;
      points.push({ id: points.length + 1, x, y: row.y });
    });
  });

  return points.slice(0, playerCount);
};

const getFormationPoints = (pitchSize: PitchSize, formation: FormationKey, customCount = 8) =>
  pitchSize === "custom"
    ? createCustomFormationPoints(customCount)
    : formationsBySize[pitchSize][formation] ?? formationsBySize[pitchSize][getDefaultFormation(pitchSize)]!;

const isPitchSize = (value: unknown): value is PitchSize =>
  value === "custom" || (typeof value === "number" && pitchSizes.includes(value as PitchSize));

const createPlayers = (
  pitchSize: PitchSize,
  formation: FormationKey,
  customCount: number,
  roster?: Pick<Player, "starterName" | "substituteName" | "extraNames">[],
): Player[] =>
  getFormationPoints(pitchSize, formation, customCount).map((point, index) => ({
    ...point,
    position: getZoneName(pitchSize, point.x, point.y),
    starterName: roster?.[index]?.starterName ?? "",
    substituteName: roster?.[index]?.substituteName ?? "",
    extraNames: roster?.[index]?.extraNames ?? [],
  }));

const isFormationKey = (value: unknown): value is FormationKey =>
  typeof value === "string" &&
  pitchOptions.some((option) => Object.prototype.hasOwnProperty.call(formationsBySize[option.value], value));

const clampCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(96, Math.max(4, value)) : fallback;

const clampCustomCount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(11, Math.max(1, Math.round(value))) : 8;

const createPlayersFromSharedLineup = (sharedLineup: SharedLineup): Player[] => {
  const pitchSize = sharedLineup.pitchSize ?? 7;
  const customCount = clampCustomCount(sharedLineup.customCount);
  return getFormationPoints(pitchSize, sharedLineup.formation, customCount).map((point) => {
    const sharedPlayer = sharedLineup.players.find((player) => player.id === point.id);
    const x = clampCoordinate(sharedPlayer?.x, point.x);
    const y = clampCoordinate(sharedPlayer?.y, point.y);

    return {
      ...point,
      x,
      y,
      position: getZoneName(pitchSize, x, y),
      starterName: sharedPlayer?.starterName ?? "",
      substituteName: sharedPlayer?.substituteName ?? "",
      extraNames: Array.isArray(sharedPlayer?.extraNames) ? sharedPlayer.extraNames : [],
    };
  });
};

const encodeSharePayload = (pitchSize: PitchSize, formation: FormationKey, customCount: number, players: Player[]) => {
  const payload: SharedLineup = {
    pitchSize,
    customCount: pitchSize === "custom" ? customCount : undefined,
    formation,
    players: players.map(({ id, starterName, substituteName, extraNames, x, y }) => ({
      id,
      starterName,
      substituteName,
      extraNames,
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

    const pitchSize = isPitchSize(parsed.pitchSize) ? parsed.pitchSize : 7;

    if (!isFormationKey(parsed.formation) || !formationsBySize[pitchSize][parsed.formation] || !Array.isArray(parsed.players)) {
      return null;
    }

    return {
      pitchSize,
      customCount: clampCustomCount(parsed.customCount),
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

const getRegisteredNames = (player: Player) =>
  [player.starterName, player.substituteName, ...player.extraNames].map((name) => name.trim()).filter(Boolean);

const getBenchNames = (player: Player) =>
  [player.substituteName, ...player.extraNames].map((name) => name.trim()).filter(Boolean);

const getBenchCount = (players: Player[]) => players.reduce((total, player) => total + getBenchNames(player).length, 0);

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
};

const drawCenteredLabel = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color = "#ffffff",
) => {
  context.font = `900 ${fontSize}px Inter, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(16, 42, 25, 0.64)";
  drawRoundedRect(context, x - maxWidth / 2, y - fontSize, maxWidth, fontSize * 1.75, fontSize);
  context.fillStyle = color;
  context.fillText(text.toUpperCase(), x, y, maxWidth - 12);
};

function App() {
  const sharedLineup = useMemo(() => getSharedLineupFromUrl(), []);
  const [pitchSize, setPitchSize] = useState<PitchSize>(() => sharedLineup?.pitchSize ?? 7);
  const [formation, setFormation] = useState<FormationKey>(() => sharedLineup?.formation ?? "2-3-1");
  const [customCount, setCustomCount] = useState(() => clampCustomCount(sharedLineup?.customCount));
  const [players, setPlayers] = useState<Player[]>(() =>
    sharedLineup ? createPlayersFromSharedLineup(sharedLineup) : createPlayers(7, "2-3-1", 8),
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const benchCount = getBenchCount(players);
  const formationEntries = getFormationEntries(pitchSize);

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
              position: getZoneName(pitchSize, x, y),
              x,
              y,
            }
          : player,
      ),
    );
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    dragStartRef.current = { id, x: event.clientX, y: event.clientY };
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (draggingId !== id) return;
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.id !== id) return;

    const movedX = event.clientX - dragStart.x;
    const movedY = event.clientY - dragStart.y;
    if (Math.hypot(movedX, movedY) < 6) return;

    updatePlayerPosition(event, id);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    dragStartRef.current = null;
  };

  const renamePlayer = (id: number, field: "starterName" | "substituteName", name: string) => {
    setPlayers((current) => current.map((player) => (player.id === id ? { ...player, [field]: name } : player)));
  };

  const renameExtraPlayer = (id: number, index: number, name: string) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? {
              ...player,
              extraNames: player.extraNames.map((extraName, extraIndex) => (extraIndex === index ? name : extraName)),
            }
          : player,
      ),
    );
  };

  const addPlayerInput = (id: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id && player.extraNames.length < 1
          ? { ...player, extraNames: [...player.extraNames, ""] }
          : player,
      ),
    );
  };

  const removeExtraPlayerInput = (id: number, index: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? { ...player, extraNames: player.extraNames.filter((_, extraIndex) => extraIndex !== index) }
          : player,
      ),
    );
  };

  const applyFormation = (nextFormation: FormationKey) => {
    setFormation(nextFormation);
    setPlayers((current) => createPlayers(pitchSize, nextFormation, customCount, current));
  };

  const applyPitchSize = (nextPitchSize: PitchSize) => {
    const nextFormation = getDefaultFormation(nextPitchSize);
    setPitchSize(nextPitchSize);
    setFormation(nextFormation);
    setPlayers((current) => createPlayers(nextPitchSize, nextFormation, customCount, current));
  };

  const applyCustomCount = (nextCount: number) => {
    const count = clampCustomCount(nextCount);
    setCustomCount(count);
    setPitchSize("custom");
    setFormation("custom");
    setPlayers((current) => createPlayers("custom", "custom", count, current));
  };

  const resetPositions = () => {
    setPlayers((current) => createPlayers(pitchSize, formation, customCount, current));
  };

  const clearNames = () => {
    setPlayers((current) =>
      current.map((player) => ({ ...player, starterName: "", substituteName: "", extraNames: [] })),
    );
  };

  const copyShareLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("lineup", encodeSharePayload(pitchSize, formation, customCount, players));

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      window.prompt("Copy share link", url.toString());
    }
  };

  const downloadLineupImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 2000;

    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    const px = (value: number) => (value / 100) * width;
    const py = (value: number) => (value / 100) * height;

    const fieldGradient = context.createLinearGradient(0, 0, width, height);
    fieldGradient.addColorStop(0, "#37a84f");
    fieldGradient.addColorStop(0.5, "#2e9849");
    fieldGradient.addColorStop(1, "#2a8841");
    context.fillStyle = fieldGradient;
    context.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 116) {
      context.fillStyle = "rgba(255,255,255,0.055)";
      context.fillRect(0, y, width, 58);
      context.fillStyle = "rgba(0,0,0,0.04)";
      context.fillRect(0, y + 58, width, 58);
    }

    context.strokeStyle = "rgba(255,255,255,0.9)";
    context.lineWidth = 6;
    context.strokeRect(px(4), py(4), px(92), py(92));
    context.beginPath();
    context.moveTo(px(4), py(50));
    context.lineTo(px(96), py(50));
    context.stroke();
    context.beginPath();
    context.arc(px(50), py(50), px(15.5), 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(px(50), py(50), 8, 0, Math.PI * 2);
    context.fill();
    context.strokeRect(px(26), py(4), px(48), py(15));
    context.strokeRect(px(37), py(4), px(26), py(7));
    context.strokeRect(px(26), py(81), px(48), py(15));
    context.strokeRect(px(37), py(89), px(26), py(7));

    players.forEach((player) => {
      const x = px(player.x);
      const y = py(player.y);
      const starterName = player.starterName.trim() || `Player ${player.id}`;
      const benchNames = getBenchNames(player);

      context.save();
      context.shadowColor = "rgba(0,0,0,0.34)";
      context.shadowBlur = 18;
      context.shadowOffsetY = 10;
      context.fillStyle = "#f8fafc";
      context.beginPath();
      context.arc(x, y, 44, 0, Math.PI * 2);
      context.fill();
      context.shadowColor = "transparent";
      context.strokeStyle = "#ffffff";
      context.lineWidth = 8;
      context.stroke();
      context.fillStyle = "#111827";
      context.font = "950 36px Inter, Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(player.id), x, y + 1);
      context.restore();

      drawCenteredLabel(context, starterName, x, y + 62, 170, 18);
      if (benchNames.length > 0) {
        context.font = "900 15px Inter, Arial, sans-serif";
        const labelWidth = Math.min(260, Math.max(120, benchNames.join(" / ").length * 8));
        context.fillStyle = "rgba(16, 42, 25, 0.58)";
        drawRoundedRect(context, x - labelWidth / 2, y + 78, labelWidth, 30, 15);
        context.fillStyle = "#d9ffe6";
        context.fillText(benchNames.join(" / ").toUpperCase(), x, y + 94, labelWidth - 12);
      }
    });

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${pitchSize}-lineup-football-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  return (
    <main className="match-bg min-h-screen p-4 text-slate-900 antialiased sm:p-6 lg:p-10">
      <header className="app-title-bar mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-3 shadow-2xl">
        <h1>Line Up Football</h1>
        <div className="pitch-size-switch header-pitch-size-switch" aria-label="Choose pitch size">
          {pitchOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => applyPitchSize(option.value)}
              className={pitchSize === option.value ? "active" : ""}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      <div className="dashboard-shell mx-auto grid w-full max-w-5xl overflow-hidden shadow-2xl">
        <div className="content-grid">
            <section className="stats-column">
              <div className="panel-heading">
                <span>Squad editor</span>
                <strong>{benchCount}/{players.length} subs</strong>
              </div>
              <div className="squad-editor">
                {players.map((player) => (
                  <div key={player.id} className="squad-row">
                    <div className="squad-row-header">
                      <span>{player.id}</span>
                      <strong>{player.position}</strong>
                      <button
                        type="button"
                        onClick={() => addPlayerInput(player.id)}
                        disabled={player.extraNames.length >= 1}
                        aria-label={`Add player ${player.id}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="squad-input-list">
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
                      {player.extraNames.slice(0, 1).map((extraName, index) => (
                        <div key={index} className="extra-player-input">
                          <input
                            value={extraName}
                            onChange={(event) => renameExtraPlayer(player.id, index, event.target.value)}
                            placeholder={`Cầu thủ ${index + 3}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeExtraPlayerInput(player.id, index)}
                            aria-label={`Remove player ${index + 3}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="lineup-column">
              <div className="lineup-header">
                <span>{pitchSize === "custom" ? "Cá nhân hóa" : `Sân ${pitchSize}`} line up</span>
                <div className="lineup-header-actions">
                  <button type="button" className="share-button" onClick={copyShareLink}>
                    {copyStatus === "copied" ? <Check size={14} /> : <Clipboard size={14} />}
                    {copyStatus === "copied" ? "Copied" : "Share"}
                  </button>
                  <button type="button" className="download-button" onClick={downloadLineupImage}>
                    <Download size={14} />
                    Download
                  </button>
                  <button type="button" onClick={clearNames}>
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              </div>
              <div className="formation-switch">
                {formationEntries.map(([item]) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyFormation(item)}
                    className={formation === item ? "active" : ""}
                  >
                    {item === "custom" ? "Tự tạo" : item}
                  </button>
                ))}
              </div>
              {pitchSize === "custom" ? (
                <div className="custom-lineup-control">
                  <label>
                    <span>Số cầu thủ</span>
                    <input
                      type="number"
                      min={1}
                      max={11}
                      value={customCount}
                      onChange={(event) => applyCustomCount(Number(event.target.value))}
                    />
                  </label>
                </div>
              ) : null}

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
                  const starterName = player.starterName.trim() || `Player ${player.id}`;
                  const benchNames = getBenchNames(player);

                  return (
                    <div
                      key={player.id}
                      onPointerDown={(event) => handleDragStart(event, player.id)}
                      onPointerMove={(event) => handleDragMove(event, player.id)}
                      onPointerUp={stopDragging}
                      onPointerCancel={stopDragging}
                      className="player-token group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none"
                      style={{ left: `${player.x}%`, top: `${player.y}%` }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Drag ${player.position}`}
                    >
                      <span
                        className={`kit-disc transition group-active:scale-110 ${
                          draggingId === player.id ? "ring-4 ring-emerald-200" : ""
                        }`}
                      >
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
