type ThumbnailPlayer = {
  id: number;
  starterName: string;
  x: number;
  y: number;
};

type ThumbnailOpponentMarker = {
  x: number;
  y: number;
  onPitch: boolean;
};

type ThumbnailDrawLine = {
  points: { x: number; y: number }[];
};

type CreateLineupThumbnailArgs = {
  players: ThumbnailPlayer[];
  opponentMarkers: ThumbnailOpponentMarker[];
  drawLines: ThumbnailDrawLine[];
  showAllCanvasObjects: boolean;
  playerLabel: string;
};

export const createLineupThumbnail = ({
  players,
  opponentMarkers,
  drawLines,
  showAllCanvasObjects,
  playerLabel,
}: CreateLineupThumbnailArgs) => {
  const canvas = document.createElement("canvas");
  const width = 360;
  const height = 514;
  const padding = 24;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return undefined;

  const fieldGradient = context.createLinearGradient(0, 0, width, height);
  fieldGradient.addColorStop(0, "#38aa52");
  fieldGradient.addColorStop(0.55, "#2d9348");
  fieldGradient.addColorStop(1, "#267d3d");
  context.fillStyle = fieldGradient;
  context.fillRect(0, 0, width, height);

  const stripeHeight = 45;
  for (let y = 0; y < height; y += stripeHeight * 2) {
    context.fillStyle = "rgba(255,255,255,0.055)";
    context.fillRect(0, y, width, stripeHeight);
    context.fillStyle = "rgba(0,0,0,0.04)";
    context.fillRect(0, y + stripeHeight, width, stripeHeight);
  }

  const pitchWidth = width - padding * 2;
  const pitchHeight = height - padding * 2;
  const px = (value: number) => padding + (value / 100) * pitchWidth;
  const py = (value: number) => padding + (value / 100) * pitchHeight;
  const pw = (value: number) => (value / 100) * pitchWidth;
  const ph = (value: number) => (value / 100) * pitchHeight;

  context.strokeStyle = "rgba(255,255,255,0.88)";
  context.lineWidth = 2;
  context.strokeRect(px(4), py(4), pw(92), ph(92));
  context.beginPath();
  context.moveTo(px(4), py(50));
  context.lineTo(px(96), py(50));
  context.stroke();
  context.beginPath();
  context.ellipse(px(50), py(50), pw(15.5), ph(11), 0, 0, Math.PI * 2);
  context.stroke();
  context.strokeRect(px(26), py(4), pw(48), ph(15));
  context.strokeRect(px(37), py(4), pw(26), ph(7));
  context.strokeRect(px(26), py(81), pw(48), ph(15));
  context.strokeRect(px(37), py(89), pw(26), ph(7));

  if (showAllCanvasObjects) {
    drawLines.forEach((line) => {
      if (line.points.length < 2) return;
      context.save();
      context.strokeStyle = "#facc15";
      context.lineWidth = 2;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      context.moveTo(px(line.points[0].x), py(line.points[0].y));
      line.points.slice(1).forEach((point) => context.lineTo(px(point.x), py(point.y)));
      context.stroke();
      context.restore();
    });
  }

  players.forEach((player) => {
    const x = px(player.x);
    const y = py(player.y);
    const starterName = player.starterName.trim() || `${playerLabel} ${player.id}`;

    context.save();
    context.shadowColor = "rgba(0,0,0,0.35)";
    context.shadowBlur = 4;
    context.shadowOffsetY = 2;
    context.fillStyle = "#f8fafc";
    context.beginPath();
    context.arc(x, y, 14, 0, Math.PI * 2);
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#111827";
    context.font = "950 12px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(player.id), x, y + 0.5);
    context.restore();

    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 8px Inter, Arial, sans-serif";
    const nameWidth = Math.min(78, Math.max(46, starterName.length * 4.8));
    context.fillStyle = "rgba(16, 42, 25, 0.6)";
    context.beginPath();
    context.roundRect(x - nameWidth / 2, y + 18, nameWidth, 16, 8);
    context.fill();
    context.fillStyle = "#ffffff";
    context.fillText(starterName.toUpperCase(), x, y + 26, nameWidth - 8);
    context.restore();
  });

  if (showAllCanvasObjects) {
    opponentMarkers
      .filter((marker) => marker.onPitch)
      .forEach((marker) => {
        context.save();
        context.fillStyle = "#dc2626";
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(px(marker.x), py(marker.y), 8, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
      });
  }

  return canvas.toDataURL("image/jpeg", 0.78);
};

