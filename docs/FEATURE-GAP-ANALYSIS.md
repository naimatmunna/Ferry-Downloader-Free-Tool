# Feature Gap Analysis — Ferry

> Companion to `COMPETITOR-ANALYSIS.md`. All external sources cited here were
> accessed **2026-11-24**. ⚠️ = competitor-authored source; 🔎 = search-summary
> only. Not legal advice.

---

## 1. Purpose and method

**Purpose.** Show, capability by capability, where Ferry leads, matches or
trails the market, which gaps are deliberate, and what to build next.

**Method.**
1. Capability rows come from `PRODUCT-REQUIREMENTS.md` (FR-1 … FR-34, NFRs,
   scope) and the Ferry decisions in `SYSTEM-ARCHITECTURE.md`.
2. Competitor columns come from the research notes in
   `docs/research/research_notes/Universal media downloader landscape/`
   (`competitors.md` primary; `web_platform_mobile_ux.md`, `legal_landscape.md`,
   `engines.md` and the two platform-policy notes supporting).
   *Best-in-class* = the strongest documented behaviour by any of the 16
   products; *typical* = the common pattern across segments.
3. Ferry columns: **MVP** = this release's scope; **Future** = the PRD's future
   list plus recommendations from this analysis (marked *rec.*).
4. Gaps in evidence are stated, not filled. "Not documented" means the sources
   reviewed are silent — not that the feature is absent.

Legend: ✅ strong / complete · 🟡 partial, caveated or paywalled · ❌ missing.

---

## 2. Capability gap matrix

