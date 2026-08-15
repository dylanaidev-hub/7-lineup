# Tactical drawing tools

**Status:** built — phases 1-4 complete, tests green
**Opened:** 2026-08-16

## Where drawing is today

The whole feature is one shape: a freehand polyline.

```ts
// src/formationTypes.ts:24
export type DrawLine = { id: number; points: { x: number; y: number }[] };
```

- [useDrawingControls.ts](../../src/hooks/useDrawingControls.ts) — pointer down starts a line, every move appends a point, up ends it. Undo/redo is a two-stack push/pop over whole lines. No tool, no style, no colour.
- [PitchField.tsx:147-165](../../src/PitchField.tsx#L147-L165) — one `<polyline>` per line, hardcoded `stroke="#facc15"`, `strokeWidth="1.15"`.
- [DrawControls.tsx](../../src/DrawControls.tsx) — undo / redo / clear, rendered into the footer strip of [LineupColumn](../../src/LineupColumn.tsx).

So a coach can scribble, and that is it. There is no way to say *run* vs *pass* vs *dribble*, no arrowheads, no zones.

## Three renderers, not one

Any new shape has to be drawn three times, in three coordinate systems:

| renderer | space | file |
|---|---|---|
| SVG overlay (live board) | `viewBox 0 0 100 100`, `preserveAspectRatio="none"` | [PitchField.tsx:147](../../src/PitchField.tsx#L147) |
| Canvas PNG export | device px, `px()/py()` helpers | [canvasLineupExport.ts:242](../../src/canvasLineupExport.ts#L242) |
| Canvas locker thumbnail | device px, own `px()/py()` | [lineupThumbnail.ts:81](../../src/lineupThumbnail.ts#L81) |

Today each one is ~10 lines of "moveTo/lineTo", so the duplication is harmless. With arrowheads, dashes and sine waves it stops being harmless — the geometry must live in **one module** that all three consume.

### The stretch trap

`preserveAspectRatio="none"` on a 68×105 pitch means the SVG user space is **non-uniformly scaled** (≈1.54× more compressed in x than y). Positions survive that; *geometry* does not. An arrowhead computed in 0–100 space renders visibly skewed, a sine wave gets squashed on one axis. `vectorEffect="non-scaling-stroke"` only fixes stroke *width*, not shape.

Pitch aspect is normally a CSS constant (`--pitch-width: 68 / --pitch-length: 105`, swapped in landscape) — but [workspace-fullscreen.css:158](../../src/styles/workspace-fullscreen.css#L158) sets `aspect-ratio: auto !important`, so it cannot be assumed. It has to be measured.

## Persistence surface

`drawLines` is already carried through everything, which is good news — adding a field is additive, not a new pipeline:

| file | role |
|---|---|
| [lineupShare.ts:89](../../src/lineupShare.ts#L89) | encodes into the `?lineup=` / short-link payload (`version: 2`) |
| [lineupShare.ts:148](../../src/lineupShare.ts#L148) | decodes — **`Array.isArray(parsed.drawLines) ? parsed.drawLines : []`** |
| [lineupState.ts:41](../../src/lineupState.ts#L41) | `StoredDrawLine[]` + `savedDrawLinesByPitch` in the Supabase row |
| [savedLineupShare.ts:20](../../src/savedLineupShare.ts#L20), [formationFactories.ts:59](../../src/formationFactories.ts#L59), [useLineupRestoreActions.ts:78](../../src/hooks/useLineupRestoreActions.ts#L78) | restore paths, all `Array.isArray` and nothing more |

That bolded line is an existing hole. Player and opponent coordinates get clamped to 4–96 on decode; **draw-line points get no validation at all**. Share payloads come from pasted URLs and from `share_links` rows that anyone holding the public anon key can write. A hostile payload can put draw points at ±1e9 today. Fixing it is a prerequisite for adding a `kind` field, not a separate nice-to-have.

## Notation: there is no standard

The research turned up a real conflict. Coaching American Soccer documents **solid = pass, dashed = player movement**; FTB, Hobbit and most modern tactical boards use the **opposite** (solid = run, dashed = pass). UEFA's futsal coaching manual ships its own legend and doesn't match either exactly.

Consequence for the data model: **store the meaning, not the stroke.** A line is a `run`, and *the renderer* decides run is solid. Never store `{ style: "solid" }` — that locks the board into one convention and makes a legend swap a data migration.

The corollary is that the board needs a **legend**, because the convention is a choice, not common knowledge.

## Scope

Seven tools, all producible from a single pointer drag:

| tool | meaning | render |
|---|---|---|
| `run` | player run off the ball | solid line + filled arrowhead |
| `pass` (Chuyền/sút) | pass or shot | dashed line + filled arrowhead |
| `dribble` | carry the ball | zig-zag + filled arrowhead |
| `block` | defensive movement / blocked direction | solid line ending in `✕` |
| `zoneRect` (Khối / Box) | pressing zone, target zone | dim dashed rectangle, always red |
| `zoneEllipse` (Vùng / Zone) | highlighted area | dim dashed ellipse, always red |
| `link` (Nối tuyến) | formation line between players | thin dim dashed line, straight, no head |
| `free` | existing freehand scribble | unchanged (default for old data) |

**Shape carries the meaning, colour carries the side.** Every line belongs to a team:

| side | colour | matches |
|---|---|---|
| `us` (default) | white `#f8fafc` | our player tokens |
| `them` | red `#dc2626` | opponent markers (`#dc2626` in the export, the `#ff4048→#cf1522` dot on the board) |

No new palette — those are the two colours already on the pitch, so a red arrow reads as "opponent" without a legend lookup. This also settles the notation conflict cleanly: the *stroke pattern* says run/pass/dribble, the *colour* says whose it is. Yellow (`#facc15`) stays as-is for `free` only, so existing scribbles don't silently change team.

**Side is never picked, only detected.** A stroke that starts on an opponent marker is theirs (red); everything else is ours (white). Lines start on a player almost every time, so a colour toggle would be a control that mostly restates what the board already knows.

Zones are the exception: they are drawn on empty grass, so they have no marker to take a side from, and they mark space to press or attack — they are **always red**. The link line follows the normal rule, dimmed, so it reads as a relationship rather than a movement.

While the draw tool is active, the marker under the pointer gets a green ring, so it is obvious which player a stroke is about to belong to — and it keeps following the pointer *during* a stroke, lighting up the player who receives the pass or sits at the far end of a link. The draw layer covers the tokens, so this cannot be CSS `:hover`; it comes from the same nearest-marker scan that decides the side.

## The ball follows the action

If the ball is at the feet of whoever the stroke starts from (within 5 units), a `run`, `pass` or `dribble` projects where it ends up:

- the player took it with them → beside their ghost marker
- they passed or shot it → at the end of the line, offset beside the receiving token so it never disappears behind one

Like the ghosts, this is **derived, not stored**: the real ball never moves, undo needs no special case, and dragging the ball away from the passer drops the projection instead of leaving a stale one behind.

## Curves

`run`, `pass`, `block` and `free` keep **the whole path the coach drew**, so a run bending in behind the defence stays bent. Two-point kinds: the dribble (the zig-zag only reads as a dribble when it is regular), the two zones (they need corners) and the link (a formation line between two players is never a path anyone runs).

Arrowheads are filled triangles, and the line stops at the **back** of its head rather than running under the fill and out through the tip. Where a ghost marker sits at the end, the arrow stops at the ghost's **edge**, not its centre.

Plus **ghost markers**: a `run` or `dribble` that starts on top of a player leaves a translucent copy of that player at the arrow tip, so the board shows where the run ends.

Plus a **tool panel** — a card on the right *inside the green stage*, in the same column and with the same treatment as the marker tray, holding the tool buttons. Each button previews its own stroke, so the panel is the legend.

## Acceptance criteria

1. Selecting a tool in the panel and dragging on the pitch creates a line of that kind; the selected tool stays selected for the next drag.
1b. Lines are white by default and red when the stroke starts on an opponent marker, in all three renderers.
1c. Curved drags produce curved lines for every kind but the dribble and the zones.
2. Every kind renders identically (allowing for resolution) on the live board, in the PNG export, and in the locker thumbnail.
3. Arrowheads and wave amplitude are visually undistorted on a 68×105 portrait pitch, in landscape, and in mobile fullscreen.
4. A board drawn with the new tools round-trips through a share link and through a Supabase save/load with every kind intact.
5. A share payload created **before** this change still loads: its lines render as freehand yellow polylines, exactly as they do today.
6. A payload with `kind: "../../etc"`, `side: "#f00"`, `points: [{x: 1e9, y: NaN}]`, or a 1-point line does not crash the board — unknown kind falls back to `free`, unknown side to `us`, points clamp to 0–100, degenerate lines are dropped. No colour string ever comes out of a payload.
7. Undo / redo / clear keep working across mixed kinds.
8. The panel is reachable on mobile (existing draw bottom sheet), and the pitch stays usable at 360px wide.
9. Every tool button shows the stroke it draws, so no separate legend is needed.

## Edge cases

| case | expected |
|---|---|
| tap without dragging | no line created (needs ≥1% travel) |
| drag starts off-pitch | ignored, as today |
| drag leaves the pitch mid-stroke | endpoint clamps to 4–96 |
| landscape / rotated fullscreen | geometry follows the same `displayPointToPitch` path as today; **iOS landscape fullscreen must be retested** |
| ghost anchor player deleted or moved off pitch | ghost disappears, line stays |
| line drawn before this change | `side` absent → white would be wrong for old yellow scribbles, so `free` keeps `#facc15` regardless of side |
| press that starts off the pitch | ends the previous stroke instead of feeding it new points |
| red line over the red opponent dot | line keeps a thin dark outline (`stroke` + 0.35 wider dark under-stroke) so it stays visible on any background |
| pitch size switched 5 ⇄ 7 ⇄ 11 | lines stash and restore per pitch as they already do via `savedDrawLinesByPitch` |
| animation playback | draw layer already hides via `showAllCanvasObjects`; unchanged |

## Explicitly out of scope

- Free colour picker, stroke-width picker, and any manual side control. Colour means *side*, there are exactly two, and the board already knows which from where the stroke starts.
- Switchable notation themes (solid⇄dashed). The data model makes it a 6-line change later; building the theme UI now is speculative.
- Curved / multi-point bezier arrows. Straight two-point drags cover the requested set; `free` covers the rest.
- Training equipment (cones, mannequins, ladders), text labels, lofted-vs-ground pass variants.
- Semantic actor/receiver binding (`actor: "player-8"`, `receiver: "player-9"`) beyond the single ghost anchor.
- Auto-generated formation lines from the formation preset. `link` is drawn by hand.
- Animating draw lines across frames — `TacticalFrame` is `TacticalMarker[]` and knows nothing about lines. Leave it that way.
