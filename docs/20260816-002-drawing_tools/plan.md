# Implementation plan — tactical drawing tools

**Status: built.** 34 tests green (`npm test`), `npm run build:vercel` clean, verified in a browser.
TDD: test cases first, then the code that makes them pass. See [requirement.md](requirement.md).

Two things changed after the first pass, both from watching it on a real board:
- **Every kind but the dribble and the zones follows the drawn path**, so runs and passes can curve. Arrowheads are filled, sit smaller than first drafted, and the line stops at the head's back — or at a ghost marker's edge when there is one.
- **No side toggle.** Colour is detected from the marker a stroke starts on.

## Data model

One optional field on the existing type. No new entity, no migration.

```ts
// src/formationTypes.ts
export type DrawKind = "free" | "run" | "pass" | "dribble" | "block" | "zoneRect" | "zoneEllipse" | "link";

export type DrawSide = "us" | "them";   // detected from the start marker, never picked

export type DrawLine = {
  id: number;
  points: { x: number; y: number }[];
  kind?: DrawKind;   // absent = "free" — every line saved before this change
  side?: DrawSide;   // absent = "us"
  anchor?: string;   // "p3" | "o2" — ghost marker source, run/dribble only
};
```

Why `kind?` / `side?` and not a discriminated union: every existing row, share link and test fixture stays valid, and `kind ?? "free"` is the whole back-compat story. Share payload stays `version: 2` — both fields are additive and old clients that ignore them render a plausible freehand line.

Why the meaning (`run`) and not the stroke (`solid`), and `side` and not `"#dc2626"`: the notation research found solid/dashed reversed between coaching sources, and a stored hex is a stored theme decision. Both would make a palette or legend change a data migration. `side` also means a hostile payload can never inject a colour string into the renderer.

Colours are resolved in `drawGeometry` from `side`, using the two already on the pitch — `us` → `#f8fafc` (player token), `them` → `#dc2626` (opponent marker in the export). `free` ignores side and stays `#facc15`, so lines drawn before this change do not change colour.

Straight kinds keep exactly two points (start, end). `zoneRect` / `zoneEllipse` use those two points as a bounding box. `free` keeps the full polyline.

## Test cases

### `src/drawGeometry.test.ts` (new)

| # | case | expectation |
|---|---|---|
| 1 | `buildDrawGeometry({kind:"run", points:[a,b]}, aspect)` | one stroke path + one arrowhead; head sits at `b` |
| 2 | same line at `aspect: 0.65` and `aspect: 1.54` | arrowhead **side lengths equal within 1%** in rendered space — the anti-stretch guarantee |
| 3 | `kind:"dribble"` over a 40-unit line | wave points alternate sign, count scales with length, first/last points equal the endpoints |
| 4 | `kind:"block"` | two crossing segments centred on `b`, no arrowhead |
| 5 | `kind:"zoneRect"` with reversed drag (b above-left of a) | normalized bbox, positive width/height |
| 6 | `kind:"free"` | passes points through untouched, no head |
| 7 | unknown kind | treated as `free`, never throws |
| 7b | same `run` with `side:"us"` vs `side:"them"` | identical geometry, colour `#f8fafc` vs `#dc2626`; `free` is `#facc15` under both |

### `src/lineupShare.test.ts` (extend)

| # | case | expectation |
|---|---|---|
| 8 | round-trip a board holding one line of every kind, both sides | all `kind`, `side` and `anchor` values survive `buildSharePayload` → `encode` → `decode` |
| 9 | decode the existing V2 fixture already in this file | lines still decode, `kind` undefined, board renders as freehand |
| 10 | `normalizeSharedLineup` with `drawLines: [{id:1, kind:"<script>", side:"#f00", points:[{x:1e9,y:-4}]}]` | kind → `"free"`, side → `"us"`, x → `96`, y → `4` |
| 11 | `normalizeSharedLineup` with a 1-point line, a 0-point line, `points: "nope"`, `drawLines: {}` | all dropped, no throw |
| 12 | `anchor: 42` (non-string) / `anchor` on a `pass` | dropped |

10–12 close the existing hole: `drawLines` is currently taken from untrusted payloads with nothing but `Array.isArray`.

## Implementation steps

### 1. `src/drawGeometry.ts` (new, ~120 lines) — the single source of shape truth

