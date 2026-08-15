import { renderLineupCanvas } from "../canvasLineupExport";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { PitchSize } from "../appRouting";
import { type DrawLine, type FormationKey, type FormationPlayer, type OpponentMarker } from "../formationData";
import { buildSharePayload, encodeSharePayloadObject } from "../lineupShare";
import { createShortShareLink } from "../shareLinks";
import { copyTextOrPrompt } from "../shareUtils";
import { useTacticalStore, type WorkspaceMode } from "../stores/tacticalStore";
import type { TacticalMarker } from "../tacticalData";

type ExportCopy = {
  share: string;
  copied: string;
  copiedShortLink: string;
  player: string;
  downloaded: string;
};

type UseLineupExportActionsOptions = {
  copy: ExportCopy;
  pitchRef: RefObject<HTMLDivElement | null>;
  pitchSize: PitchSize;
  formation: FormationKey;
  customCount: number;
  players: FormationPlayer[];
  activePlayers: FormationPlayer[];
  opponentMarkers: OpponentMarker[];
  drawLines: DrawLine[];
  currentMode: WorkspaceMode;
  showAllCanvasObjects: boolean;
  showAnimationTimeline: boolean;
  ballMarker: TacticalMarker | undefined;
  setCopyStatus: Dispatch<SetStateAction<"idle" | "copied">>;
  showToast: (message: string, tone?: "success" | "error") => void;
};

export function useLineupExportActions({
  copy,
  pitchRef,
  pitchSize,
  formation,
  customCount,
  players,
  activePlayers,
  opponentMarkers,
  drawLines,
  currentMode,
  showAllCanvasObjects,
  showAnimationTimeline,
  ballMarker,
  setCopyStatus,
  showToast,
}: UseLineupExportActionsOptions) {
  const copyShareLink = async () => {
    const payload = buildSharePayload(
      pitchSize,
      formation,
      pitchSize === "custom" ? activePlayers.length : customCount,
      players,
      opponentMarkers,
      drawLines,
      useTacticalStore.getState().frames,
      currentMode,
    );

    const shortUrl = await createShortShareLink(payload, window.location.href);

    // Falls back to the full inline payload whenever the short link cannot be
    // stored (no Supabase, offline, payload over the size constraint).
    const url = shortUrl ?? new URL(window.location.href);
    if (!shortUrl) url.searchParams.set("lineup", encodeSharePayloadObject(payload));

    const copied = await copyTextOrPrompt(url.toString(), copy.share);
    if (copied) {
      setCopyStatus("copied");
      showToast(shortUrl ? copy.copiedShortLink : copy.copied);
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  };

  const downloadLineupImage = async () => {
    const pitch = pitchRef.current;
    if (!pitch) return;

    const canvas = renderLineupCanvas({
      pitch,
      activePlayers,
      opponentMarkers,
      drawLines,
      showAllCanvasObjects,
      showAnimationTimeline,
      ballMarker,
      playerLabel: copy.player,
    });
    if (!canvas) return;

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
        showToast(copy.downloaded);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
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
    showToast(copy.downloaded);
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  };

  return { copyShareLink, downloadLineupImage };
}
