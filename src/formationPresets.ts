import type { PitchSize } from "./appRouting";
import type { FormationKey, FormationPoint } from "./formationTypes";

export const pitchOptions: { value: PitchSize; label: string }[] = [
  { value: 5, label: "Sân 5" },
  { value: 7, label: "Sân 7" },
  { value: 11, label: "Sân 11" },
  { value: "custom", label: "Cá nhân hóa" },
];

export const formationsBySize: Record<PitchSize, Partial<Record<FormationKey, FormationPoint[]>>> = {
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
  custom: { custom: [] },
};

const getFormationEntries = (pitchSize: PitchSize) =>
  Object.entries(formationsBySize[pitchSize]) as [FormationKey, FormationPoint[]][];

export const getDefaultFormation = (pitchSize: PitchSize) => getFormationEntries(pitchSize)[0][0];

const createCustomFormationPoints = (count: number) => {
  const playerCount = Math.min(11, Math.max(1, Math.round(count)));
  const baseFive: FormationPoint[] = [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 50, y: 70 },
    { id: 3, x: 35, y: 48 },
    { id: 4, x: 65, y: 48 },
    { id: 5, x: 50, y: 22 },
  ];
  if (playerCount <= baseFive.length) return baseFive.slice(0, playerCount);

  return [
    ...baseFive,
    ...Array.from({ length: playerCount - baseFive.length }, (_, index) => ({
      id: baseFive.length + index + 1,
      x: 24 + (index % 4) * 17,
      y: 18 + Math.floor(index / 4) * 16,
    })),
  ];
};

export const getFormationPoints = (pitchSize: PitchSize, formation: FormationKey, customCount = 8) =>
  pitchSize === "custom" ? createCustomFormationPoints(customCount) : (formationsBySize[pitchSize][formation] ?? []);

export const isFormationKey = (value: unknown): value is FormationKey =>
  typeof value === "string" &&
  pitchOptions.some((option) => Object.prototype.hasOwnProperty.call(formationsBySize[option.value], value));
