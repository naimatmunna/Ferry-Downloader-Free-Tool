# Ferry Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Ferry web UI to the approved mockups (English only, real site logos with honest statuses, live status dots, bolder look) and make live status window-aware on the server.

**Architecture:** Same stack and data flow (React 19 + Router 8 + Zustand + Tailwind 4, client-side detection from `/api/v1/platforms`). New design tokens replace the old "terminal signage" palette; components are restyled in place. Site logos are vendored from Simple Icons by a one-off generator into two plain JS modules (a small "featured" set in the main bundle, the rest lazy-loaded). Live status reuses the existing `GET /api/v1/status` endpoint, whose server-side health window gains a "last hour, else last 24 hours" rule.

**Tech Stack:** Node 24, Express 5, React 19.3.1, React Router 8.5.1, Zustand 5.1.0, Tailwind 4.3.5, Vite 8.3.7, `@fontsource-variable/archivo` 5.3.0 (new), Simple Icons 16.37.0 data (vendored, not a dependency), node:test, Playwright 1.65.0.

**Spec:** `design/ferry-redesign-mockups.html` (approved 2026-11-24). Statuses and counts come from `packages/shared/src/platforms/catalog.js` and the effective policies served by `/api/v1/platforms`.

## Global Constraints

- English only: delete `es.js`, `ar.js`, the Language setting, RTL handling and the Noto Kufi Arabic font. Keep the `t()` helper with `en.js` as the single dictionary.
- Typeface: Archivo variable (wdth 62–125, wght 100–900). Display: wdth 122%, weight 820, tracking −0.025em. Remove Overpass.
- Colour tokens (light / dark): sun `#FFD43B`; ink `#14161A` / `#F1F2F4`; paper `#FFFFFF` / `#17191E`; canvas `#F3F4F6` / `#0E0F12`; field `#ECEEF1` / `#23262C`; primary = ink in light, sun in dark; status ok `#0E7536`, perm `#2356D8`, off `#985700`, lock `#5D6470`, warn `#B03E06`, bad `#C9302C` (dark values as in the mockup's `:root[data-theme="dark"]`).
- Statuses shown to people, from the effective policy: allowed → "Free to save"; attestation → "Your own or with permission"; export_only → "Official download only"; blocked → "Protected"; generic/direct → "Any other site"; disabled → "Turned off here"; `available === false` → "Not on this server yet".
- Live dots only when the server has data: operational → green "Working", degraded → orange "Some links fail", failing → red "Failing". No dot for unknown. Copy names the real window ("last hour" or "last 24 hours").
- Never present a site as working because it is technically reachable: shelves and pills come from the effective policy, never from reliability.
- Logos: Simple Icons 16.37.0 (CC0), vendored path data only; credit in Settings › About and README ("trademarks of their owners, shown only to name each site").
- No new runtime dependency except `@fontsource-variable/archivo` (replaces two font packages). No network at build time.
- No commits unless the user asks (session rule). Checkpoints run tests instead.
- Keep every existing feature: batch links, playlists, galleries, trim, subtitles, thumbnail, metadata, compress, file names, pause/resume/cancel/retry/extend, auto-save, delete-after-save, history, share target, offline banner, iOS hint, toasts.

## Review Focus

1. Operator policy overrides (a featured site set to `disabled`): Home shelves and Sites must move it out of "Download directly". Test: Task 3 `siteStatus` unit test for disabled/unavailable.
2. Platform with no logo in Simple Icons: tile shows a monogram, never an empty square. Test: Task 2 generator test + Task 6 E2E (Sites search for a site without a logo).
3. `/api/v1/status` failing or slow: Home and Sites render without dots, no error toast. Test: Task 4 E2E with the status route aborted.
4. Downloads survive a page reload (the `storage` import was missing in `state/downloads.js`). Test: Task 6 E2E reload test.
5. Dark mode contrast of black logo tiles and pills on the dark top band. Check: Task 7 browser pass in dark mode.

---

### Task 1: Window-aware live status (server)

**Files:**
- Modify: `apps/server/src/metrics.js`
- Test: `apps/server/test/unit/metrics.test.js` (new)
- Modify: `docs/API-DOCUMENTATION.md` (`GET /api/v1/status`)

**Interfaces:**
- Produces: `createMetrics({ now = () => Date.now() } = {})`; `platformHealth()` → `{ [platformId]: { status: 'unknown'|'operational'|'degraded'|'failing', window: '1h'|'24h', attempts: number, successRate: number, topErrors: {code,count}[] } }`.

- [ ] **Step 1: Write failing tests** in `metrics.test.js`: `uses the last hour when it has 3+ attempts` (10 ok at now−2h, 3 `EXTRACTION_FAILED` now → `failing`, `1h`, attempts 3); `falls back to 24 hours when the last hour is quiet` (5 ok at now−3h, 1 ok now → `operational`, `24h`, attempts 6); `user-side failures do not count` (`ATTESTATION_REQUIRED` ×5 → platform absent); `drops outcomes older than 24 hours` (only at now−25h → absent); `fewer than 3 attempts is unknown`.
- [ ] **Step 2: Run** `node --test apps/server/test/unit/metrics.test.js` → FAIL.
- [ ] **Step 3: Implement** 5-minute buckets (keep ≤288 per platform), hour window = buckets newer than now−60 min, day window = newer than now−24 h; pick hour if its source-counted total ≥ 3, else day; thresholds unchanged (≥90 % operational, ≥50 % degraded).
- [ ] **Step 4: Run** the test file and `npm run test:unit` → PASS. Update the API doc's `/status` example with `window`.

### Task 2: Site logo generator

**Files:**
- Create: `scripts/make-brand-icons.mjs`, `apps/web/src/lib/brands/featured.js`, `apps/web/src/lib/brands/all.js` (both generated, committed with the repo)
- Test: `apps/web/test/brands.test.js` (new; root `test` and `test:unit` globs gain `apps/web/test/**/*.test.js`)

**Interfaces:**
- Produces: each module `export const ICONS = { [catalogId]: { title, path, bg, fg, light?: true, accent: string|null, fx?: 'tiktok'|'outline' } }`; `featured.js` holds exactly the ids in `FEATURED` below; `all.js` holds every other catalog id with a Simple Icons match.
- `FEATURED`: tiktok instagram x vimeo twitch reddit pinterest bluesky dailymotion tumblr internet-archive peertube flickr imgur youtube facebook soundcloud bandcamp threads snapchat vk netflix spotify apple-music tidal deezer hbo-max kick rumble bilibili mastodon ted nasa wikimedia-commons.
- Hand-tuned styles for featured ids are the mockup's `.b-*` rules (light tiles: pinterest, dailymotion, flickr, internet-archive, nasa, youtube, facebook; TikTok `fx:'tiktok'`; Snapchat `fx:'outline'`; Instagram and Apple Music gradients). Others: `bg` = brand hex, `fg` = `#fff` when the hex's relative luminance < 0.45, else `#000`.
- `accent` (progress bar colour) = the hex when its luminance is between 0.06 and 0.6, else `null` (ink is used).

- [ ] **Step 1: Write failing test** `brands.test.js`: every `FEATURED` id exists in `featured.js`; every entry's `path` matches `/^[MmZzLlHhVvCcSsQqTtAa0-9.,\-\s eE]+$/`; no id appears in both modules; every id is a catalog id; `fg` ≠ `bg`.
- [ ] **Step 2: Run** `node --test apps/web/test/brands.test.js` → FAIL (modules missing).
- [ ] **Step 3: Implement the generator**: read the catalog, map ids to slugs (`id.replace(/-/g,'')` plus overrides: weibo→sinaweibo, x→x, hbo-max→hbomax, apple-tv-plus→appletv, youtube-music→youtubemusic), fetch `https://cdn.jsdelivr.net/npm/simple-icons@16.37.0/data/simple-icons.json` and each matched `icons/<slug>.svg`, keep only the validated `d` attribute, write both modules with a header naming the source and licence; print unmatched ids.
- [ ] **Step 4: Run** `node scripts/make-brand-icons.mjs` then the test → PASS.

### Task 3: Foundations (tokens, font, English only, helpers)

**Files:**
- Modify: `apps/web/package.json` (+`@fontsource-variable/archivo` 5.3.0; −overpass, −noto-kufi-arabic), `apps/web/src/styles/index.css`, `apps/web/src/lib/i18n/index.jsx`, `apps/web/src/lib/i18n/en.js`, `apps/web/src/state/settings.js` (drop `language`, persist version 2 with a migrate that deletes it), `apps/web/src/state/downloads.js` (add `import { storage } from '../lib/storage.js'`), `apps/web/src/components/ui.jsx`, `apps/web/src/components/Logo.jsx`, `apps/web/public/theme-init.js` (theme only, `lang="en"`)
- Delete: `apps/web/src/lib/i18n/es.js`, `apps/web/src/lib/i18n/ar.js`
- Create: `apps/web/src/lib/siteStatus.js`, `apps/web/src/state/liveStatus.js`, `apps/web/src/components/SiteIcon.jsx`, `apps/web/src/components/StatusPill.jsx`
- Test: `apps/web/test/siteStatus.test.js`

**Interfaces:**
- `siteStatus(platform) → 'free'|'perm'|'off'|'lock'|'any'|'off-server'|'unavailable'` (generic/direct → `any`; `policy==='disabled'` → `off-server`; `available===false` → `unavailable`).
- `shelfOf(status) → 'direct'|'official'|'protected'|null` (`free`,`perm` → direct).
- `liveDot(entry) → null|{ tone: 'ok'|'warn'|'bad', window: '1h'|'24h', attempts, successRate }` (unknown/missing → null).
- `useLiveStatus` store: `{ sites: Record<string, entry>, load(): Promise<void> }`; `load()` fetches `api.status()` at most every 30 s; failures leave `sites` unchanged and stay silent.
- `<SiteIcon id size? live? className? />`: featured data synchronously, `all.js` via one shared dynamic import, monogram (first letter, neutral tile) while loading or when missing; `aria-hidden` (names are always shown next to it).
- `<StatusPill status mini? />`, `<LiveDot tone />`, `<LivePill entry />`.

- [ ] **Step 1: Write failing tests** `siteStatus.test.js`: each policy maps as listed; disabled and unavailable win over policy; `generic` → `any`; `liveDot({status:'unknown'})` → null; `liveDot({status:'degraded',window:'1h'})` → tone `warn`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the helpers and stores, tokens, font, English-only i18n (new copy keys: `status.*`, `live.*`, `where.*`, `sites.*`), restyled primitives (`Button` variants primary/soft/line/ghost/danger; `IconButton`, `Segmented`, `ChoiceChips`, `Switch`, `Checkbox`, `TextField`, `Select`, `Sheet`, `EmptyState`; `PolicyBadge` removed).
- [ ] **Step 4: Run** `npm test` → PASS; `npm run build` succeeds.

### Task 4: App shell and Home

**Files:**
- Modify: `apps/web/src/components/AppShell.jsx`, `apps/web/src/features/downloader/UrlGate.jsx`, `apps/web/src/features/downloader/Panels.jsx`, `apps/web/src/pages/DownloaderPage.jsx`, `apps/web/src/main.jsx`
- Create: `apps/web/src/features/downloader/WherePanel.jsx`

**Interfaces:**
- Top bar on the hero colour on every page (brand, nav pills Download / Downloads (count) / History / Sites, theme toggle, Settings icon); phone tab bar Download / Downloads / History / Sites with a sun pill on the active tab.
- Dock: slot shows `<SiteIcon>` of the detected site (pop animation on change, none with reduced motion), auto-growing textarea kept (several links), right button "Paste" when empty, "Find media" when filled. `#gate-status` line: name, `StatusPill`, `LivePill`, one-sentence hint.
- `WherePanel`: three shelves from the registry (`shelfOf(siteStatus(p))`), featured ids in their current shelf, counts from the registry, `+N more` tile linking to `/sites`, live dots from `useLiveStatus`; tapping a tile focuses the field and fills nothing (real app: no sample links).
- Home body: "How it works" three steps, recent downloads (if history), footer line. Error panel = route card (official download), protected card, or generic error, each `role="alert"`.

- [ ] **Step 1: Write failing E2E** in `e2e/ferry.spec.js`: `home shows where Ferry works` (TikTok, YouTube, Netflix tiles visible in their shelves; counts match `/api/v1/platforms`); `status endpoint down: home still renders` (route `**/api/v1/status` aborted).
- [ ] **Step 2: Run** `npx playwright test -g "home"` → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.

### Task 5: Choose-a-file screens

**Files:**
- Modify: `apps/web/src/features/downloader/Workspace.jsx`, `Picker.jsx`, `Collections.jsx`, `Gallery.jsx`
- Create: `apps/web/src/lib/formatNotes.js`; Test: `apps/web/test/formatNotes.test.js`

**Interfaces:**
- `videoFormatNote(media, selection, containerId) → 'copy'|'convert'|'unknown'` and `audioFormatNote(track, formatId, bitrate) → 'copy'|'convert'|'lossless'|'unknown'`, using `containerAcceptsVideo/Audio` and `describeAudioConversion` from `@ferry/shared/formats`.
- Picker: mode tiles (sun when selected), quality as two-column radio rows (label, tag, size), format chips with "Copied, no quality loss" / "Converted, slower" sublabels, bitrate chips (Source + 320…64), existing honest notes kept, More options in `<details>`. CTA main line `Download {label}` (unchanged accessible prefix), second line size or "Size known after download". Phone: sticky bar above the tab bar.
- Media card: thumbnail with blurred backdrop (`object-fit: contain` over a blurred copy) so portrait videos show whole.

- [ ] **Step 1: Write failing tests** `formatNotes.test.js` (H.264+AAC → MP4 copy, WebM convert; Opus source → MP3 convert, OGG/OPUS copy; FLAC → lossless).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; update E2E selectors (bitrate chips, "Copied, no quality loss", `/^Download .*MKV/`). **Step 4: Run** unit + E2E → PASS.

### Task 6: Downloads, History, Sites, Settings

**Files:**
- Modify: `apps/web/src/pages/DownloadsPage.jsx`, `HistoryPage.jsx`, `SettingsPage.jsx`, `MiscPages.jsx`, `apps/web/src/main.jsx` (route `/sites`, `/platforms` redirects)
- Create: `apps/web/src/pages/SitesPage.jsx`, `apps/web/src/components/ProgressBar.jsx`
- Delete: `apps/web/src/pages/PlatformsPage.jsx`, `apps/web/src/components/RouteLine.jsx`

**Interfaces:**
- Ticket: stub with `SiteIcon`, perforation; title, state pill, meta line, `ProgressBar` (`role=progressbar`, brand `accent`, striped when converting, faded when paused, moving band when percent unknown), status line, actions (Pause/Resume/Cancel/"Try again"/Remove/Save/Play/Save all as ZIP/Keep longer). Desktop aside: retention note, auto-save, delete-after-save, concurrency.
- Sites: search, filters (All / Download directly / Official download only / Protected / Turned off when any), card grid, detail panel (desktop) or sheet (phone) with what it has, how Ferry handles it, official routes, live line, rules-checked date.
- Settings: no Language; About credits Archivo and Simple Icons.

- [ ] **Step 1: Write failing E2E**: `sites: search, filter and official routes` (search "you" → YouTube card → detail lists "YouTube Studio"); `downloads survive a reload` (start a job, reload, ticket still there and finishes). Update existing tests: "Try again", settings test without language.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm run build && npm run test:e2e` → PASS.

### Task 7: Polish, assets, docs, full check

**Files:**
- Modify: `apps/web/public/icons/icon.svg` (new mark) + regenerate PNGs (`npm run icons -w @ferry/web`), `apps/web/public/manifest.webmanifest` (theme `#FFD43B`, background `#F3F4F6`), `apps/web/index.html` (theme-color, `lang="en"`, no `dir`), `README.md`, `docs/SYSTEM-ARCHITECTURE.md` (web UI section), `docs/IMPLEMENTATION-ROADMAP.md`, `docs/PERFORMANCE.md` (bundle sizes)

- [ ] **Step 1:** `grep` for leftovers (`hull|signal|kelp|amber|sea-|buoy|surface-2|Overpass|Kufi|dir=|rtl:`) → none in `apps/web/src`.
- [ ] **Step 2:** `npm test`, `npm run build`, `npm run test:e2e` → all pass; record initial JS gzip size.
- [ ] **Step 3:** Browser pass (light, dark, 375 px, 1280 px): Home, a link of each status, picker, Downloads, Sites, History, Settings; fix what looks wrong.
- [ ] **Step 4:** Fresh reviewer subagent reviews the whole diff against this plan and the mockup; fix confirmed issues.
