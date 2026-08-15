# Short share links (`/s/:code`)

**Status:** code complete — blocked on running the SQL against Supabase
**Opened:** 2026-08-16

## Problem

Share URLs are too long to be shareable. Decoding a real link produced by the app:

| payload | `?lineup=` param length |
|---|---|
| a 7-a-side board with names | **2,131 chars** |
| a lineup with an 8-frame animation | **17,420 chars** |

Two causes:

1. The payload is verbose JSON — all 11 opponent markers are serialized even when every one of them sits at its default off-pitch `50/50`, and keys like `"substituteName"` repeat 11 times.
2. `copyShareLink` ([src/hooks/useLineupExportActions.ts](../../src/hooks/useLineupExportActions.ts)) unconditionally attaches `useTacticalStore.getState().frames`, and each animation frame re-serializes all 23 markers in full.

Links of this size get truncated by chat clients, are unusable as QR codes, and look broken when pasted anywhere a human can see them.

## Infra constraint

**This app has no backend.** `public/CNAME` is `doihinhsanco.pro.vn` and `.github/workflows/deploy.yml` publishes to GitHub Pages — static hosting with no serverless functions. There is no `/api` directory, and `vercel.json` declares no functions (Vercel is the secondary deploy).

Supabase is therefore the only available store. It is already a dependency and its anon key already ships in the bundle. The share table must be **anonymously writable**, because sharing works today without an account and must keep working that way.

## Decision

Replace the inline payload with a stored short link.

| knob | value | why |
|---|---|---|
| TTL | **7 days** | Long enough for a link pasted into a group chat to survive the week it's relevant. |
| Row cap | **2,000** | ≈285 shares/day of headroom. Global, not per-user — there are no users to scope to. |
| Payload cap | **50 KB** | ≈30 animation frames (8 frames measured at 13 KB). Bounds the adversarial disk worst case at 100 MB. |

### Free tier capacity (checked against supabase.com/pricing)

Free plan: 500 MB database, 5 GB egress, unlimited API requests, 50,000 MAU, *"Free projects are paused after 1 week of inactivity."*

| 2,000 rows of… | disk | % of 500 MB |
|---|---|---|
| plain lineups (1.6 KB) | 3.2 MB | 0.6% |
| 8-frame animations (13 KB) | 26 MB | 5% |
| adversarial, every row at 50 KB | 100 MB | 20% |

Egress allows ~400,000 link opens/month at the largest realistic payload. MAU is unaffected — requests use the anon key with no session, so no auth user is created. Share rows carry no `thumbnailDataUrl` (that field only exists in `StoredLineupState`, saved to `lineups`), so the base64 JPEG thumbnails that dominate existing disk use don't apply here.

Capacity is not the risk. The **1-week inactivity pause** is: if the project sleeps, every share link dies. That is already true of auth and the locker, but this change makes anonymous sharing — which needs no backend today — depend on Supabase being awake.

## Scope

- A `share_links` table with anon insert + read-live-rows-only RLS, a self-cleaning trim trigger (no cron), and the three caps above.
- `/s/:code` resolves the stored payload and hands off to the existing workspace by rebuilding today's `?lineup=` URL. **The decoder, restore path, and workspace state are not touched.**
- Both share entry points go through it: the toolbar Copy link and the locker's share-a-saved-lineup action.
- Falls back to today's inline URL whenever Supabase is unconfigured or the insert fails — no user-visible failure.

## Out of scope

- The compact v3 payload format (measured at 244 chars / 1,070 chars for the two cases above). Storing the payload server-side makes its size irrelevant, so building both systems is not justified. It stays the named fix if the fallback path or the 50 KB cap starts biting.
- Rate limiting. Not possible without a real backend; the three caps bound the damage instead.
- Short links for the `?tactics=` payload. `encodeTacticalPayload` has no call site — nothing in the app produces those links.

## Acceptance criteria

1. Copying a share link yields `https://doihinhsanco.pro.vn/s/xxxxxxxx` (8 chars, `[a-z0-9]`).
2. Opening it restores the identical board — players, names, opponents, draw lines, animation frames, and mode.
3. Every link already shared in the old `?lineup=` format still opens. Non-negotiable.
4. An expired or unknown code shows a clear message and a way into the app, never a blank board or a crash.
5. A row whose jsonb was tampered with is rejected by the same validation a pasted URL goes through, with coordinates clamped.
6. With Supabase env vars absent, Copy link still works and produces the old inline URL.
7. The table settles at ≤2,000 rows without any scheduled job.
8. `/s/` is excluded from the sitemap and marked `noindex,nofollow`.

## Known ceilings

- Animations beyond ~30 frames exceed the 50 KB cap, fail the insert, and fall back to an inline URL that is broken at that size. Fix if it appears: the compact format above.
- ~2,000 live links at a time; the oldest is evicted first even if its week isn't up.
- Open write endpoint. Bounded by size + row cap + TTL, not by authentication.
