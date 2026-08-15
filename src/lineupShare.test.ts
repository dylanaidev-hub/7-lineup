import { describe, expect, it } from "vitest";
import {
  buildSharePayload,
  decodeSharePayload,
  encodeSharePayloadObject,
  normalizeSharedLineup,
} from "./lineupShare";
import { formationsBySize, isFormationKey } from "./formationPresets";
import { createOpponentMarkersFromSharedLineup, createPlayersFromSharedLineup } from "./formationFactories";
import { isPitchSize } from "./appRouting";
import type { FormationKey } from "./formationTypes";

const realValidators = {
  isPitchSize,
  isFormationKey,
  hasFormation: (pitchSize: 5 | 7 | 11 | "custom", formation: FormationKey) =>
    Boolean(formationsBySize[pitchSize][formation]),
};

const player = (id: number, x: number, y: number, starterName = "", substituteName = "", onPitch = true) => ({
  id,
  starterName,
  substituteName,
  extraNames: [] as string[],
  x,
  y,
  onPitch,
});

const board = () =>
  buildSharePayload(
    7,
    "2-3-1" as FormationKey,
    0,
    [
      player(1, 50, 90, "Dũng"),
      player(2, 34, 68, "An", "Bình"),
      player(3, 66, 68, "Cường"),
      ...Array.from({ length: 8 }, (_, index) => player(index + 4, 50, 50, "", "", false)),
    ],
    Array.from({ length: 11 }, (_, index) => ({ id: index + 1, x: 50, y: 50, onPitch: index < 2 })),
    [{ id: 1, points: [{ x: 10, y: 20 }, { x: 30.55, y: 40 }] }],
    [
      [
        { id: "p1", label: "1", type: "player" as const, x: 50, y: 90, onPitch: true },
        { id: "ball", label: "", type: "ball" as const, x: 50, y: 56, onPitch: true },
      ],
    ],
    "LINEUP",
  );

// A link produced by the app before short links existed. Every one of these
// already in the wild must keep working.
const V2_FIXTURE =
  "eyJ2ZXJzaW9uIjoyLCJjdXJyZW50TW9kZSI6IkxJTkVVUCIsInBpdGNoU2l6ZSI6NywiZm9ybWF0aW9uIjoiMi0zLTEiLCJwbGF5ZXJzIjpbeyJpZCI6MSwic3RhcnRlck5hbWUiOiJkc2QiLCJzdWJzdGl0dXRlTmFtZSI6IiIsImV4dHJhTmFtZXMiOltdLCJ4Ijo1MCwieSI6OTAsIm9uUGl0Y2giOnRydWV9LHsiaWQiOjIsInN0YXJ0ZXJOYW1lIjoiZCIsInN1YnN0aXR1dGVOYW1lIjoiZCIsImV4dHJhTmFtZXMiOltdLCJ4IjozNCwieSI6NjgsIm9uUGl0Y2giOnRydWV9LHsiaWQiOjMsInN0YXJ0ZXJOYW1lIjoiZCIsInN1YnN0aXR1dGVOYW1lIjoiZGQiLCJleHRyYU5hbWVzIjpbXSwieCI6NjYsInkiOjY4LCJvblBpdGNoIjp0cnVlfV0sIm9wcG9uZW50TWFya2VycyI6W3siaWQiOjEsIngiOjUwLCJ5Ijo1MCwib25QaXRjaCI6ZmFsc2V9XSwiZHJhd0xpbmVzIjpbXSwiYW5pbWF0aW9uRnJhbWVzIjpbXX0";

describe("share payload", () => {
  it("round-trips a full board through build → normalize", () => {
    const payload = board();
    const restored = normalizeSharedLineup(payload, realValidators);

    expect(restored).not.toBeNull();
    expect(restored!.pitchSize).toBe(7);
    expect(restored!.formation).toBe("2-3-1");
    expect(restored!.currentMode).toBe("LINEUP");
    expect(restored!.players).toHaveLength(11);
    expect(restored!.players[0]).toMatchObject({ id: 1, starterName: "Dũng", x: 50, y: 90, onPitch: true });
    expect(restored!.players[1]).toMatchObject({ starterName: "An", substituteName: "Bình" });
    expect(restored!.opponentMarkers).toHaveLength(11);
    expect(restored!.drawLines).toEqual([{ id: 1, points: [{ x: 10, y: 20 }, { x: 30.6, y: 40 }] }]);
    expect(restored!.animationFrames).toHaveLength(1);
    expect(restored!.animationFrames![0]).toHaveLength(2);
  });

  it("survives the base64 hop", () => {
    const payload = board();
    const decoded = decodeSharePayload(encodeSharePayloadObject(payload), realValidators);

    expect(decoded).toEqual(normalizeSharedLineup(payload, realValidators));
  });

  it("still decodes links shared before this change", () => {
    const decoded = decodeSharePayload<FormationKey>(V2_FIXTURE, realValidators);

    expect(decoded).not.toBeNull();
    expect(decoded!.pitchSize).toBe(7);
    expect(decoded!.formation).toBe("2-3-1");
    expect(decoded!.players[0].starterName).toBe("dsd");
  });

  it("rejects payloads that are not a shareable lineup", () => {
    expect(normalizeSharedLineup(null, realValidators)).toBeNull();
    expect(normalizeSharedLineup("nope", realValidators)).toBeNull();
    expect(normalizeSharedLineup({}, realValidators)).toBeNull();
    expect(normalizeSharedLineup({ formation: "9-9-9", players: [] }, realValidators)).toBeNull();
    expect(normalizeSharedLineup({ formation: "2-3-1", players: "not-an-array" }, realValidators)).toBeNull();
  });

  it("clamps hostile coordinates from a tampered row back onto the pitch", () => {
    const hostile = normalizeSharedLineup(
      {
        version: 2,
        pitchSize: 7,
        formation: "2-3-1",
        players: [player(1, 9999, -50, "x")],
        opponentMarkers: [{ id: 1, x: -1000, y: 1000, onPitch: true }],
      },
      realValidators,
    );

    expect(hostile).not.toBeNull();

    const players = createPlayersFromSharedLineup(hostile!);
    const opponents = createOpponentMarkersFromSharedLineup(hostile!);

    expect(players[0].x).toBe(96);
    expect(players[0].y).toBe(4);
    expect(opponents[0].x).toBe(4);
    expect(opponents[0].y).toBe(96);
  });
});
