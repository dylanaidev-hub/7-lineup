import { buildSharePayload, encodeSharePayloadObject, normalizeDrawLines } from "./lineupShare";
import type { StoredLineupState } from "./lineupState";
import { createShortShareLink } from "./shareLinks";

export const createSavedLineupShareUrl = async <TFormation extends string>(
  lineupData: StoredLineupState<TFormation>,
  currentHref: string,
) => {
  const shareableCount =
    lineupData.pitchSize === "custom"
      ? lineupData.players.filter((player) => player.onPitch).length
      : lineupData.customCount;

  const payload = buildSharePayload(
    lineupData.pitchSize,
    lineupData.formation,
    shareableCount,
    lineupData.players,
    Array.isArray(lineupData.opponentMarkers) ? lineupData.opponentMarkers : [],
    normalizeDrawLines(lineupData.drawLines),
    Array.isArray(lineupData.animationFrames) ? lineupData.animationFrames : [],
    lineupData.currentMode ?? (lineupData.pitchSize === "custom" ? "CUSTOM" : "LINEUP"),
  );

  const shortUrl = await createShortShareLink(payload, currentHref);
  if (shortUrl) return { url: shortUrl, isShortLink: true };

  const url = new URL(currentHref);
  url.searchParams.set("lineup", encodeSharePayloadObject(payload));
  return { url, isShortLink: false };
};
