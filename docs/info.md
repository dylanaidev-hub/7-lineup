# Project info

Reference for env vars, build, test, and deploy. Feature docs live in sibling folders (see [Doc convention](#doc-convention)).

## Env vars

Copy `.env.example` → `.env`. All vars are `VITE_`-prefixed, so they are **public** in the bundle — never put a service-role key here.

| Var | Required for | Notes |
|---|---|---|
| `VITE_CONTENTFUL_SPACE_ID` | `npm run build` | Fetched at Vite config time to build the prerender route list. Build fails without it. |
| `VITE_CONTENTFUL_ACCESS_TOKEN` | `npm run build` | Content Delivery API token (read-only). |
| `VITE_CONTENTFUL_ENVIRONMENT` | Contentful | Defaults to `master`. |
| `VITE_CONTENTFUL_CONTENT_TYPE` | Contentful | Article content type, `lineupFootball`. |
| `VITE_SUPABASE_URL` | Auth + saved lineups | Optional. Without it `supabase` is `null` and the app runs as an anonymous editor. |
| `VITE_SUPABASE_ANON_KEY` | Auth + saved lineups | Optional, same as above. |

CI: GitHub Pages workflow reads these from repo **variables**, except `VITE_CONTENTFUL_ACCESS_TOKEN` which is a **secret** (`.github/workflows/deploy.yml`).

## Build

```bash
npm ci
npm run dev            # Vite dev server on :5173
npm run build:vercel   # tsc -b + vite build, NO prerender — fast typecheck, use this by default
npm run build          # full: tsc -b → vite build (Puppeteer prerender) → finalize → standalone → verify
npm run preview        # serve dist/
```

`npm run build` downloads Chromium for Puppeteer and fails loudly if any route is missing title/description/canonical (`scripts/verify-prerender.cjs`). Only run it when prerender/SEO output matters.

## Test

```bash
npm test        # vitest run — unit tests in src/**/*.test.ts
```

Vitest uses `vitest.config.ts`, deliberately separate from `vite.config.ts` (which is async and throws without Contentful credentials). Node environment, no jsdom — add it if a component test ever needs one.

Pure modules are the cheap targets: `src/lineupShare.ts` and `src/shareLinks.ts` are covered. `src/tacticalData.ts`, `src/pitchZones.ts`, `src/pitchPointer.ts` are not yet. Pointer/fullscreen behavior on iOS landscape is **not** coverable by unit tests; verify it manually on a device.

`tsc -b` runs inside both build scripts.

## Deploy

- **GitHub Pages** — automatic on push to `main` via `.github/workflows/deploy.yml`, runs the full `npm run build`. Site: https://doihinhsanco.pro.vn
- **Vercel** — `vercel.json` runs `build:vercel` (no prerender) with a catch-all rewrite to `index.html`. Manual: `vercel deploy --prod`.

Adding a public route means updating the route list in **all three** of `vite.config.ts`, `src/components/SeoHead.tsx`, `scripts/verify-prerender.cjs`.

## Doc convention

One folder per phase/feature: `docs/YYYYMMDD-ID-feat_name/` (date = day the doc was opened, ID = zero-padded running number, e.g. `20260816-001-animation_export`). Each folder holds exactly two files:

- `requirement.md` — the enriched, unambiguous requirement: problem, scope, out of scope, acceptance criteria, edge cases, affected files. Kept updated as the requirement changes.
- `plan.md` — the implementation plan **and** the test cases, written before the code. TDD order: test cases first, then the code steps that make them pass.

No folder without a real feature behind it. Templates are not checked in — copy the nearest recent folder.
