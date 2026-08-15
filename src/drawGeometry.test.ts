import { describe, expect, it } from "vitest";
import { buildDrawGeometry, FREEHAND_COLOR, type DrawStroke, type GeometryPoint } from "./drawGeometry";

const PORTRAIT_ASPECT = 68 / 105;
const LANDSCAPE_ASPECT = 105 / 68;

const line = (points: GeometryPoint[]) => points;
const diagonal = line([
  { x: 20, y: 20 },
  { x: 60, y: 70 },
]);

/** Strokes are emitted as halo-then-colour pairs; the coloured ones are the shape. */
const coloured = (strokes: DrawStroke[]) => strokes.filter((stroke) => !stroke.color.startsWith("rgba(15,23,42"));

/** On-screen length: the square space geometry is computed in, up to a uniform scale. */
const screenLength = (a: GeometryPoint, b: GeometryPoint, aspect: number) =>
  Math.hypot((b.x - a.x) * aspect, b.y - a.y);

describe("buildDrawGeometry", () => {
  it("draws a run as a solid line that stops at the back of its arrowhead", () => {
    const strokes = coloured(buildDrawGeometry({ kind: "run", points: diagonal }, PORTRAIT_ASPECT));

    expect(strokes).toHaveLength(2);
    expect(strokes[0].dash).toBeNull();
    expect(strokes[0].points[0]).toEqual(diagonal[0]);

    const head = strokes[1].points;
    expect(head).toHaveLength(3);
    expect(head[1]).toEqual(diagonal[1]);

    // the body ends short of the tip, on the same line, so no stroke pokes
    // through the filled head
    const bodyEnd = strokes[0].points[strokes[0].points.length - 1];
    const gap = screenLength(bodyEnd, diagonal[1], PORTRAIT_ASPECT);
    expect(gap).toBeGreaterThan(0.5);
    expect(gap).toBeLessThan(screenLength(diagonal[0], diagonal[1], PORTRAIT_ASPECT) / 2);
    expect(screenLength(diagonal[0], bodyEnd, PORTRAIT_ASPECT) + gap).toBeCloseTo(
      screenLength(diagonal[0], diagonal[1], PORTRAIT_ASPECT),
      6,
    );
  });

  it("keeps a curved run curved and points the head along its last leg", () => {
    const curve = [
      { x: 20, y: 80 },
      { x: 22, y: 60 },
      { x: 34, y: 48 },
      { x: 52, y: 46 },
    ];
    const [body, head] = coloured(buildDrawGeometry({ kind: "run", points: curve }, PORTRAIT_ASPECT));

    // every waypoint but the trimmed tail survives
    expect(body.points.slice(0, 3)).toEqual(curve.slice(0, 3));
    expect(body.points).toHaveLength(4);
    // the head is filled, and aims along the final (near-horizontal) leg rather
    // than along the start-to-end chord
    expect(head.closed).toBe(true);
    expect(head.fill).toBe(head.color);
    const tip = head.points[1];
    const back = { x: (head.points[0].x + head.points[2].x) / 2, y: (head.points[0].y + head.points[2].y) / 2 };
    expect(tip.x).toBeGreaterThan(back.x);
    expect(Math.abs(tip.y - back.y)).toBeLessThan(Math.abs(tip.x - back.x) * PORTRAIT_ASPECT);
  });

  it("stops the arrow at a ghost marker's edge instead of its centre", () => {
    const plain = coloured(buildDrawGeometry({ kind: "run", points: diagonal }, PORTRAIT_ASPECT));
    const ghosted = coloured(buildDrawGeometry({ kind: "run", points: diagonal, ghostRadius: 4 }, PORTRAIT_ASPECT));

    const tip = (strokes: DrawStroke[]) => strokes[1].points[1];
    expect(screenLength(tip(ghosted), diagonal[1], PORTRAIT_ASPECT)).toBeCloseTo(4, 6);
    expect(screenLength(tip(plain), diagonal[1], PORTRAIT_ASPECT)).toBeCloseTo(0, 6);
    // still aimed the same way, just shorter
    expect(ghosted[0].points[0]).toEqual(diagonal[0]);
  });

  it("keeps arrowhead legs equal on screen whatever the pitch aspect", () => {
    const legLengths = [PORTRAIT_ASPECT, LANDSCAPE_ASPECT, 1].map((aspect) => {
      const head = coloured(buildDrawGeometry({ kind: "run", points: diagonal }, aspect))[1].points;
      return [screenLength(head[0], head[1], aspect), screenLength(head[1], head[2], aspect)];
    });

    legLengths.forEach(([left, right]) => expect(left).toBeCloseTo(right, 6));
    // and the same length in every orientation — no stretching with the pitch
    legLengths.flat().forEach((length) => expect(length).toBeCloseTo(legLengths[0][0], 6));
  });

  it("zig-zags a dribble around the straight path without moving its endpoints", () => {
    const [body] = coloured(buildDrawGeometry({ kind: "dribble", points: diagonal }, PORTRAIT_ASPECT));

    const head = coloured(buildDrawGeometry({ kind: "dribble", points: diagonal }, PORTRAIT_ASPECT))[1];

    expect(body.points.length).toBeGreaterThan(5);
    expect(body.points[0].x).toBeCloseTo(diagonal[0].x, 6);
    expect(body.points[0].y).toBeCloseTo(diagonal[0].y, 6);
    // the zig-zag runs the full distance; only the arrowhead reaches the end
    expect(head.points[1]).toEqual(diagonal[1]);

    const offsets = body.points.map((point, index) => {
      const progress = index / (body.points.length - 1);
      const onLine = {
        x: diagonal[0].x + (diagonal[1].x - diagonal[0].x) * progress,
        y: diagonal[0].y + (diagonal[1].y - diagonal[0].y) * progress,
      };
      return (point.x - onLine.x) * PORTRAIT_ASPECT;
    });
    expect(Math.max(...offsets)).toBeGreaterThan(0);
    expect(Math.min(...offsets)).toBeLessThan(0);
  });

  it("dashes a pass and leaves a run solid", () => {
    const [pass] = coloured(buildDrawGeometry({ kind: "pass", points: diagonal }, PORTRAIT_ASPECT));
    const [run] = coloured(buildDrawGeometry({ kind: "run", points: diagonal }, PORTRAIT_ASPECT));

    expect(pass.dash).not.toBeNull();
    expect(run.dash).toBeNull();
    expect(pass.points).toEqual(run.points);
  });

  it("ends a block in a cross, not an arrowhead", () => {
    const strokes = coloured(buildDrawGeometry({ kind: "block", points: diagonal }, PORTRAIT_ASPECT));

    expect(strokes).toHaveLength(3);
    const [first, second] = [strokes[1].points, strokes[2].points];
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    // both segments are centred on the line's end point
    expect((first[0].x + first[1].x) / 2).toBeCloseTo(diagonal[1].x, 6);
    expect((second[0].y + second[1].y) / 2).toBeCloseTo(diagonal[1].y, 6);
  });

  it("normalizes a zone rectangle dragged bottom-right to top-left", () => {
    const [zone] = buildDrawGeometry(
      {
        kind: "zoneRect",
        points: [
          { x: 70, y: 80 },
          { x: 30, y: 20 },
        ],
      },
      PORTRAIT_ASPECT,
    );

    expect(zone.closed).toBe(true);
    expect(zone.fill).toBeTruthy();
    expect(zone.points).toEqual([
      { x: 30, y: 20 },
      { x: 70, y: 20 },
      { x: 70, y: 80 },
      { x: 30, y: 80 },
    ]);
  });

  it("closes a zone ellipse inside the dragged box", () => {
    const [zone] = buildDrawGeometry(
      {
        kind: "zoneEllipse",
        points: [
          { x: 30, y: 20 },
          { x: 70, y: 60 },
        ],
      },
      PORTRAIT_ASPECT,
    );

    expect(zone.closed).toBe(true);
    zone.points.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(29.999);
      expect(point.x).toBeLessThanOrEqual(70.001);
      expect(point.y).toBeGreaterThanOrEqual(19.999);
      expect(point.y).toBeLessThanOrEqual(60.001);
    });
  });

  it("passes freehand points through untouched and keeps them yellow", () => {
    const scribble = line([
      { x: 10, y: 10 },
      { x: 12, y: 14 },
      { x: 19, y: 22 },
    ]);
    const strokes = coloured(buildDrawGeometry({ points: scribble }, PORTRAIT_ASPECT));

    expect(strokes).toHaveLength(1);
    expect(strokes[0].points).toEqual(scribble);
    expect(strokes[0].color).toBe(FREEHAND_COLOR);
  });

  it("colours by side and never by kind", () => {
    const us = coloured(buildDrawGeometry({ kind: "run", side: "us", points: diagonal }, PORTRAIT_ASPECT));
    const them = coloured(buildDrawGeometry({ kind: "run", side: "them", points: diagonal }, PORTRAIT_ASPECT));
    const themPass = coloured(buildDrawGeometry({ kind: "pass", side: "them", points: diagonal }, PORTRAIT_ASPECT));

    expect(us[0].color).toBe("#f8fafc");
    expect(them[0].color).toBe("#dc2626");
    expect(themPass[0].color).toBe(them[0].color);
    expect(us[0].points).toEqual(them[0].points);
  });

  it("keeps zones red whichever side they were drawn from", () => {
    const box = [
      { x: 20, y: 20 },
      { x: 60, y: 45 },
    ];
    const [us] = buildDrawGeometry({ kind: "zoneRect", side: "us", points: box }, PORTRAIT_ASPECT);
    const [them] = buildDrawGeometry({ kind: "zoneRect", side: "them", points: box }, PORTRAIT_ASPECT);
    const [ellipse] = buildDrawGeometry({ kind: "zoneEllipse", side: "us", points: box }, PORTRAIT_ASPECT);

    expect(us.color).toBe(them.color);
    expect(us.color).toContain("248,113,113");
    expect(ellipse.color).toBe(us.color);
    expect(us.dash).not.toBeNull();
    expect(ellipse.dash).not.toBeNull();
  });

  it("dashes the link line, dims it to the drawing side and keeps it straight", () => {
    const bent = [diagonal[0], { x: 25, y: 60 }, diagonal[1]];
    const [us] = buildDrawGeometry({ kind: "link", side: "us", points: bent }, PORTRAIT_ASPECT);
    const [them] = buildDrawGeometry({ kind: "link", side: "them", points: diagonal }, PORTRAIT_ASPECT);

    // the waypoint in the middle is dropped — a formation line never bends
    expect(us.points).toEqual(diagonal);
    expect(us.dash).not.toBeNull();
    expect(us.color).toContain("248,250,252");
    expect(them.color).toContain("248,113,113");
    expect(us.width).toBeLessThan(1);
  });

  it("keeps freehand yellow under both sides", () => {
    const us = coloured(buildDrawGeometry({ side: "us", points: diagonal }, PORTRAIT_ASPECT));
    const them = coloured(buildDrawGeometry({ side: "them", points: diagonal }, PORTRAIT_ASPECT));

    expect(us[0].color).toBe(FREEHAND_COLOR);
    expect(them[0].color).toBe(FREEHAND_COLOR);
  });

  it("puts a halo under every coloured stroke", () => {
    const strokes = buildDrawGeometry({ kind: "run", points: diagonal }, PORTRAIT_ASPECT);

    expect(strokes).toHaveLength(4);
    expect(strokes[0].color).toBe("rgba(15,23,42,0.45)");
    expect(strokes[0].width).toBeGreaterThan(strokes[1].width);
    expect(strokes[0].points).toEqual(strokes[1].points);
  });

  it("survives junk without throwing", () => {
    expect(buildDrawGeometry({ kind: "nope" as never, points: diagonal }, PORTRAIT_ASPECT)[1].color).toBe(FREEHAND_COLOR);
    expect(buildDrawGeometry({ kind: "run", points: [{ x: 5, y: 5 }] }, PORTRAIT_ASPECT)).toEqual([]);
    expect(buildDrawGeometry({ kind: "run", points: [] }, PORTRAIT_ASPECT)).toEqual([]);
    expect(
      buildDrawGeometry({ kind: "run", points: [{ x: 5, y: 5 }, { x: 5, y: 5 }] }, PORTRAIT_ASPECT),
    ).toHaveLength(2); // zero-length line: body only, no arrowhead
    expect(buildDrawGeometry({ kind: "run", points: diagonal }, 0)).not.toHaveLength(0);
    expect(buildDrawGeometry({ kind: "run", points: diagonal }, Number.NaN)).not.toHaveLength(0);
  });
});
