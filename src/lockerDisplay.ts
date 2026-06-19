import { isPitchSize, type PitchSize } from "./appRouting";

type SavedLineupLike = {
  format: string;
  players_data: unknown;
  created_at: string;
};

type PitchLabels = Record<Exclude<PitchSize, "custom">, string> & { custom: string };

type SavedTacticsLike = {
  kind?: string;
};

type SavedLineupDataLike = {
  savedAt?: unknown;
  thumbnailDataUrl?: unknown;
};

export const getSavedLineupFormatLabel = (
  lineup: SavedLineupLike,
  labels: { pitchLabels: PitchLabels; tacticsLabel: string },
) => {
  if (lineup.format === "unified") return "Unified workspace";
  if (lineup.format === "tactics") return labels.tacticsLabel;
  if (lineup.format === "custom") return labels.pitchLabels.custom;

  const numericFormat = Number(lineup.format);
  return isPitchSize(numericFormat) ? labels.pitchLabels[numericFormat] : lineup.format;
};

export const getSavedLineupThumbnail = (lineup: SavedLineupLike) => {
  const data = lineup.players_data as (SavedTacticsLike & SavedLineupDataLike) | null;
  if (!data || data.kind === "tactics") return "";
  return typeof data.thumbnailDataUrl === "string" ? data.thumbnailDataUrl : "";
};

export const getSavedLineupDateTime = (lineup: SavedLineupLike) => {
  const data = lineup.players_data as (SavedTacticsLike & SavedLineupDataLike) | null;
  const savedAt = data && data.kind !== "tactics" && typeof data.savedAt === "string" ? data.savedAt : lineup.created_at;
  return new Date(savedAt).toLocaleString();
};
