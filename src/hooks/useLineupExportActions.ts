import type { Dispatch, RefObject, SetStateAction } from "react";
import type { PitchSize } from "../appRouting";
import { getBenchNames, type DrawLine, type FormationKey, type FormationPlayer, type OpponentMarker } from "../formationData";
import { encodeSharePayload } from "../lineupShare";
import { copyTextOrPrompt } from "../shareUtils";
import { useTacticalStore, type WorkspaceMode } from "../stores/tacticalStore";
import type { TacticalMarker } from "../tacticalData";

type ExportCopy = {
  share: string;
  copied: string;
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
        useTacticalStore.getState().frames,
        currentMode,
      ),
    );

    const copied = await copyTextOrPrompt(url.toString(), copy.share);
    if (copied) {
      setCopyStatus("copied");
      showToast(copy.copied);
      window.setTimeout(() => setCopyStatus("idle"), 1800);
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

    if (showAllCanvasObjects) {
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
      const starterName = player.starterName.trim() || `${copy.player} ${player.id}`;
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

    if (showAllCanvasObjects) {
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

    if (showAnimationTimeline && ballMarker) {
      context.save();
      context.fillStyle = "#f8fafc";
      context.strokeStyle = "#94a3b8";
      context.lineWidth = css(2);
      context.shadowColor = "rgba(0,0,0,0.32)";
      context.shadowBlur = css(5);
      context.beginPath();
      context.arc(px(ballMarker.x), py(ballMarker.y), css(10), 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
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
