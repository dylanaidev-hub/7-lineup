import React, { PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { Check, Clipboard, Download, Pencil, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import "./styles.css";

type Player = {
  id: number;
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  x: number;
  y: number;
  onPitch: boolean;
};

type FormationPoint = {
  id: number;
  x: number;
  y: number;
};

type OpponentMarker = {
  id: number;
  x: number;
  y: number;
  onPitch: boolean;
};

type DrawLine = {
  id: number;
  points: { x: number; y: number }[];
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
  players: Pick<Player, "id" | "starterName" | "substituteName" | "extraNames" | "x" | "y" | "onPitch">[];
  opponentMarkers?: OpponentMarker[];
  drawLines?: DrawLine[];
};

const pitchSizes: PitchSize[] = [5, 7, 11];
const pitchOptions: { value: PitchSize; label: string }[] = [
  { value: 5, label: "Sân 5" },
  { value: 7, label: "Sân 7" },
  { value: 11, label: "Sân 11" },
  { value: "custom", label: "Cá nhân hóa" },
];

const createOpponentMarkers = (): OpponentMarker[] =>
  Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    x: 50,
    y: 50,
    onPitch: false,
  }));

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
  Partial<Record<FormationKey, FormationPoint[]>>
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
  Object.entries(formationsBySize[pitchSize]) as [FormationKey, FormationPoint[]][];

const getDefaultFormation = (pitchSize: PitchSize) => getFormationEntries(pitchSize)[0][0];

const createCustomFormationPoints = (count: number) => {
  const playerCount = Math.min(11, Math.max(1, Math.round(count)));
  const baseFive: FormationPoint[] = [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 50, y: 70 },
    { id: 3, x: 35, y: 48 },
    { id: 4, x: 65, y: 48 },
    { id: 5, x: 50, y: 22 },
  ];

  if (playerCount <= 5) {
    return baseFive.slice(0, playerCount);
  }

  const extraPoints: FormationPoint[] = [
    { id: 6, x: 24, y: 70 },
    { id: 7, x: 76, y: 70 },
    { id: 8, x: 50, y: 48 },
    { id: 9, x: 24, y: 30 },
    { id: 10, x: 76, y: 30 },
    { id: 11, x: 50, y: 14 },
  ];

  return [...baseFive, ...extraPoints].slice(0, playerCount);
};

const getFormationPoints = (pitchSize: PitchSize, formation: FormationKey, customCount = 8) =>
  pitchSize === "custom"
    ? createCustomFormationPoints(11)
    : formationsBySize[pitchSize][formation] ?? formationsBySize[pitchSize][getDefaultFormation(pitchSize)]!;

const isPitchSize = (value: unknown): value is PitchSize =>
  value === "custom" || (typeof value === "number" && pitchSizes.includes(value as PitchSize));

const createPlayers = (
  pitchSize: PitchSize,
  formation: FormationKey,
  customCount: number,
  roster?: Pick<Player, "starterName" | "substituteName" | "extraNames" | "onPitch">[],
): Player[] =>
  getFormationPoints(pitchSize, formation, customCount).map((point, index) => ({
    ...point,
    position: getZoneName(pitchSize, point.x, point.y),
    starterName: roster?.[index]?.starterName ?? "",
    substituteName: roster?.[index]?.substituteName ?? "",
    extraNames: roster?.[index]?.extraNames ?? [],
    onPitch: pitchSize === "custom" ? (roster?.[index]?.onPitch ?? index < customCount) : true,
  }));

const isFormationKey = (value: unknown): value is FormationKey =>
  typeof value === "string" &&
  pitchOptions.some((option) => Object.prototype.hasOwnProperty.call(formationsBySize[option.value], value));

const clampCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(96, Math.max(4, value)) : fallback;

const clampDrawCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;

const clampCustomCount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(11, Math.max(0, Math.round(value))) : 0;

const createOpponentMarkersFromSharedLineup = (sharedLineup: SharedLineup): OpponentMarker[] => {
  const sharedMarkers = Array.isArray(sharedLineup.opponentMarkers) ? sharedLineup.opponentMarkers : [];

  return createOpponentMarkers().map((marker) => {
    const sharedMarker = sharedMarkers.find((item) => item.id === marker.id);
    return sharedMarker
      ? {
          id: marker.id,
          x: clampCoordinate(sharedMarker.x, marker.x),
          y: clampCoordinate(sharedMarker.y, marker.y),
          onPitch: Boolean(sharedMarker.onPitch),
        }
      : marker;
  });
};