```ts
export type DrawStroke = { points: Point[]; dash: number[] | null; color: string; width: number; fill?: string };
export function buildDrawGeometry(line: DrawLine, aspect: number): DrawStroke[];

const SIDE_COLOR: Record<DrawSide, string> = { us: "#f8fafc", them: "#dc2626" };
```

Colour is one lookup here and nowhere else — the three renderers read `stroke.color` and never know a side exists. Each stroke is emitted twice: a `rgba(0,0,0,.45)` under-stroke ~0.35 wider, then the coloured one, so a red line stays readable on top of a red opponent dot and a white line on top of a white token.

Input points are in **display space** (post-`pitchPointToDisplay`, 0–100 both axes). `aspect = renderedWidth / renderedHeight`. Everything angular — arrowhead legs, wave normals, the `✕` — is computed with x scaled by `aspect`, then divided back out. That is the entire fix for the stretch trap, and it is the same call for SVG and for both canvases.

Output is deliberately dumb: lists of points plus stroke attributes. SVG joins them into `d`; canvas walks them with `moveTo/lineTo`. Neither renderer does trigonometry.

`ponytail: straight kinds only — points[0]/points.at(-1). Curved arrows would need a bezier branch here and nowhere else.`

### 2. `src/formationTypes.ts` — add `DrawKind`, extend `DrawLine`

### 3. `src/lineupShare.ts` — `normalizeDrawLines(value: unknown): DrawLine[]`

Exported from here because it is where the other validators live. Validates kind against the `DrawKind` set and side against `"us" | "them"`, clamps every point with the existing `clampPitchCoordinate`, drops lines with `< 2` points, keeps `anchor` only when it is a string matching `/^[po]\d+$/` on a `run`/`dribble`.