| Capability | Best-in-class competitor | Typical competitor | Ferry MVP | Ferry future |
|---|---|---|---|---|
| **URL detection & normalization** | ✅ yt-dlp: 1,751 extractors incl. a generic one; cobalt: paste-and-go | 🟡 paste box or built-in browser (4K, VidJuice); site counts unverifiable | ✅ local detection < 100 ms with policy badge, before any fetch; tracking params stripped; short links expanded at probe; multi-link paste → batch | Grow the reviewed registry; regional overlays (*rec.*) |
| **Policy transparency** | 🟡 cobalt says it only fetches free, public content and names DRM refusals | ❌ none; "1,000+ sites" claims; Chrome VDH drops YouTube silently | ✅ 5-category registry, plain-language policy, official routes, runtime overrides with a reason, protected sources never probed | Versioned ToS snapshot per region; DE/EU stricter defaults (*rec.*) |
| **Preview** | ✅ format, resolution and fps lists from the probe (OVD, NewPipe) | 🟡 fixed menus; HQ may need a slow server render (SnapSave) | ✅ thumbnail, title, uploader, duration, licence, real qualities, audio tracks, subtitle languages; sizes only when reported; skeleton without fake % | In-browser playback of the finished file (FR-28 preview) |
| **Three modes** (video+audio / video only / audio only) | ✅ cobalt auto, audio and mute modes | 🟡 video or MP3; mute rarely documented | ✅ all three | — |
| **Video containers** | 🟡 MP4/MKV (4K, OVD); MP4/AVI (SnapDownloader) | 🟡 MP4 only (web rippers) | ✅ MP4, WebM, MKV, MOV, AVI (marked legacy, re-encodes); remux when codecs fit | — |
| **Quality ladder** | ✅ up to 8K (4K, SnapDownloader, cobalt API) | 🟡 high claims, real 360p caps (4K reviews, NewPipe until v0.28.8, SaveFrom 🔎) | ✅ 144p–8K + Best, filtered to the source; short-side labels so vertical video is correct; never upscales; HDR flag | — |
| **Audio formats & bitrates, honesty rules** | 🟡 4K publicly debunks "320 kbps" but still sells MP3; cobalt "better audio" | ❌ "320 kbps" marketing on ~160 kbps sources | ✅ MP3, M4A, AAC, WAV, FLAC, Opus, OGG; 64–320 kbps or Source; source → output label; "bigger file, no quality gain"; lossless-from-lossy labelled; stream copy when codecs match | Loudness normalization option (*rec.*, label as processing) |
| **Subtitles incl. language choice** | ✅ 4K: SRT in 50+ languages | 🟡 absent (SnapDownloader homepage), premium-only (VDH), or recent and partial (cobalt, 7 services since v11.2) | ✅ pick languages; SRT/VTT files or embedded (MP4/MKV/WebM); auto captions labelled | Machine-translated tracks labelled as such (*rec.*) |
| **Audio-language choice** | 🟡 NewPipe keeps the chosen track on resume (v0.29.2); cobalt stops picking AI dubs by default (v11.2) | ❌ not offered; picker still an open cobalt request | 🟡 tracks and languages listed in preview (FR-6); per-track selection not specified | ✅ audio-track picker with AI-dub labels (*rec.*) |
| **Thumbnails** | ✅ embedded art (Seal); square audio covers (cobalt) | Not documented | ✅ separate JPEG, re-encoded on our origin | Embed as cover art in audio files (*rec.*) |
| **Metadata** | ✅ embedded tags (yt-dlp, Seal, Parabolic) | Not documented | ✅ title, artist/uploader, date, source-URL comment (toggle) | — |
| **Naming templates** | ✅ filename templates (OVD, yt-dlp) | ❌ fixed names | ✅ `{title}` `{uploader}` `{platform}` `{id}` `{quality}` `{date}` with live preview; hostile-name sanitizing | — |
| **Trimming** | ✅ time-range downloads (yt-dlp); built-in trimmer (SnapDownloader, desktop) | ❌ none, or YouTube-only (VidJuice) | ✅ start/end; precise when re-encoding, nearest keyframe otherwise (stated in UI) | Scrubber with frame preview (*rec.*) |
| **Compression** | Not documented (format conversion only: SnapDownloader, ClipGrab) | ❌ | ✅ basic smaller H.264/VP9 re-encode | "Fit under N MB" target-size preset (*rec.*) |
| **Playlists / batch** | ✅ 4K one-click playlists and channels; SnapDownloader batch + scheduler | 🟡 capped on free tiers (4K) or single-link only (rippers) | ✅ playlists ≤ 50 items with select all/none; ≤ 20 pasted links; one preset for all | Podcast-feed follow for RSS sources (*rec.*); no polling of platforms whose ToS forbid automation |
| **ZIP bundle** | Not documented (4K exports a JSON *list*, not files) | ❌ | ✅ streamed ZIP for multi-file jobs | — |
| **Download manager** (pause / resume / cancel / retry) | ✅ queue managers (JDownloader; OVD balanced queue; SnapDownloader background queue) | 🟡 hand-off to the browser only (web rippers) | ✅ real progress only (bytes, speed, ETA when reported) via **batched polling — 1 s while active, slower when the tab is hidden, immediate refresh when visible** (stateless, survives mobile backgrounding; no SSE); pause/resume (`--continue`), cancel kills the process tree, retry only retryable codes (max 3), reattaches after reload; Range + strong-ETag delivery | Web Push "file ready" on Android/desktop (*rec.*) |
| **History** | 🟡 on-device history (NewPipe); JSON import/export of lists (4K) | ❌ none (web rippers) | ✅ on device, capped at 500, search/filter, re-download if policy still allows, delete one/all, opt-out, source links optional | Opt-in end-to-end-encrypted sync (PRD future) |
| **Settings & presets** | ✅ 4K "Smart Mode" presets | 🟡 per-download choices only | ✅ defaults for mode, container, quality, audio, bitrate, metadata, naming, theme, concurrency, auto-save, privacy; clear local data | Multiple named presets (*rec.*) |
| **Platform status page** | 🟡 cobalt reports outages in changelogs; 4K in release notes | ❌ silent breakage; opaque codes | ✅ Sites page and Home logo wall: status in plain words, content types, reliability, last checked, official routes, live status from job outcomes (last hour, else 24 h); operator overrides with reason reach clients without redeploy. 🟡 reliability is curated, not computed | ✅ automated health from job outcomes (`platform_health_daily`, scale-out design); degraded banner at paste time |
| **Share-to-app (Android)** | 🟡 native apps (Seal, NewPipe) — but sideloaded; 4K Android app | ❌ copy-paste into a website | ✅ PWA share target (GET `/share`, first URL from `url`/`text`/`title`); Chrome Android 76+; Samsung Internet likely (inferred); Firefox Android ❌ | Install prompt on Android Chromium only (*rec.*) |
| **iOS handling** | 🟡 cobalt: in-browser processing on iOS 15+, large files on iOS 18+ | ❌ "use a file-manager app" (SnapSave), $4.99/week copycats, old iOS unsupported (ssstik) | ✅ Safari-tab downloads to Files > Downloads with guidance; **standalone mode detected → "Open in Safari" instead of a download link** (WebKit 290847); no install promotion on iOS | Native share extension (PRD future); re-test every iOS release |
| **Accessibility** | Not documented for any competitor | Not documented; ad overlays and fake buttons are hazards | ✅ WCAG 2.2 AA: 24×24 px minimum (44×44 touch), visible focus, ≥ 4.5:1 text, `aria-live` status, keyboard, reduced motion; **"Keep longer" on ready files** for 2.2.1 Timing Adjustable | VoiceOver/TalkBack test passes (*rec.*) |
| **i18n / RTL** | Not documented | Not documented | English only by decision (2026-11-24) | — |
| **Privacy** | ✅ NewPipe (on-device, no Google APIs); cobalt (zero-log, opt-out analytics) | ❌ push-ad networks, marketing cookies, undocumented telemetry | ✅ no accounts, analytics or third-party requests; history on device; no IP logging by default; URLs hashed in logs; files deleted at TTL or on request | Published data-flow diagram + independent audit (*rec.*) |
| **Self-hosting** | 🟡 cobalt (Docker; but non-commercial web UI and a dormant repo) | ❌ closed desktop apps or SaaS | ✅ one container, no external services; non-root, read-only FS, resource limits | Redis/BullMQ + S3 + MongoDB drivers (PRD future) |
| **Security posture** | 🟡 yt-dlp fixes advisories fast (6 in 2026, all fixed by 2026.07.04) | ❌ bundled installers, malicious extensions, compromised official downloads, clone domains | ✅ egress guard (SSRF, DNS rebinding), no shell, hardened yt-dlp (no cookies, impersonation, `--exec`), outputs written by FFmpeg and verified by ffprobe, sandbox CSP, per-job tokens; no installer or extension | Signed images + SBOM, `security.txt` (*rec.*) |
| **Image galleries / carousels** | ✅ photo saves (ssstik); multi-item picker (cobalt) | 🟡 | ✅ gallery-dl adapter (GPL-2.0, subprocess), allowlisted sites only; image picker, metadata-free re-encode, ZIP | — |
| **Livestream recording** | Not documented (Streamlink is the engine reference) | ❌ | ❌ explicit "try after it ends" state | ✅ Streamlink adapter where authorized, with duration caps; no browser-challenge plugins (Twitch, Kick) |
| **Aspect-ratio conversion** | Not documented | ❌ | ❌ | ✅ crop/pad to 9:16, 1:1, 16:9 |

