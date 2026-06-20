import { getBenchNames, type DrawLine, type FormationPlayer, type OpponentMarker } from "./formationData";
import type { TacticalMarker } from "./tacticalData";
import { pitchPointToDisplay, type PitchOrientation } from "./pitchPointer";

type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PlayerAnchor = {
  x: number;
  y: number;
  nameRect: CanvasRect | null;
  benchRect: CanvasRect | null;
};

export type RenderLineupCanvasOptions = {
  pitch: HTMLElement;
  scale?: number;
  activePlayers: FormationPlayer[];
  opponentMarkers: OpponentMarker[];
  drawLines: DrawLine[];
  showAllCanvasObjects: boolean;
  showAnimationTimeline: boolean;
  ballMarker: TacticalMarker | undefined;
  playerLabel: string;
};

function fillRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, width, height, r);
  } else {
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }
  context.fill();
}

function mapRectToCanvas(
  elementRect: DOMRect,
  pitchBounds: DOMRect,
  pitchWidth: number,
  pitchHeight: number,
  exportPadding: number,
  pitchClientWidth: number,
  pitchClientHeight: number,
): CanvasRect {
  const widthRatio = pitchClientWidth > 0 ? pitchWidth / pitchClientWidth : 1;
  const heightRatio = pitchClientHeight > 0 ? pitchHeight / pitchClientHeight : 1;

  return {
    x: exportPadding + (elementRect.left - pitchBounds.left) * widthRatio,
    y: exportPadding + (elementRect.top - pitchBounds.top) * heightRatio,
    width: elementRect.width * widthRatio,
    height: elementRect.height * heightRatio,
  };
}

function resolvePlayerAnchor(
  pitch: HTMLElement,
  player: FormationPlayer,
  pitchBounds: DOMRect,
  pitchWidth: number,
  pitchHeight: number,
  exportPadding: number,
  pitchClientWidth: number,
  pitchClientHeight: number,
  orientation: PitchOrientation,
): PlayerAnchor {
  const px = (value: number) => exportPadding + (value / 100) * pitchWidth;
  const py = (value: number) => exportPadding + (value / 100) * pitchHeight;

  const token = pitch.querySelector<HTMLElement>(`[data-player-id="${player.id}"]`);
  if (!token) {
    const position = pitchPointToDisplay(player.x, player.y, orientation);
    const x = px(position.x);
    const y = py(position.y);
    const nameHeight = pitchHeight * 0.034;
    const nameWidth = Math.min(pitchWidth * 0.24, Math.max(pitchWidth * 0.14, pitchWidth * 0.05));
    return {
      x,
      y,
      nameRect: {
        x: x - nameWidth / 2,
        y: y + pitchHeight * 0.038,
        width: nameWidth,
        height: nameHeight,
      },
      benchRect: null,
    };
  }

  const kit = token.querySelector(".kit-disc") ?? token;
  const kitBounds = kit.getBoundingClientRect();
  const widthRatio = pitchClientWidth > 0 ? pitchWidth / pitchClientWidth : 1;
  const heightRatio = pitchClientHeight > 0 ? pitchHeight / pitchClientHeight : 1;
  const x = exportPadding + (kitBounds.left + kitBounds.width / 2 - pitchBounds.left) * widthRatio;
  const y = exportPadding + (kitBounds.top + kitBounds.height / 2 - pitchBounds.top) * heightRatio;

  const nameElement = token.querySelector(".token-name");
  const benchElement = token.querySelector(".bench-list");

  return {
    x,
    y,
    nameRect: nameElement
      ? mapRectToCanvas(
          nameElement.getBoundingClientRect(),
          pitchBounds,
          pitchWidth,
          pitchHeight,
          exportPadding,
          pitchClientWidth,
          pitchClientHeight,
        )
      : null,
    benchRect: benchElement
      ? mapRectToCanvas(
          benchElement.getBoundingClientRect(),
          pitchBounds,
          pitchWidth,
          pitchHeight,
          exportPadding,
          pitchClientWidth,
          pitchClientHeight,
        )
      : null,
  };
}

