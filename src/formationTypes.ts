export type FormationKey =
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

export type FormationPoint = { id: number; x: number; y: number };

export type FormationPlayer = FormationPoint & {
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  onPitch: boolean;
};

export type OpponentMarker = FormationPoint & { onPitch: boolean };
export type DrawLine = { id: number; points: { x: number; y: number }[] };
