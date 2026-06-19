import { isPitchSize } from "./appRouting";
import { isFormationKey, type FormationKey } from "./formationData";
import {
  createStoredLineupState,
  type StoredLineupState,
  type StoredLineupStateInput,
} from "./lineupState";
import type { TacticalFrame } from "./tacticalData";

export function serializeLineupState(
  input: Omit<StoredLineupStateInput<FormationKey>, "animationFrames">,
  animationFrames: TacticalFrame[],
  metadata: Partial<Pick<StoredLineupState<FormationKey>, "thumbnailDataUrl" | "savedAt">> = {},
) {
  return createStoredLineupState({ ...input, animationFrames }, metadata);
}

export function isStoredLineupState(value: unknown): value is StoredLineupState<FormationKey> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredLineupState<FormationKey>>;
  return Boolean(isPitchSize(candidate.pitchSize) && isFormationKey(candidate.formation) && Array.isArray(candidate.players));
}