export function renderLineupCanvas({
  pitch,
  scale = 3,
  activePlayers,
  opponentMarkers,
  drawLines,
  showAllCanvasObjects,
  showAnimationTimeline,
  ballMarker,
  playerLabel,
}: RenderLineupCanvasOptions) {
  const pitchClientWidth = pitch.clientWidth;
  const pitchClientHeight = pitch.clientHeight;
  if (pitchClientWidth <= 0 || pitchClientHeight <= 0) return null;

  const pitchBounds = pitch.getBoundingClientRect();
  const pitchWidth = Math.round(pitchClientWidth * scale);
  const pitchHeight = Math.round(pitchClientHeight * scale);
  const orientation: PitchOrientation = pitch.dataset.orientation === "landscape" ? "landscape" : "portrait";
  const css = (value: number) => value * scale;

  const tokenRadius = Math.max(css(14), pitchWidth * 0.023);
  const labelBand = pitchHeight * 0.12;
  const exportPadding = Math.ceil(Math.max(css(72), tokenRadius + labelBand + css(16)));

  const canvas = document.createElement("canvas");
  canvas.width = pitchWidth + exportPadding * 2;
  canvas.height = pitchHeight + exportPadding * 2;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const width = canvas.width;
  const height = canvas.height;
  const sx = pitchWidth / 100;
  const sy = pitchHeight / 100;
  const px = (value: number) => exportPadding + value * sx;
  const py = (value: number) => exportPadding + value * sy;
  const pw = (value: number) => value * sx;
  const ph = (value: number) => value * sy;

  const fieldGradient = context.createLinearGradient(0, 0, width, height);
  fieldGradient.addColorStop(0, "#37a84f");
  fieldGradient.addColorStop(0.5, "#2e9849");
  fieldGradient.addColorStop(1, "#2a8841");
  context.fillStyle = fieldGradient;
  context.fillRect(0, 0, width, height);

  const stripeHeight = Math.max(css(40), pitchHeight * 0.11);
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
  if (orientation === "landscape") {
    context.moveTo(px(50), py(4));
    context.lineTo(px(50), py(96));
  } else {
    context.moveTo(px(4), py(50));
    context.lineTo(px(96), py(50));
  }
  context.stroke();
  context.beginPath();
  context.ellipse(
    px(50),
    py(50),
    orientation === "landscape" ? pw(11) : pw(15.5),
    orientation === "landscape" ? ph(15.5) : ph(11),
    0,
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(px(50), py(50), css(3), 0, Math.PI * 2);
  context.fill();
  if (orientation === "landscape") {
    context.strokeRect(px(81), py(26), pw(15), ph(48));
    context.strokeRect(px(89), py(37), pw(7), ph(26));
    context.strokeRect(px(4), py(26), pw(15), ph(48));
    context.strokeRect(px(4), py(37), pw(7), ph(26));
  } else {
    context.strokeRect(px(26), py(4), pw(48), ph(15));
    context.strokeRect(px(37), py(4), pw(26), ph(7));
    context.strokeRect(px(26), py(81), pw(48), ph(15));
    context.strokeRect(px(37), py(89), pw(26), ph(7));
  }

  if (showAllCanvasObjects) {
    drawLines.forEach((line) => {
      if (line.points.length < 2) return;
      context.save();
      context.strokeStyle = "#facc15";
      context.lineWidth = css(3);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      const firstPoint = pitchPointToDisplay(line.points[0].x, line.points[0].y, orientation);
      context.moveTo(px(firstPoint.x), py(firstPoint.y));
      line.points.slice(1).forEach((point) => {
        const displayPoint = pitchPointToDisplay(point.x, point.y, orientation);
        context.lineTo(px(displayPoint.x), py(displayPoint.y));
      });
      context.stroke();
      context.restore();
    });
  }

  activePlayers.forEach((player) => {
    const anchor = resolvePlayerAnchor(
      pitch,
      player,
      pitchBounds,
      pitchWidth,
      pitchHeight,
      exportPadding,
      pitchClientWidth,
      pitchClientHeight,
      orientation,
    );
    const { x, y, nameRect, benchRect } = anchor;
    const starterName = player.starterName.trim() || `${playerLabel} ${player.id}`;
    const benchNames = getBenchNames(player);
    const numberFontSize = Math.max(css(11), tokenRadius * 0.76);

    context.save();
    context.shadowColor = "rgba(0,0,0,0.34)";
    context.shadowBlur = css(5);
    context.shadowOffsetY = css(3);
    context.fillStyle = "#f8fafc";
    context.beginPath();
    context.arc(x, y, tokenRadius, 0, Math.PI * 2);
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = "#ffffff";
    context.lineWidth = css(2);
    context.stroke();
    context.fillStyle = "#111827";
    context.font = `950 ${numberFontSize}px Inter, Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(player.id), x, y);
    context.restore();

    const drawLabel = (rect: CanvasRect, text: string, textColor: string) => {
      if (rect.width <= 0 || rect.height <= 0) return;
      context.save();
      context.fillStyle = "rgba(16, 42, 25, 0.58)";
      fillRoundRect(context, rect.x, rect.y, rect.width, rect.height, rect.height / 2);
      context.fillStyle = textColor;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `900 ${Math.max(css(8), rect.height * 0.58)}px Inter, Arial, sans-serif`;
      context.fillText(text.toUpperCase(), rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width - css(6));
      context.restore();
    };

    if (nameRect) {
      drawLabel(nameRect, starterName, "#ffffff");
    } else {
      const fallbackWidth = Math.min(pitchWidth * 0.24, Math.max(pitchWidth * 0.14, starterName.length * pitchWidth * 0.018));
      const fallbackHeight = Math.max(css(16), pitchHeight * 0.034);
      drawLabel(
        {
          x: x - fallbackWidth / 2,
          y: y + pitchHeight * 0.038,
          width: fallbackWidth,
          height: fallbackHeight,
        },
        starterName,
        "#ffffff",
      );
    }

    if (benchNames.length > 0) {
      const benchText = benchNames.slice(0, 2).join(" / ");
      if (benchRect) {
        drawLabel(benchRect, benchText, "#d9ffe6");
      } else {
        const benchWidth = Math.min(pitchWidth * 0.34, Math.max(pitchWidth * 0.16, benchText.length * pitchWidth * 0.016));
        const benchHeight = Math.max(css(14), pitchHeight * 0.03);
        const baseY = nameRect?.y ?? y + pitchHeight * 0.038;
        const baseH = nameRect?.height ?? Math.max(css(16), pitchHeight * 0.034);
        drawLabel(
          {
            x: x - benchWidth / 2,
            y: baseY + baseH + pitchHeight * 0.008,
            width: benchWidth,
            height: benchHeight,
          },
          benchText,
          "#d9ffe6",
        );
      }
    }
  });

  if (showAllCanvasObjects) {
    opponentMarkers
      .filter((marker) => marker.onPitch)
      .forEach((marker) => {
        const position = pitchPointToDisplay(marker.x, marker.y, orientation);
        context.save();
        context.fillStyle = "#dc2626";
        context.strokeStyle = "#ffffff";
        context.lineWidth = css(2);
        context.beginPath();
        context.arc(px(position.x), py(position.y), Math.max(css(8), pitchWidth * 0.014), 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
      });
  }

  if (showAnimationTimeline && ballMarker) {
    const position = pitchPointToDisplay(ballMarker.x, ballMarker.y, orientation);
    context.save();
    context.fillStyle = "#f8fafc";
    context.strokeStyle = "#94a3b8";
    context.lineWidth = css(2);
    context.shadowColor = "rgba(0,0,0,0.32)";
    context.shadowBlur = css(5);
    context.beginPath();
    context.arc(px(position.x), py(position.y), Math.max(css(8), pitchWidth * 0.014), 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  return canvas;
}