**Reading the matrix.** Ferry matches or beats best-in-class on honesty,
policy transparency, privacy, security and Android/iOS handling — areas where
the market is weakest. It trails on source breadth (by design, §3) and on
galleries, live recording and aspect-ratio tools (scheduled as future work).
Evidence for competitor rows: `COMPETITOR-ANALYSIS.md` §3–§4.

---

## 3. Where Ferry deliberately does less

Competitors win requests that Ferry refuses. That is a real cost, and the
product must own it openly rather than fail silently.

| Area | What competitors do | What Ferry does | Why | How Ferry communicates it |
|---|---|---|---|---|
| **YouTube** | Core selling point (4K, SnapDownloader, Y2Mate, cobalt), yet the most fragile source for all of them | **Official export only** by default: YouTube Studio (own uploads, 720p/360p MP4, max 5 downloads per video per 24 h), Google Takeout (own uploads, original or MP4), Premium offline (in-app, up to 29 days or 48 h by region) | ToS forbid downloads the Service doesn't offer and circumventing copy protection ([ToS](https://www.youtube.com/static?template=terms&hl=en&gl=US)); API policies forbid download, caching and offline use ([III.E.1](https://developers.google.com/youtube/terms/developer-policies)); courts treated the signature cipher as an effective TPM — *Yout v. RIAA*, D. Conn. 2022 ([CMU](https://completemusicupdate.com/stream-ripper-yout-circumvents-youtubes-technical-protection-measures-court-concludes/)) and OLG Hamburg 2024 ([heise](https://heise.de/-10181247)); full extraction now needs JS-challenge solving and PO tokens ([PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide)) | `EXPORT_ONLY` state at paste time, before any fetch: one sentence on why, plus buttons for Studio, Takeout and Premium offline ([Studio help](https://support.google.com/youtube/answer/56100?hl=en); [offline help](https://support.google.com/youtube/answer/11977233?hl=en)); same text on the Platforms page |
| **Logged-in, private and paywalled content** | Cookie import and built-in browsers (yt-dlp, OVD, VidJuice); private videos as a paid feature (4K) | Never asks for passwords or cookies; never probes sign-in-only media | Defeats access controls ([17 U.S.C. §1201](https://www.law.cornell.edu/uscode/text/17/1201)) and breaches platform terms; account-ban risk — yt-dlp's wiki suggests throwaway accounts ([wiki](https://github.com/yt-dlp/yt-dlp/wiki/Extractors)); ADR-8 | `AUTH_REQUIRED` / `PRIVATE_CONTENT` copy that says Ferry never asks for passwords, plus links to the platform's own export (Meta "Download your information", X archive, Takeout, Snapchat My Data) |
| **DRM** | Specialist tools decrypt with keys (e.g. N_m3u8DL-RE); cobalt refuses with a clear error | DRM formats dropped at probe; protected platforms (Spotify, Premium offline, Udemy, Apple purchases) are never probed | Encryption-based TPMs carry the highest risk under §1201 and InfoSoc Art. 6 ([EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32001L0029)) | `PLATFORM_BLOCKED` with the official offline route ("Use the official app's offline option") |
| **Impersonation and anti-bot evasion** | Browser impersonation (yt-dlp + curl_cffi), PO-token session servers and per-download IPv6 rotation (cobalt), geo-spoofing headers | None: no curl_cffi in the image, no PO tokens, no IP rotation, no `--xff` | Designed to defeat attestation and rate limits; fits "avoiding or bypassing" a measure; ToS breach (e.g. [cobalt env docs](https://raw.githubusercontent.com/imputnet/cobalt/main/docs/api-env-variables.md)) | Sources that need these show as unstable or unsupported on the Platforms page; rate limits surface as an honest `RATE_LIMITED` with a wait time, never as "content unavailable" |

**The trade-off, stated plainly.** Ferry will say "no" more often than any
competitor on the single most-requested source, and some users will leave for a
ripper. In exchange it avoids the failure modes that end competitors — breakage
waves, blocking orders, shutdowns — and earns trust it can keep. Ferry's
personas (creators exporting their own work, educators using open archives,
commuters saving podcasts and CC music) are served by sources where downloading
is permitted. Success depends on making each refusal *useful*: a reason, an
official route, and no dead ends.

---

## 4. Prioritized opportunity backlog (RICE)

**Scoring.** Reach = estimated % of monthly active users affected (0–100) ·
Impact = 0.25 / 0.5 / 1 / 2 / 3 · Confidence = % · Effort = person-weeks ·
**Score = R × I × C ÷ E.** Inputs are estimates; no usage data exist yet
(see R11). Items marked **must** are compliance or correctness work that ships
regardless of score.

### 4.1 MVP — finish or verify before release

| # | Item | R | I | C | E | Score |
|---|---|---|---|---|---|---|
| M1 | Strong ETag + Range on every delivery route (Express's default ETag is weak, so Chromium won't auto-resume) — **must** | 60 | 2 | 90% | 0.5 | **216** |
| M2 | CI network audit: zero third-party requests from the client | 100 | 0.5 | 90% | 0.5 | **90** |
| M3 | iOS standalone detection → "Open in Safari" instead of a download link — **must** | 15 | 3 | 90% | 0.5 | **81** |
| M4 | Share-target hardening: take the first URL from `url`, `text` or `title`; clear fallback where install isn't possible | 25 | 2 | 80% | 0.5 | **80** |
| M5 | Verify batched polling on real devices: 1 s while active, backoff when hidden, immediate refresh on `visibilitychange` | 50 | 1 | 80% | 0.5 | **80** |
| M6 | YouTube `EXPORT_ONLY` state with Studio / Takeout / Premium routes — **must** | 40 | 2 | 80% | 1 | **64** |
| M7 | Honest-label test suite (no option above source, bitrate warnings, sizes only when known) | 70 | 1 | 90% | 1 | **63** |
| M8 | Sites page: override reason + "degraded" banner at paste time | 50 | 1 | 80% | 1 | **40** |
| M9 | "Keep longer" on ready files with an expiry warning (WCAG 2.2.1) — **must** | 30 | 1 | 80% | 1 | **24** |
| M10 | Engine-error classification so the catch-all stays < 10% of failures | 20 | 2 | 70% | 2 | **14** |

### 4.2 Future enhancements

| # | Item | R | I | C | E | Score |
|---|---|---|---|---|---|---|
| F1 | Automated platform health from job outcomes | 50 | 1 | 70% | 3 | **11.7** |
| F2 | "Fit under N MB" target-size compression | 15 | 1 | 60% | 1 | **9.0** |
| F3 | Multiple named presets | 25 | 0.5 | 70% | 1 | **8.8** |
| F4 | Published data-flow diagram, independent audit, signed images + SBOM | 100 | 0.5 | 60% | 4 | **7.5** |
| F5 | More UI languages (declined: English only) | 15 | 1 | 70% | 2 | **5.3** |
| F6 | Audio-track picker with AI-dub labels | 10 | 1 | 70% | 1.5 | **4.7** |
| F7 | Aspect-ratio conversion (9:16, 1:1, 16:9) | 10 | 1 | 70% | 1.5 | **4.7** |
| F8 | Web Push "file ready" (Android, desktop) | 20 | 0.5 | 70% | 1.5 | **4.7** |
| F9 | ~~gallery-dl adapter for galleries and carousels (allowlisted)~~ — shipped | 20 | 1 | 60% | 4 | **3.0** |
| F10 | Import-your-export helper (Meta, X, Takeout archives) | 10 | 2 | 50% | 6 | **1.7** |
| F11 | iOS native share extension | 15 | 2 | 40% | 8 | **1.5** |
| F12 | Scale-out drivers (Redis/BullMQ, S3, MongoDB) — operator reach | 5 | 2 | 80% | 6 | **1.3** |
| F13 | Streamlink recording where authorized | 5 | 1 | 50% | 4 | **0.6** |
| F14 | OAuth exports of a user's own channel via official features | 5 | 2 | 40% | 8 | **0.5** |

---

## 5. Risks and open questions

| # | Risk / question | Evidence | Mitigation or decision needed |
|---|---|---|---|
| R1 | Users who want YouTube rips leave or review Ferry badly | YouTube is every segment's headline source (`COMPETITOR-ANALYSIS.md` §3) | Track the share of pastes ending in `EXPORT_ONLY`; make the routes genuinely helpful. **Open:** should operators be able to override YouTube to `allowed`/`attestation`, or should the override be locked to `export_only`/`blocked`? Ferry ships no PO-token or cookie support, so YouTube would be unreliable anyway. |
| R2 | Docs disagree on YouTube | `API-DOCUMENTATION.md` §3 and `DATABASE-DESIGN.md` §4.2 examples show YouTube as `attestation` | Align those examples with the `export_only` default. |
| R3 | Category-4 social platforms still ban automated extraction | TikTok ToS §3.4; Meta terms; Facebook says others' videos can't be downloaded ([help](https://www.facebook.com/help/android-app/1005944300373812)) | Attestation helps against inducement claims but is no defence to circumvention claims. **Open:** default Facebook and Threads to `export_only` (category 2 in the research)? |
| R4 | A public hosted instance is a "service" in law | §1201(a)(2) and InfoSoc Art. 6(2) cover services; *VCAST* judges the operator's own acts; DSA classification unclear | Ship operator guidance: terms, rights-holder contact, DMCA agent ($6, renew every 3 years), DSA Art. 16-style notice form. **Open:** provide templates in the repo? |
| R5 | One upstream engine | yt-dlp: 136 extractors marked broken; IFPI watch-list nomination (Sept 2026); generic extractor named in two advisories | Pin ≥ 2026.07.04 and review upgrades. **Open:** restrict the generic extractor to direct media files? |
| R6 | iOS behaviour may change under us | WebKit 290847 status on iOS 26.x/27.x unconfirmed; background downloads unreliable | Re-test every iOS release; keep the Safari route until fixed. |
| R7 | Resume silently fails | Express/send emits weak ETags; a fresh `Last-Modified` counts as weak | Covered by M1; add a regression test. |
| R8 | Retention vs. privacy | WCAG 2.2.1 needs a warning, ≥ 20 s to act and an extension (or limits > 20 h); privacy and disk caps favour short TTLs | "Keep longer" (M9). **Open:** maximum extension and per-client storage quota. |
| R9 | Share target reaches only part of Android | Needs Chromium with an installed WebAPK; Firefox Android ignores it | Paste-first design stays the primary path. |
| R10 | Polling load at scale | 1 s polling per active tab | One batched request per tab, hidden-tab backoff; watch the API p99 ≤ 50 ms target. |
| R11 | Priorities rest on inference | No surveys or usage data; Reddit sentiment unreadable; willingness to pay unknown | Validate with opt-in, on-device-only feedback before reprioritizing. |
| R12 | Ferry itself gets cloned or impersonated | Self-hostable apps spawn look-alike instances; cobalt bars its branding on forks | **Open:** brand and trademark policy for public instances. |
| R13 | Sustainability | Donation-funded peers decay (cobalt dormant since 2026-04-06) | **Open:** funding model that sells capacity, not lifted caps. |
