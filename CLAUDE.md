# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server (5173)
npm run build          # tsc -b → vite build (with prerender) → finalize → standalone → verify
npm run build:vercel   # tsc -b → vite build --mode vercel (SKIPS prerender/puppeteer/Contentful)
npm run preview        # serve dist/
```

There are no tests and no linter. `tsc -b` (inside the build scripts) is the only automated check — run `npm run build:vercel` for a fast typecheck + build, and the full `npm run build` only when prerendering/SEO output matters.

`npm run build` requires `VITE_CONTENTFUL_SPACE_ID` + `VITE_CONTENTFUL_ACCESS_TOKEN` (it fetches article slugs at config time) and downloads Chromium for Puppeteer. Copy `.env.example` → `.env`; Supabase vars are optional (the app degrades gracefully — see below).

## Feature docs (required)

Development is TDD. Before writing code for a phase or feature, create `docs/YYYYMMDD-ID-feat_name/` containing `requirement.md` (enriched requirement, acceptance criteria, edge cases) and `plan.md` (test cases first, then implementation steps). Env vars, build, test, and deploy details live in [docs/info.md](docs/info.md) — keep it current.

## Architecture

Two apps share one bundle, split at the router in [src/main.tsx](src/main.tsx):

1. **Public site** (`/`, `/tin-tuc`, `/ve-chung-toi`, `/tinh-nang/*`) — SEO-critical, prerendered to static HTML at build time, content from Contentful. Uses react-router + `SeoHead` (react-helmet-async).
2. **Canvas workspace** (`/app/*`) — `React.lazy(() => import("./App"))`, `noindex`. This is the actual product: the tactical pitch editor.

### Workspace: controller/view split

[src/App.tsx](src/App.tsx) is three lines. All logic lives in [src/hooks/useAppController.ts](src/hooks/useAppController.ts) (a ~585-line hook composing ~20 smaller hooks) and is passed as a single `model` prop to [src/AppView.tsx](src/AppView.tsx), which destructures it into ~100 named props. When adding a workspace feature: add the hook under [src/hooks/](src/hooks/), wire it into `useAppController`'s return object, then consume it in `AppView`.

State lives in two places that are deliberately bridged:
- **React state** — [useUnifiedWorkspaceState.ts](src/hooks/useUnifiedWorkspaceState.ts) holds players, opponents, draw lines, formation, and the per-pitch-size `saved*ByPitch` snapshots (switching 5→7→11 stashes/restores the previous board).
- **Zustand** — [src/stores/tacticalStore.ts](src/stores/tacticalStore.ts) holds only the animation timeline (frames, draft frame, playback).
- **The bridge** — [useTacticalWorkspaceSync.ts](src/hooks/useTacticalWorkspaceSync.ts) pushes React workspace state into `draftFrame` whenever the animation tool is inactive, and derives all animation-mode display state. Both directions run through here; don't sync them anywhere else.

### Modes and tools

`CanvasTool` (`PERSONNEL_TOOL` | `DRAW_TOOL` | `ANIMATION_TOOL`) is the UI selection; `WorkspaceMode` (`LINEUP` | `CUSTOM` | `ANIMATION`) is the derived state model. `activeBottomSheetTool` is the mobile variant — it starts `null` under 1024px so no sheet is open on load. These three must stay consistent; `useTacticalWorkspaceSync` derives the `show*` booleans from them.

### Pitch coordinate system

All positions are percentages in a 0–100 pitch space, clamped to 4–96 (`clampPitchCoordinate`). [src/pitchPointer.ts](src/pitchPointer.ts) converts pointer events → pitch coordinates and handles the landscape rotation (`pitchPointToDisplay` / `displayPointToPitch`, where landscape maps `(x,y) → (100-y, x)`). Mobile fullscreen uses a CSS-rotated "rotator" wrapper, so pointer math cannot rely on `getBoundingClientRect` alone — the manual offset walk in `pitchPointer.ts` exists because WebKit breaks `getScreenCTM` under CSS transforms. Touch anything pitch-drag-related and you must retest iOS landscape fullscreen.

`getZoneName` ([src/pitchZones.ts](src/pitchZones.ts)) maps coordinates back to position labels per pitch size.

### Routing inside /app

The workspace does **not** use react-router for its tabs. [src/appRouting.ts](src/appRouting.ts) reads/writes `history.pushState` directly (`/app/lineup?pitch=7`, `/app/profile`, `/app/locker`), and [useAppRouting.ts](src/hooks/useAppRouting.ts) listens to `popstate`. Legacy `?tab=`/`?tactics=` URLs are redirected in `main.tsx`.

### Sharing and persistence

- **Share links** — base64 payloads in `?lineup=` ([lineupShare.ts](src/lineupShare.ts)) and `?tactics=` ([tacticalData.ts](src/tacticalData.ts)). Payloads are versioned (`version: 1 | 2`; v2 added opponents/draw lines) and every decoded field is validated + coordinate-clamped. Adding a field means bumping/extending the decoder, not just the encoder.
- **Supabase** — [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts) exports `supabase: SupabaseClient | null` plus `isSupabaseConfigured`. Without env vars the app runs fully as an anonymous editor, so every call site must null-check. Schema in [supabase/schema.sql](supabase/schema.sql): `profiles` + `lineups.players_data` (jsonb `StoredLineupState`), both RLS-scoped to `auth.uid()`.
- Saved records store either a `StoredLineupState` or a `SavedTacticsState`; [lineupState.ts](src/lineupState.ts) is the shape of what goes into the DB and must stay backward-compatible with existing rows.

### Prerender pipeline

`npm run build` is fragile by design and fails loudly:
1. `vite.config.ts` fetches Contentful slugs, builds the route list, and renders each route with Puppeteer. Routes signal readiness by dispatching `prerender-ready` — components call [usePrerenderReady](src/hooks/usePrerenderReady.ts) once their data has loaded. A route that never signals hangs until the 30s timeout and ships a blank page.
2. The homepage renders at `/__prerender-home` (a route that exists solely so the prerenderer doesn't clobber `index.html`), then [scripts/finalize-prerender.cjs](scripts/finalize-prerender.cjs) moves it into place.
3. `seoFilesPlugin` writes `sitemap.xml`, `robots.txt`, and redirect stubs for the old `/tin-tuc-kien-thuc/*` URLs.
4. [scripts/make-standalone.cjs](scripts/make-standalone.cjs) inlines JS+CSS into `dist/standalone.html` (offline single-file demo) and writes the `404.html` SPA fallback for GitHub Pages.
5. [scripts/verify-prerender.cjs](scripts/verify-prerender.cjs) asserts title/description/canonical on every required route — **it will fail the build**, which is the point.

`SITE_URL` (`https://doihinhsanco.pro.vn`) and the static route list are duplicated in `vite.config.ts`, `SeoHead.tsx`, and `verify-prerender.cjs`; a new public route must be added in all three.

### i18n

Vietnamese is the default and the source of truth for copy; English is a full parallel table. UI strings live in `copyByLanguage` ([src/appI18n.ts](src/appI18n.ts)) keyed by the `AppCopy` type — adding a string means adding both `vi` and `en` or TypeScript fails. Language preference is in `localStorage` via [LanguageContext](src/LanguageContext.tsx). Prerendered HTML is always `lang="vi"`.

### Styling

Two systems coexist: **CSS Modules** (`*.module.css`) for page/landing components, and **global CSS** under [src/styles/](src/styles/) imported by [src/styles.css](src/styles.css) for the workspace, pitch, and fullscreen layers. The fullscreen stack (`mobile-dock-fullscreen.css`, `workspace-fullscreen.css`, `ios-immersive-fullscreen.css`) is driven by body/root classes toggled from [useFullscreen.ts](src/hooks/useFullscreen.ts), which also writes `--app-vvw/--app-vvh/--app-lvh` from `visualViewport`. Tailwind is configured but the workspace is hand-rolled CSS.

`useFullscreen` + [src/lib/mobilePlatform.ts](src/lib/mobilePlatform.ts) encode a lot of hard-won iOS/Safari behavior (pseudo-fullscreen fallback, pull-down dismiss suppression, orientation lock). Most recent commits are fixes in here — read the git history before changing it.

## Deployment

- **GitHub Pages** — `.github/workflows/deploy.yml` on push to `main`, runs the full `npm run build`.
- **Vercel** — `vercel.json` runs `build:vercel` (no prerender) with a catch-all rewrite to `index.html`.
- `.cursor/rules/usefullscreen-vercel-deploy.mdc` asks for auto commit+push+`vercel deploy --prod` after every change **on the `usefullscreen` branch only**. Ignore it on other branches; on that branch, verify with `npm run build:vercel` before deploying.
