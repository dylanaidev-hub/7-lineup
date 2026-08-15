# Implementation plan — short share links

TDD. Test cases first, then the code that makes them pass. See [requirement.md](requirement.md).

## Test cases

Runner: `npm i -D vitest`, `"test": "vitest run"`. Supabase is mocked with `vi.mock("./lib/supabaseClient")` — no test touches the network.

### `src/lineupShare.test.ts`

| # | case | expectation |
|---|---|---|
| 1 | `buildSharePayload(...)` → `normalizeSharedLineup(...)` | round-trips players, opponents, draw lines, animation frames, `currentMode`, `customCount` |
| 2 | `decodeSharePayload(V2_FIXTURE)` | a real pre-change URL string still decodes — guards every link already shared |
| 3 | `normalizeSharedLineup` on `null`, `{}`, unknown formation, non-array `players` | `null` each time |
| 4 | `normalizeSharedLineup` with `x: 999`, `y: -50` | clamped to `96` / `4` — the stored row is anon-writable |

### `src/shareLinks.test.ts`

| # | case | expectation |
|---|---|---|
| 5 | `createShortCode()` | 8 chars, matches `/^[a-z0-9]{8}$/`, 1,000 draws all distinct |
| 6 | `buildLineupUrlFromPayload(payload, origin)` | output parses back to the same payload via `decodeSharePayload` |
| 7 | `createShortShareLink` with `supabase === null`, and with insert returning an error | `null` both times — the fallback contract |
| 8 | `resolveShortShareLink` on select error and on empty result | `null` both times |

The SQL is not unit-testable here; it is covered by the manual verification steps below.

## Implementation steps

### 1. `supabase/schema.sql` — append

Table `public.share_links`: `id text pk`, `payload jsonb`, `created_at`, `expires_at default now() + interval '7 days'`, check `id ~ '^[a-z0-9]{8}$'`, check `pg_column_size(payload) < 50000`.

RLS on. Policy: select `using (expires_at > now())`, insert `with check (true)`. No update or delete policy — clients cannot modify or remove links.

`before insert` trigger `trim_share_links()`: delete expired rows, then delete everything past `order by created_at desc offset 1999`. Self-cleaning, no pg_cron.

### 2. `src/lineupShare.ts` — split, don't rewrite

The stored jsonb is the same `SharedLineup` object the encoder already builds, so the existing validation covers hostile rows for free. Extract:

- `buildSharePayload(...)` — the object construction lifted out of `encodeSharePayload`
- `encodeSharePayloadObject(payload)` — the base64url step lifted out
- `normalizeSharedLineup(parsed, validators)` — the validation body lifted out of `decodeSharePayload`

`encodeSharePayload` becomes `encodeSharePayloadObject(buildSharePayload(...))` and `decodeSharePayload` becomes parse + `normalizeSharedLineup`. Both existing call sites are untouched.

### 3. `src/shareLinks.ts` — new, ~50 lines

- `createShortCode()` — 8 chars from `crypto.getRandomValues`
- `createShortShareLink(payload, href)` → `URL | null` (null when `supabase` is null or insert errors)
- `resolveShortShareLink(code, validators)` → `SharedLineup | null`, via `normalizeSharedLineup`
- `buildLineupUrlFromPayload(payload, origin)` → `/app/lineup?pitch=<n>&lineup=<base64>`

### 4. `src/ShortLinkRedirect.tsx` + `src/main.tsx`

Resolve → `window.location.replace(longUrl)`. On `null`, render the expired/invalid message with a link to `/app/lineup?pitch=7`. Route goes **above** the `path="*"` catch-all or it redirects home. `SeoHead` with `robots="noindex,nofollow"`.

Static hosting already routes it: GitHub Pages via the `404.html` fallback, Vercel via the catch-all rewrite. Add `Disallow: /s/` to the robots.txt string in `vite.config.ts`. Do not add `/s/` to the prerender route list or sitemap.

### 5. Wire both share entry points

- `src/hooks/useLineupExportActions.ts` `copyShareLink` — already async; try short link, else the inline URL
- `src/savedLineupShare.ts` / `src/hooks/useLineupStorageActions.ts` — locker share, currently sync, needs `await`

### 6. `src/appI18n.ts`

New `AppCopy` keys in **both** `vi` and `en` or TypeScript fails: "link expires in 7 days" toast, expired/invalid-link message. Vietnamese is the source of truth.

## Verification

Steps 1, 2, 4 (fallback half), and the old-link check are **done**; 16 tests pass, `build:vercel` is clean, `/s/:code` renders its expired state for an unknown code, a pre-change `?lineup=` URL still restores its board, and with no Supabase configured Copy link falls back to the inline URL. Everything that needs a live Supabase project is still outstanding — **steps 3, 5, 6, 7, 8 and the Supabase half of 4.**

1. ✅ `npm test` — 16 cases green
2. ✅ `npm run build:vercel` — typecheck + build
3. ⬜ Run the new SQL in the Supabase SQL editor
4. ⬜ `npm run dev` → build a named 7-a-side lineup → Copy link → clipboard holds `…/s/xxxxxxxx`, opening it in a new tab restores the exact board
5. ⬜ Repeat with a 5+ frame animation — the 17k-char case
6. ⬜ Expiry: `update public.share_links set expires_at = now() - interval '1 minute';` → expired message, not a blank board
7. ⬜ Cap: `insert into public.share_links (id, payload) select substr(md5(i::text),1,8), '{}'::jsonb from generate_series(1,2100) i;` → `count(*)` = 2000
8. ⬜ Hostile row: `update public.share_links set payload = '{"formation":"9-9-9"}';` → invalid message, no crash
9. ✅ Fallback: with no `VITE_SUPABASE_URL` locally, Copy link produced a 2,160-char inline URL — unchanged behaviour
10. ⬜ iOS Safari: `copyShareLink` gains an `await` on the network insert **before** `navigator.clipboard.writeText`. Safari can reject a clipboard write that late in a gesture, dropping into the `window.prompt` fallback in `copyTextOrPrompt`. Test on device; if it fires, the fix is `ClipboardItem` with a promise.
