import { encodeSharePayload } from "./lineupShare";
import type { StoredLineupState } from "./lineupState";

export const createSavedLineupShareUrl = <TFormation extends string>(
  lineupData: StoredLineupState<TFormation>,
  currentHref: string,
) => {
  const shareableCount =
    lineupData.pitchSize === "custom"
      ? lineupData.players.filter((player) => player.onPitch).length
      : lineupData.customCount;
  const url = new URL(currentHref);
  url.searchParams.set(
    "lineup",
    encodeSharePayload(
      lineupData.pitchSize,
      lineupData.formation,
      shareableCount,
      lineupData.players,
      Array.isArray(lineupData.opponentMarkers) ? lineupData.opponentMarkers : [],
      Array.isArray(lineupData.drawLines) ? lineupData.drawLines : [],
      Array.isArray(lineupData.animationFrames) ? lineupData.animationFrames : [],
      lineupData.currentMode ?? (lineupData.pitchSize === "custom" ? "CUSTOM" : "LINEUP"),
    ),
  );

  return url;
};