const createDrawLinesFromSharedLineup = (sharedLineup: SharedLineup): DrawLine[] =>
  Array.isArray(sharedLineup.drawLines)
    ? sharedLineup.drawLines
        .filter((line) => typeof line?.id === "number" && Array.isArray(line.points))
        .map((line) => ({
          id: line.id,
          points: line.points
            .filter((point) => typeof point?.x === "number" && typeof point?.y === "number")
            .map((point) => ({
              x: clampDrawCoordinate(point.x, 50),
              y: clampDrawCoordinate(point.y, 50),
            })),
        }))
        .filter((line) => line.points.length > 0)
    : [];

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
      onPitch: pitchSize === "custom" ? (sharedPlayer?.onPitch ?? point.id <= customCount) : true,
    };
  });
};

const encodeSharePayload = (
  pitchSize: PitchSize,
  formation: FormationKey,
  customCount: number,
  players: Player[],
  opponentMarkers: OpponentMarker[],
  drawLines: DrawLine[],
) => {
  const payload: SharedLineup = {
    pitchSize,
    customCount: pitchSize === "custom" ? customCount : undefined,
    formation,
    players: players.map(({ id, starterName, substituteName, extraNames, x, y, onPitch }) => ({
      id,
      starterName,
      substituteName,
      extraNames,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      onPitch,
    })),
    opponentMarkers:
      pitchSize === "custom"
        ? opponentMarkers.map(({ id, x, y, onPitch }) => ({
            id,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            onPitch,
          }))
        : undefined,
    drawLines:
      pitchSize === "custom"
        ? drawLines.map((line) => ({
            id: line.id,
            points: line.points.map((point) => ({
              x: Math.round(point.x * 10) / 10,
              y: Math.round(point.y * 10) / 10,
            })),
          }))
        : undefined,
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
      opponentMarkers: Array.isArray(parsed.opponentMarkers) ? parsed.opponentMarkers : [],
      drawLines: Array.isArray(parsed.drawLines) ? parsed.drawLines : [],
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

function App() {
  const sharedLineup = useMemo(() => getSharedLineupFromUrl(), []);
  const initialPitchSize = sharedLineup?.pitchSize ?? 7;
  const initialFormation = sharedLineup?.formation ?? "2-3-1";
  const initialCustomCount = clampCustomCount(sharedLineup?.customCount);
  const initialPlayers = sharedLineup
    ? createPlayersFromSharedLineup(sharedLineup)
    : createPlayers(initialPitchSize, initialFormation, initialCustomCount || 5);
  const [pitchSize, setPitchSize] = useState<PitchSize>(() => sharedLineup?.pitchSize ?? 7);
  const [formation, setFormation] = useState<FormationKey>(() => sharedLineup?.formation ?? "2-3-1");
  const [customCount, setCustomCount] = useState(() => initialCustomCount);
  const [players, setPlayers] = useState<Player[]>(() => initialPlayers);
  const [savedPlayersByPitch, setSavedPlayersByPitch] = useState<Partial<Record<PitchSize, Player[]>>>(() => ({
    [initialPitchSize]: initialPlayers,
  }));
  const [savedFormationByPitch, setSavedFormationByPitch] = useState<Partial<Record<PitchSize, FormationKey>>>(() => ({
    [initialPitchSize]: initialFormation,
  }));
  const [savedCustomCountByPitch, setSavedCustomCountByPitch] = useState<Partial<Record<PitchSize, number>>>(() => ({
    [initialPitchSize]: initialCustomCount,
  }));
  const [opponentMarkers, setOpponentMarkers] = useState<OpponentMarker[]>(() =>
    sharedLineup?.pitchSize === "custom" ? createOpponentMarkersFromSharedLineup(sharedLineup) : createOpponentMarkers(),
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingOpponentId, setDraggingOpponentId] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{ type: "player" | "opponent"; id: number; x: number; y: number } | null>(
    null,
  );
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawLines, setDrawLines] = useState<DrawLine[]>(() =>
    sharedLineup?.pitchSize === "custom" ? createDrawLinesFromSharedLineup(sharedLineup) : [],
  );
  const [redoDrawLines, setRedoDrawLines] = useState<DrawLine[]>([]);
  const [activeDrawLineId, setActiveDrawLineId] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [selectedMobilePlayerId, setSelectedMobilePlayerId] = useState(1);
  const pitchRef = useRef<HTMLDivElement>(null);
  const drawLayerRef = useRef<SVGSVGElement>(null);
  const dragStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const activePlayers = pitchSize === "custom" ? players.filter((player) => player.onPitch) : players;
  const benchCount = getBenchCount(activePlayers);
  const formationEntries = getFormationEntries(pitchSize);
  const selectedMobilePlayer =
    activePlayers.find((player) => player.id === selectedMobilePlayerId) ?? activePlayers[0] ?? null;

  const getPitchPointerPosition = (event: ReactPointerEvent<Element>, options: { clamp?: boolean } = {}) => {
    const pitch = pitchRef.current;
    if (!pitch) return null;

    const rect = pitch.getBoundingClientRect();
    const styles = window.getComputedStyle(pitch);
    const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
    const contentLeft = rect.left + borderLeft;
    const contentTop = rect.top + borderTop;
    const contentWidth = pitch.clientWidth;
    const contentHeight = pitch.clientHeight;
    const rawX = ((event.clientX - contentLeft) / contentWidth) * 100;
    const rawY = ((event.clientY - contentTop) / contentHeight) * 100;
    const shouldClamp = options.clamp ?? true;

    return {
      isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
      x: shouldClamp ? Math.min(96, Math.max(4, rawX)) : rawX,
      y: shouldClamp ? Math.min(96, Math.max(4, rawY)) : rawY,
    };
  };

  const getDrawPointerPosition = (event: ReactPointerEvent<Element>) => {
    const drawLayer = drawLayerRef.current;
    if (!drawLayer) return null;

    const rect = drawLayer.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 100;

    return {
      isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
      x: rawX,
      y: rawY,
    };
  };

  const updatePlayerPosition = (event: ReactPointerEvent<Element>, id: number) => {
    const position = getPitchPointerPosition(event, { clamp: pitchSize !== "custom" });
    if (!position) return;
    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });

    if (pitchSize === "custom") return;

    setPlayers((current) => {
      const nextPlayers = current.map((player) =>
        player.id === id
          ? {
              ...player,
              position: getZoneName(
                pitchSize,
                position.isInside ? Math.min(96, Math.max(4, position.x)) : player.x,
                position.isInside ? Math.min(96, Math.max(4, position.y)) : player.y,
              ),
              x: position.isInside ? Math.min(96, Math.max(4, position.x)) : player.x,
              y: position.isInside ? Math.min(96, Math.max(4, position.y)) : player.y,
              onPitch: true,
            }
          : player,
      );

      return nextPlayers;
    });
  };

  const updateOpponentPosition = (event: ReactPointerEvent<Element>, id: number) => {
    const position = getPitchPointerPosition(event);
    if (!position) return;
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });

    setOpponentMarkers((current) =>
      current.map((marker) =>
        marker.id === id
          ? {
              ...marker,
              onPitch: position.isInside,
              x: position.x,
              y: position.y,
            }
          : marker,
      ),
    );
  };

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode) return;
    const position = getDrawPointerPosition(event);
    if (!position?.isInside) return;

    const lineId = Date.now();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDrawLineId(lineId);
    setRedoDrawLines([]);
    setDrawLines((current) => [...current, { id: lineId, points: [{ x: position.x, y: position.y }] }]);
  };

  const continueDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || activeDrawLineId === null) return;
    const position = getDrawPointerPosition(event);
    if (!position) return;

    setDrawLines((current) =>
      current.map((line) =>
        line.id === activeDrawLineId
          ? { ...line, points: [...line.points, { x: position.x, y: position.y }] }
          : line,
      ),
    );
  };

  const stopDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActiveDrawLineId(null);
  };

  const undoDrawLine = () => {
    setDrawLines((current) => {
      if (current.length === 0) return current;
      const removedLine = current[current.length - 1];
      setRedoDrawLines((redoCurrent) => [removedLine, ...redoCurrent]);
      return current.slice(0, -1);
    });
  };

  const redoDrawLine = () => {
    setRedoDrawLines((current) => {
      if (current.length === 0) return current;
      const [restoredLine, ...remainingLines] = current;
      setDrawLines((drawCurrent) => [...drawCurrent, restoredLine]);
      return remainingLines;
    });
  };

  const clearDrawLines = () => {
    setDrawLines([]);
    setRedoDrawLines([]);
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (isDrawMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });
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
    const id = draggingId;
    if (id !== null && pitchSize === "custom") {
      const position = getPitchPointerPosition(event, { clamp: false });
      if (position) {
        setPlayers((current) => {
          const nextPlayers = current.map((player) => {
            if (player.id !== id) return player;

            const x = position.isInside ? Math.min(96, Math.max(4, position.x)) : player.x;
            const y = position.isInside ? Math.min(96, Math.max(4, position.y)) : player.y;

            return {
              ...player,
              position: getZoneName(pitchSize, x, y),
              x,
              y,
              onPitch: position.isInside,
            };
          });
          setCustomCount(nextPlayers.filter((player) => player.onPitch).length);
          return nextPlayers;
        });
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    setDragPreview(null);
    dragStartRef.current = null;
  };

  const handleOpponentDragStart = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (isDrawMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingOpponentId(id);
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });
    updateOpponentPosition(event, id);
  };

  const handleOpponentDragMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (draggingOpponentId !== id) return;
    updateOpponentPosition(event, id);
  };

  const stopOpponentDragging = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingOpponentId(null);
    setDragPreview(null);
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
    if (pitchSize === "custom") {
      setOpponentMarkers(createOpponentMarkers());
      setDrawLines([]);
      setRedoDrawLines([]);
      setIsDrawMode(false);
    }
  };

  const applyPitchSize = (nextPitchSize: PitchSize) => {
    setSavedPlayersByPitch((current) => ({ ...current, [pitchSize]: players }));
    setSavedFormationByPitch((current) => ({ ...current, [pitchSize]: formation }));
    setSavedCustomCountByPitch((current) => ({ ...current, [pitchSize]: customCount }));

    const nextFormation = savedFormationByPitch[nextPitchSize] ?? getDefaultFormation(nextPitchSize);
    const nextCustomCount = savedCustomCountByPitch[nextPitchSize] ?? (nextPitchSize === "custom" ? 5 : customCount);
    const savedPlayers = savedPlayersByPitch[nextPitchSize];
    setPitchSize(nextPitchSize);
    setFormation(nextFormation);
    setCustomCount(nextCustomCount);
    setPlayers(savedPlayers ?? createPlayers(nextPitchSize, nextFormation, nextCustomCount));
    setOpponentMarkers(createOpponentMarkers());
    setDrawLines([]);
    setRedoDrawLines([]);
    setIsDrawMode(false);
  };

  const applyCustomCount = (nextCount: number) => {
    const count = clampCustomCount(nextCount);
    setCustomCount(count);
    setPitchSize("custom");
    setFormation("custom");
    setPlayers((current) => createPlayers("custom", "custom", count, current));
    setOpponentMarkers(createOpponentMarkers());
    setDrawLines([]);
    setRedoDrawLines([]);
    setIsDrawMode(false);
  };

  const resetPositions = () => {
    const nextCustomCount = pitchSize === "custom" ? activePlayers.length || 5 : customCount;
    if (pitchSize === "custom") {
      setCustomCount(nextCustomCount);
    }
    setPlayers((current) => createPlayers(pitchSize, formation, nextCustomCount, current));
    if (pitchSize === "custom") {
      setOpponentMarkers(createOpponentMarkers());
      setDrawLines([]);
      setRedoDrawLines([]);
      setIsDrawMode(false);
    }
  };

  const clearNames = () => {
    setPlayers((current) =>
      current.map((player) => ({ ...player, starterName: "", substituteName: "", extraNames: [] })),
    );
    if (pitchSize === "custom") {
      setOpponentMarkers(createOpponentMarkers());
      setDrawLines([]);
      setRedoDrawLines([]);
      setIsDrawMode(false);
    }
  };

  const copyShareLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set(
      "lineup",
      encodeSharePayload(
        pitchSize,
        formation,
        pitchSize === "custom" ? activePlayers.length : customCount,
        players,
        opponentMarkers,
        drawLines,
      ),
    );

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      window.prompt("Copy share link", url.toString());
    }
  };

  const downloadLineupImage = async () => {
    const pitch = pitchRef.current;
    if (!pitch) return;

    const scale = 3;
    const rect = pitch.getBoundingClientRect();
    const exportPadding = 76 * scale;
    const pitchWidth = Math.round(rect.width * scale);
    const pitchHeight = Math.round(rect.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = pitchWidth + exportPadding * 2;
    canvas.height = pitchHeight + exportPadding * 2;

    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    const sx = pitchWidth / 100;
    const sy = pitchHeight / 100;
    const px = (value: number) => exportPadding + value * sx;
    const py = (value: number) => exportPadding + value * sy;
    const pw = (value: number) => value * sx;
    const ph = (value: number) => value * sy;
    const css = (value: number) => value * scale;

    const fieldGradient = context.createLinearGradient(0, 0, width, height);
    fieldGradient.addColorStop(0, "#37a84f");
    fieldGradient.addColorStop(0.5, "#2e9849");
    fieldGradient.addColorStop(1, "#2a8841");
    context.fillStyle = fieldGradient;
    context.fillRect(0, 0, width, height);

    const stripeHeight = css(58);
    for (let y = 0; y < height; y += stripeHeight * 2) {
      context.fillStyle = "rgba(255,255,255,0.055)";
      context.fillRect(0, y, width, stripeHeight);
      context.fillStyle = "rgba(0,0,0,0.04)";
      context.fillRect(0, y + stripeHeight, width, stripeHeight);
    }

    context.strokeStyle = "rgba(255,255,255,0.9)";
    context.lineWidth = css(3);
    context.strokeRect(px(4), py(4), pw(92), ph(92));
    context.beginPath();
    context.moveTo(px(4), py(50));
    context.lineTo(px(96), py(50));
    context.stroke();
    context.beginPath();
    context.ellipse(px(50), py(50), pw(15.5), ph(11), 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(px(50), py(50), css(3), 0, Math.PI * 2);
    context.fill();
    context.strokeRect(px(26), py(4), pw(48), ph(15));
    context.strokeRect(px(37), py(4), pw(26), ph(7));
    context.strokeRect(px(26), py(81), pw(48), ph(15));
    context.strokeRect(px(37), py(89), pw(26), ph(7));

    if (pitchSize === "custom") {
      drawLines.forEach((line) => {
        if (line.points.length < 2) return;
        context.save();
        context.strokeStyle = "#facc15";
        context.lineWidth = css(3);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(px(line.points[0].x), py(line.points[0].y));
        line.points.slice(1).forEach((point) => context.lineTo(px(point.x), py(point.y)));
        context.stroke();
        context.restore();
      });
    }

    activePlayers.forEach((player) => {
      const x = px(player.x);
      const y = py(player.y);
      const starterName = player.starterName.trim() || `Player ${player.id}`;
      const benchNames = getBenchNames(player);

      context.save();
      context.shadowColor = "rgba(0,0,0,0.34)";
      context.shadowBlur = css(5);
      context.shadowOffsetY = css(3);
      context.fillStyle = "#f8fafc";
      context.beginPath();
      context.arc(x, y, css(17), 0, Math.PI * 2);
      context.fill();
      context.shadowColor = "transparent";
      context.strokeStyle = "#ffffff";
      context.lineWidth = css(2);
      context.stroke();
      context.fillStyle = "#111827";
      context.font = `950 ${css(13)}px Inter, Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(player.id), x, y + css(0.5));
      context.restore();

      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `900 ${css(9)}px Inter, Arial, sans-serif`;
      const nameWidth = Math.min(css(86), Math.max(css(52), starterName.length * css(5.6)));
      context.fillStyle = "rgba(16, 42, 25, 0.58)";
      context.beginPath();
      context.roundRect(x - nameWidth / 2, y + css(21), nameWidth, css(18), css(9));
      context.fill();
      context.fillStyle = "#ffffff";
      context.fillText(starterName.toUpperCase(), x, y + css(30), nameWidth - css(8));

      if (benchNames.length > 0) {
        context.font = `900 ${css(8)}px Inter, Arial, sans-serif`;
        const benchText = benchNames.slice(0, 2).join(" / ");
        const benchWidth = Math.min(css(130), Math.max(css(54), benchText.length * css(5)));
        context.fillStyle = "rgba(16, 42, 25, 0.58)";
        context.beginPath();
        context.roundRect(x - benchWidth / 2, y + css(42), benchWidth, css(16), css(8));
        context.fill();
        context.fillStyle = "#d9ffe6";
        context.fillText(benchText.toUpperCase(), x, y + css(50), benchWidth - css(8));
      }
      context.restore();
    });

    if (pitchSize === "custom") {
      opponentMarkers
        .filter((marker) => marker.onPitch)
        .forEach((marker) => {
          context.save();
          context.fillStyle = "#dc2626";
          context.strokeStyle = "#ffffff";
          context.lineWidth = css(2);
          context.beginPath();
          context.arc(px(marker.x), py(marker.y), css(10), 0, Math.PI * 2);
          context.fill();
          context.stroke();
          context.restore();
        });
    }

    const filename = `${pitchSize}-lineup-football-${new Date().toISOString().slice(0, 10)}.png`;
    const link = document.createElement("a");
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;

    const file = new File([blob], filename, { type: "image/png" });
    const canShareFile =
      "canShare" in navigator &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });

    if (canShareFile && navigator.maxTouchPoints > 0) {
      try {
        await navigator.share({
          files: [file],
          title: "Line Up Football",
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Fall back to the normal browser download/open behavior below.
      }
    }

    const pngUrl = URL.createObjectURL(blob);
    link.href = pngUrl;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
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
                <strong>{benchCount}/{activePlayers.length} subs</strong>
              </div>
              <div className="squad-editor">
                {activePlayers.map((player) => (
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
                  {pitchSize === "custom" ? (
                    <>
                      <button
                        type="button"
                        className={`draw-button ${isDrawMode ? "active" : ""}`}
                        onClick={() => setIsDrawMode((current) => !current)}
                      >
                        <Pencil size={14} />
                        Draw
                      </button>
                    </>
                  ) : null}
                  <button type="button" onClick={clearNames}>
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              </div>
              <div className={`formation-switch ${pitchSize === "custom" ? "custom-formation-switch" : ""}`}>
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
                {pitchSize === "custom" ? (
                  <div className="draw-history-actions">
                    <button type="button" onClick={undoDrawLine} disabled={drawLines.length === 0}>
                      <Undo2 size={14} />
                      Undo
                    </button>
                    <button type="button" onClick={redoDrawLine} disabled={redoDrawLines.length === 0}>
                      <Redo2 size={14} />
                      Redo
                    </button>
                    <button type="button" onClick={clearDrawLines} disabled={drawLines.length === 0}>
                      Clear Lines
                    </button>
                  </div>
                ) : null}
              </div>
              {selectedMobilePlayer ? (
                <div className="mobile-player-editor">
                  <div className="mobile-player-editor-top">
                    <label htmlFor="mobile-player-select">Player</label>
                    <select
                      id="mobile-player-select"
                      value={selectedMobilePlayer.id}
                      onChange={(event) => setSelectedMobilePlayerId(Number(event.target.value))}
                    >
                      {activePlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.id}. {player.position}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mobile-player-inputs">
                    <input
                      value={selectedMobilePlayer.starterName}
                      onChange={(event) => renamePlayer(selectedMobilePlayer.id, "starterName", event.target.value)}
                      placeholder="Đá chính"
                    />
                    <input
                      value={selectedMobilePlayer.substituteName}
                      onChange={(event) => renamePlayer(selectedMobilePlayer.id, "substituteName", event.target.value)}
                      placeholder="Dự bị"
                    />
                    {selectedMobilePlayer.extraNames.slice(0, 1).map((extraName, index) => (
                      <div key={index} className="mobile-extra-player-input">
                        <input
                          value={extraName}
                          onChange={(event) => renameExtraPlayer(selectedMobilePlayer.id, index, event.target.value)}
                          placeholder={`Cầu thủ ${index + 3}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeExtraPlayerInput(selectedMobilePlayer.id, index)}
                          aria-label={`Remove player ${index + 3}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {selectedMobilePlayer.extraNames.length < 1 ? (
                      <button
                        type="button"
                        className="mobile-add-player"
                        onClick={() => addPlayerInput(selectedMobilePlayer.id)}
                      >
                        <Plus size={14} />
                        Thêm dự bị
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {pitchSize === "custom" ? (
                <div className="custom-player-tray" aria-label="Custom player tray">
                  <span>Players</span>
                  <div className="custom-player-dot-list">
                    {players.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className={`custom-player-dot ${player.onPitch ? "placed" : ""}`}
                        onPointerDown={(event) => handleDragStart(event, player.id)}
                        onPointerMove={(event) => handleDragMove(event, player.id)}
                        onPointerUp={stopDragging}
                        onPointerCancel={stopDragging}
                        aria-label={`Drag player ${player.id}`}
                      >
                        {player.id}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {pitchSize === "custom" ? (
                <div className="opponent-tray" aria-label="Opponent marker tray">
                  <span>Opponent</span>
                  <div className="opponent-dot-list">
                    {opponentMarkers.map((marker) => (
                      <button
                        key={marker.id}
                        type="button"
                        className={`opponent-dot ${marker.onPitch ? "placed" : ""}`}
                        onPointerDown={(event) => handleOpponentDragStart(event, marker.id)}
                        onPointerMove={(event) => handleOpponentDragMove(event, marker.id)}
                        onPointerUp={stopOpponentDragging}
                        onPointerCancel={stopOpponentDragging}
                        aria-label={`Drag opponent ${marker.id}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                ref={pitchRef}
                className={`pitch relative mx-auto aspect-[7/10] border-[4px] border-white/80 touch-none select-none ${
                  isDrawMode ? "draw-mode" : ""
                }`}
              >
                <div className="absolute inset-[4%] border-[3px] border-white/90" />
                <div className="absolute left-[4%] right-[4%] top-1/2 h-[3px] -translate-y-1/2 bg-white/90" />
                <div className="absolute left-1/2 top-1/2 h-[22%] w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/90" />
                <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                <div className="absolute left-1/2 top-[4%] h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
                <div className="absolute left-1/2 top-[4%] h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
                <div className="absolute bottom-[4%] left-1/2 h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />
                <div className="absolute bottom-[4%] left-1/2 h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />

                <svg
                  ref={drawLayerRef}
                  className="draw-layer"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {drawLines.map((line) => (
                    <polyline
                      key={line.id}
                      points={line.points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke="#facc15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.15"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
                {isDrawMode ? (
                  <div
                    className="draw-hit-layer"
                    onPointerDown={startDrawing}
                    onPointerMove={continueDrawing}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    aria-hidden="true"
                  />
                ) : null}

                {activePlayers.map((player) => {
                  const starterName = player.starterName.trim() || `Player ${player.id}`;
                  const benchNames = getBenchNames(player);

                  return (
                    <div
                      key={player.id}
                      onPointerDown={(event) => handleDragStart(event, player.id)}
                      onPointerMove={(event) => handleDragMove(event, player.id)}
                      onPointerUp={stopDragging}
                      onPointerCancel={stopDragging}
                  className={`player-token group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none ${
                    draggingId === player.id ? "dragging" : ""
                  }`}
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
                {pitchSize === "custom"
                  ? opponentMarkers
                      .filter((marker) => marker.onPitch)
                      .map((marker) => (
                        <button
                          key={`opponent-${marker.id}`}
                          type="button"
                          className={`opponent-pitch-dot ${draggingOpponentId === marker.id ? "dragging" : ""}`}
                          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                          onPointerDown={(event) => handleOpponentDragStart(event, marker.id)}
                          onPointerMove={(event) => handleOpponentDragMove(event, marker.id)}
                          onPointerUp={stopOpponentDragging}
                          onPointerCancel={stopOpponentDragging}
                          aria-label={`Drag opponent ${marker.id}`}
                        />
                      ))
                  : null}
              </div>
              <div className="mobile-lineup-actions">
                <button type="button" className="share-button" onClick={copyShareLink}>
                  {copyStatus === "copied" ? <Check size={14} /> : <Clipboard size={14} />}
                  {copyStatus === "copied" ? "Copied" : "Share"}
                </button>
                <button type="button" className="download-button" onClick={downloadLineupImage}>
                  <Download size={14} />
                  Download
                </button>
                {pitchSize === "custom" ? (
                  <button
                    type="button"
                    className={`draw-button ${isDrawMode ? "active" : ""}`}
                    onClick={() => setIsDrawMode((current) => !current)}
                  >
                    <Pencil size={14} />
                    Draw
                  </button>
                ) : null}
                <button type="button" onClick={clearNames}>
                  <Trash2 size={14} />
                  Clear
                </button>
              </div>
            </section>
        </div>
      </div>
      {dragPreview ? (
        <div
          className={`drag-preview ${dragPreview.type === "opponent" ? "opponent-preview" : "player-preview"}`}
          style={{ left: dragPreview.x, top: dragPreview.y }}
          aria-hidden="true"
        >
          {dragPreview.type === "player" ? dragPreview.id : null}
        </div>
      ) : null}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