Call it in **all four** decode paths, not just the one the feature touches — [lineupShare.ts:148](../../src/lineupShare.ts#L148), [savedLineupShare.ts:20](../../src/savedLineupShare.ts#L20), [formationFactories.ts:59](../../src/formationFactories.ts#L59), [useLineupRestoreActions.ts:78](../../src/hooks/useLineupRestoreActions.ts#L78). Same hole, four callers; one function fixes it once.

### 4. `src/hooks/useDrawingControls.ts` — carry the active kind

Add `activeDrawKind: DrawKind` + setter (state lives here, surfaced through `useAppController`). In `startDrawing`, stamp it on the new line, with `side: "them"` when the nearest-marker scan lands on an opponent. In `continueDrawing`, branch once:

- dribble + both zones → replace `points[1]` with the current position (rubber-band)
- everything else → append points, keeping the curve

On `stopDrawing`, drop the line if it travelled < 1% (tap guard). The nearest-marker scan runs once in `startDrawing` — a plain `find` over `players` + `opponentMarkers` within 4% of the start point — and feeds both `side` (opponent hit → `"them"`) and, for `run`/`dribble`, `anchor`.

`ponytail: nearest-marker scan is O(n) over ≤23 markers, once per stroke.`

### 5. `src/PitchField.tsx` — render through the geometry module

Replace the `<polyline>` block with `buildDrawGeometry(line, aspect).map(stroke => <path .../>)`, keeping `vectorEffect="non-scaling-stroke"`.

`aspect` comes from a 12-line `useElementAspect(pitchRef)` (ResizeObserver → `width / height`). Measured, not derived from `isLandscape`, because [workspace-fullscreen.css:158](../../src/styles/workspace-fullscreen.css#L158) sets `aspect-ratio: auto`. Default `68/105` before first measure so the first paint is not wrong.

### 6. `src/DrawToolPanel.tsx` (new) + `src/styles/draw-tools.css`

The tool buttons (label + a glyph drawn by `buildDrawGeometry` itself, so a button can never show a stroke the board would not draw), then a one-line hint that colour follows the starting marker. One array drives the buttons and their glyphs, so the panel *is* the legend — no separate title or key.

The glyph viewBox is deliberately tiny (17×8 pitch units, halo strokes filtered out). Arrowheads, the block cross and the zig-zag are all sized in pitch units, so a large preview box would shrink them to specks; over ~14 units they read at button size the way FTB's toolbar glyphs do.

Wiring:
- **Desktop** — `LineupStage` gets an optional `drawTools` node. The stage is already a `58px | 1fr | 230px` grid inside the green, whose third column holds the marker tray in personnel mode and the timeline in animation mode — and is empty in draw mode. The panel drops straight into it and borrows the tray's card styling, so it reads as part of the board rather than a fourth column of chrome.
- **Mobile** — the draw bottom sheet already exists (`showDrawSheet`, driven by `activeBottomSheetTool === "DRAW_TOOL"` in [useTacticalWorkspaceSync.ts:91](../../src/hooks/useTacticalWorkspaceSync.ts#L91)). Render the same component there; CSS turns the button list into a horizontal scroller. Existing footer `DrawControls` (undo/redo/clear) stays exactly where it is — that strip has hand-tuned fullscreen CSS in three files and there is no reason to disturb it.

New strings go into **both** `vi` and `en` in [appI18n.ts](../../src/appI18n.ts) or TypeScript fails the build.

### 7. Canvas parity — `canvasLineupExport.ts` + `lineupThumbnail.ts`

Both loops become: `buildDrawGeometry(line, pitchWidth / pitchHeight).forEach(stroke => …)` with `setLineDash(stroke.dash ?? [])`. ~15 lines each, and they cannot drift from the board because the shape came from the same function.

### 8. Ghost markers and the projected ball

In `PitchField`, for each line with an `anchor`, resolve the marker and render a translucent copy of that token at the last point (`opacity: .45`, `pointer-events: none`). No new state — it is derived from `drawLines` on every render.

Export canvas: a dim circle with the shirt number, no name. Thumbnail: skipped.

The ball projection works the same way: `carriesBall(kind)` plus a distance check against the *current* ball position, positioned with `projectFromEnd` (the one exported geometry helper that knows about the aspect correction) so it lands beside a token rather than under it.

`ponytail: ghosts and the projected ball are derived from anchor + live positions at render time, not stored — nothing to keep in sync, and undo needs no special case.`

## Order and stopping points

| phase | ships | independently useful? |
|---|---|---|
| 1 | steps 1–3 (geometry + model + validation, all tests green) | yes — closes the unvalidated-payload hole on its own |
| 2 | steps 4–6 (tools usable on the board, panel, legend) | yes — the feature as requested |
| 3 | step 7 (export + thumbnail parity) | required before phase 2 is called done |
| 4 | step 8 (ghosts) | optional polish |

## Manual verification

`npm test` covers geometry and payloads. These cannot be unit-tested here:

1. ✅ Draw one of each kind → PNG export matches the board, colours included (checked via the real download button).
1b. ✅ A block drawn off an opponent dot comes out red; the same line drawn on grass comes out white.
1c. ✅ A white line crossing a player token stays visible (under-stroke check).
1d. ✅ Curved run stays curved; dribble zig-zag stays regular; arrows stop at the ghost edge.
2. ✅ Portrait → landscape toggle: arrowheads stay square, zig-zag keeps amplitude.
3. **iOS Safari landscape fullscreen** — draw, drag a marker, drop it off-pitch. The pointer path in [pitchPointer.ts](../../src/pitchPointer.ts) exists because WebKit breaks `getScreenCTM` under CSS transforms; anything touching the draw layer has to be retested there.
4. Open a share link produced by the current production build → old lines still render.
5. Save to Supabase, reload, load from locker → kinds survive.
6. ✅ 390px viewport: the strip scrolls horizontally inside the draw sheet, no page overflow. The mobile sheet sets `font-size: 0`, hides child `<span>`s and disables pointer events for its own icon buttons — the strip has to opt back out of all three (`src/styles/draw-tools.css`).


## Bugs found while testing

Both pre-existing, both surfaced by driving the board in a browser:

1. **Redo duplicated a line.** `undoDrawLine`/`redoDrawLine` called one state updater from inside the other; React double-invokes updaters in development, so the nested `setDrawLines` ran twice and the board grew two lines with the same id (duplicate-key warnings included). Both now compute from the current arrays instead of nesting.
2. **A press that started off the pitch fed its points to the previous line.** `startDrawing` returned early without clearing `activeDrawLineId`, so the next drag extended whatever was drawn last into a fan of stray segments. It now clears the id on the way out.

Also hardened: `Date.now()` as a line id could collide between two quick strokes — now `Math.max(Date.now(), lastId + 1)`.
