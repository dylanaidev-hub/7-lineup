type LineupDragPreviewState = {
  type: "player" | "opponent" | "ball";
  id: number | string;
  x: number;
  y: number;
};

type TacticalDragPreviewState = {
  type: "player" | "opponent" | "ball";
  label: string;
};

type TacticalDragPreviewPosition = {
  x: number;
  y: number;
};

export function LineupDragPreview({ preview }: { preview: LineupDragPreviewState | null }) {
  if (!preview) return null;

  return (
    <div
      className={`drag-preview ${
        preview.type === "opponent" ? "opponent-preview" : preview.type === "ball" ? "ball-preview" : "player-preview"
      }`}
      style={{ left: preview.x, top: preview.y }}
      aria-hidden="true"
    >
      {preview.type === "player" ? preview.id : null}
    </div>
  );
}

export function TacticalDragPreview({
  preview,
  position,
}: {
  preview: TacticalDragPreviewState | null;
  position: TacticalDragPreviewPosition | null;
}) {
  if (!preview || !position) return null;

  return (
    <div
      className={`tactical-drag-preview ${preview.type === "opponent" ? "opponent" : ""} ${
        preview.type === "ball" ? "ball" : ""
      }`}
      style={{ left: position.x, top: position.y }}
      aria-hidden="true"
    >
      {preview.type === "player" ? preview.label : null}
    </div>
  );
}
