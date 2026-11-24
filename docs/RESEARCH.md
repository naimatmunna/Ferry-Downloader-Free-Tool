# Research Summary — Ferry

Research conducted 2026-11-24. This file summarizes the findings and the
decisions they drove. The full evidence base is:

* **Report:** [`research/reports/Universal media downloader landscape.md`](research/reports/Universal%20media%20downloader%20landscape.md) — ≈10,000 words, every claim cited.
* **Notes (with source URLs and access dates):** [`research/research_notes/Universal media downloader landscape/`](research/research_notes/Universal%20media%20downloader%20landscape/) —
  `engines.md`, `platform_catalog.md`, `social_platform_policies.md`,
  `video_audio_open_platform_policies.md`, `legal_landscape.md`, `competitors.md`,
  `web_platform_mobile_ux.md`.
* **Derived documents:** [`PLATFORM-COMPATIBILITY.md`](PLATFORM-COMPATIBILITY.md) (generated from the registry),
  [`COMPETITOR-ANALYSIS.md`](COMPETITOR-ANALYSIS.md), [`FEATURE-GAP-ANALYSIS.md`](FEATURE-GAP-ANALYSIS.md).

Nothing here is legal advice. Operators should take their own counsel before
offering the service publicly.

---

## 1. The one-paragraph answer

The engines are a solved problem; **permission is the binding constraint**.
yt-dlp reaches roughly 1,000 distinct platforms (1,731 `supportedsites.md`
entries, 136 marked broken; about 800–900 useful), but of 53 platforms whose
terms were reviewed only 22 permit downloading (11 through sanctioned download
features, 11 through open licences). The most-requested sources (YouTube,
TikTok, Instagram, X, Reddit, Twitch) are technically extractable but closed to
third-party tools, and YouTube's signature cipher has been treated as an
effective technical protection measure by a US district court (2022) and the
Hanseatic Higher Regional Court in Hamburg (2024). So Ferry is built as a
**permission router with extraction engines behind it**, not as an extractor
with compliance bolted on.

## 2. Engines (see `engines.md`)

| Engine | Version (2026-11-24) | Licence | Verdict |
|---|---|---|---|
| yt-dlp | 2026.11.23 (+ yt-dlp-ejs 0.8.0) | Unlicense | **Primary extractor.** Python ≥ 3.11. 13 security advisories in 3 years, all fixed by 2026.07.04; never self-update in production. |
| FFmpeg | 9.0.2 local (9.1 latest, 2026-11-20) | LGPL/GPL by build | **Processing.** Local-files only; MOV rejects VP9/AV1/Opus, WebM accepts only VP8/VP9/AV1 + Opus/Vorbis (verified). |
| gallery-dl | **1.32.21** (pinned; installed 2026-11-24) | GPL-2.0-only | **Image galleries and carousels** for registry entries with `engine: 'gallery-dl'` (~358 sites/instances upstream; Ferry enables only its allowlisted entries). Runs only as a separate program, never imported. |
| Streamlink | 8.6.3 | BSD-2-Clause | Optional future live recording; Twitch/Kick plugins rely on browser anti-bot flows → excluded. |
| Cobalt | — | AGPL-3.0 API, CC-BY-NC-SA web | **Rejected**: dormant since 2026-04-06, hosted instances off-limits, uses PO-token generation and IP rotation. |
| you-get, lux, aria2 | stale | various | Rejected (unmaintained; aria2 has unpatched 2026 CVEs). |
| N_m3u8DL-RE, curl_cffi impersonation, PO-token plugins | — | — | **Prohibited**: DRM decryption or anti-bot circumvention. |

Key engineering facts that shaped the code:

* yt-dlp needs a JavaScript runtime **only** to solve YouTube's challenges →
  Ferry runs with `--no-js-runtimes --no-remote-components` (and no Deno/Node grant).
* 21 extractors silently use browser impersonation when `curl_cffi` is
  installed → Ferry's environment installs yt-dlp **without** curl_cffi, and
  never passes `--impersonate`; `--xff never` disables header spoofing.
* `--max-filesize` is not enforced for HLS/DASH → the egress proxy enforces a
  per-job byte cap.
* yt-dlp flags DRM as `has_drm: true|'maybe'`; Ferry drops both.
* **gallery-dl 1.32.21** (`pip install "gallery-dl==1.32.21"`; its only dependency
  is `requests`). Local development: the project `.venv` (found automatically, or
  `GALLERYDL_PATH`). Docker: its own venv at `/opt/gallery-dl`, so it cannot import
  yt-dlp. **Licence:** GPL-2.0-only. Ferry runs it as a subprocess (mere
  aggregation) and never imports or modifies it. Anyone distributing an image
  that contains it must meet the GPLv2 terms for gallery-dl itself: keep its
  licence notices (the wheel ships them, and its Python source). This is not
  legal advice.
* gallery-dl hardening, verified against the 1.32.21 source:
  * `--config-ignore` skips `%APPDATA%\gallery-dl\config.json`,
    `~/.config/gallery-dl/…` and `/etc/gallery-dl.conf`.
  * `-j` reports extractor failures inside the JSON as `[-1, {error, message}]`
    with exit code 0; Ferry classifies those.
  * `--range` indexes count every file message, so the probe and the download
    select the same files.
  * `--child-filter False` stops child extractors when downloading.
  * `-o downloader.ytdl.enabled=false` blocks the `ytdl:` hand-off that some
    extractors use for embeds (Behance, ArtStation and VSCO emit
    `ytdl:<YouTube/Vimeo/HLS URL>`). In the probe, those items count as videos
    and are never offered.
  * `-o browser=false` turns off the Firefox header and TLS-cipher imitation
    that the ArtStation, Behance and VSCO extractors switch on by default. This
    applies the same no-impersonation rule as yt-dlp's missing `curl_cffi`, so
    those three sites may refuse requests.
  * No extractor sets an `X-Forwarded-For` geo-bypass by default, and Ferry
    passes no `--xff`.
  * Federated Mastodon posts need gallery-dl's `mastodon:<url>` instance prefix.

## 3. Platforms and permission (see `PLATFORM-COMPATIBILITY.md`)

Ferry's registry holds **249 distinct platforms** (aliases folded) plus the
*Direct link* and *Other website* fallbacks:

| Category | Count | Default behaviour |
|---|---|---|
| 1. Officially supported downloads | 22 | Allowed (Internet Archive, PeerTube, podcast RSS…); SoundCloud/Bandcamp hand off to their own buttons |
| 2. Authorized user-owned exports | 7 | Official export only (YouTube Studio/Takeout, Meta "Download your information", …) |
| 3. Openly licensed media | 12 | Allowed (Wikimedia Commons, NASA, LibriVox, Jamendo…) |
| 4. Permission-restricted | 138 | User confirms ownership/permission; official routes shown |
| 5. Protected | 70 | Refused (DRM, paywalls, sign-in walls, dead services) |

Machine-readable permission signals exist for only ~15 platforms; Ferry uses
the ones it can verify server-side: PeerTube `downloadEnabled`, Internet Archive
`access-restricted-item` (lending library), and yt-dlp's DRM flags.

### Why YouTube API access is not download permission

Three layers each withhold the right: the YouTube Terms of Service ("Permissions
and Restrictions"), the YouTube API Services Terms (§16.3 grants no rights to
the audiovisual content), and the Developer Policies (III.E.1 prohibits
downloading, caching and offline storage; III.I.14 prohibits retrieving data
outside the API). A Creative Commons label is permission from the uploader, not
from YouTube. **Decision:** YouTube is category 2 (official export only) by
default; yt-dlp's YouTube extractors are excluded at the engine level
(`--use-extractors default,-youtube(:.*)?,…`) so embeds and redirects cannot
reach them either. Operators can change the policy; the report sets out the
least-exposed configuration and its risks.

## 4. Legal landscape (see `legal_landscape.md`)

* **US:** *Yout v. RIAA* (D. Conn., 30 Sep 2022) — YouTube's measures are a
  technological measure and Yout circumvented it; Second Circuit decision still
  pending on 2026-11-24. *Arista v. Kurbanov* (FLVTO/2conv) ended in an
  $82.9 M default judgment, partly driven by server-log discovery.
  *Cox v. Sony* (25 Mar 2026) narrowed contributory liability but not §1201.
* **Germany/EU:** OLG Hamburg (21 Nov 2024, 5 U 54/23) — the cipher is an
  effective TPM; even a host linking to youtube-dl was liable. InfoSoc Art. 6
  protects TPMs independently of infringement.
* **Enforcement:** blocking orders against rippers in at least eight
  jurisdictions (UK, Denmark, India, Italy, Australia, Canada 2026, …);
  Y2Mate shut down in Vietnam (Oct 2025); IFPI asked the EU (Sep 2026) to list
  yt-dlp on its piracy watch list.
* **Privacy:** IP addresses are personal data under GDPR even when hashed
  (Breyer; EDPB 01/2025) → Ferry logs no IPs by default and keeps history on
  the device.

## 5. Competitors (see `COMPETITOR-ANALYSIS.md`)

No product is simultaneously clean, mobile-first and sustainably funded:
ad-funded rippers rely on dark patterns and face blocking orders; paid desktop
tools break with each YouTube change and have stranded licences; fake
"downloader" browser extensions are a recurring malware vector (StealTok 2026,
GhostPoster 2026), and JDownloader's site served malware for two days in May
2026. Ranked opportunities Ferry acts on: a visibly clean experience, honest
errors and live platform status, honest quality labels (no "320 kbps" from a
130 kbps source), an Android share-to-save flow, verifiable privacy, and a
compliance-first scope.

## 6. Browsers and mobile (see `web_platform_mobile_ux.md`)

* The browser's own download manager beats every PWA API: same-origin
  `Content-Disposition: attachment` with `filename*`, **strong ETag**, Range
  support, no blobs. (Express's default ETags are weak — Ferry sets its own.)
* **iOS Home-Screen web apps break downloads** (WebKit bug 290847, open since
  April 2025) → Ferry detects standalone iOS and opens files in Safari.
* Web Share Target works on Android Chromium only → shipped in the manifest.
* `navigator.clipboard.readText()` needs a gesture and may be refused → the
  Paste button falls back to focusing the field with guidance.
* Background tabs throttle timers; iOS drops connections when suspended →
  stateless batched polling with an immediate refresh on `visibilitychange`.
* WCAG 2.2: 24 px minimum targets (Ferry uses 44 px), status messages via live
  regions, and 2.2.1 timing → "Keep longer" on files that are about to expire.

## 7. Decisions applied in Ferry

| Decision | Where it lives |
|---|---|
| Permission registry with five categories and runtime overrides | `packages/shared/src/platforms/*`, `apps/server/src/policy/policies.js` |
| Policy checked before any fetch, re-checked against the extractor actually used and the final URL | `apps/server/src/media/probeService.js` |
| YouTube extraction off by design; no JS runtime, cookies, impersonation, PO tokens | `apps/server/src/engines/ytdlp.js` |
| DRM as a hard stop (`has_drm` true or maybe) | `apps/server/src/media/normalize.js` |
| Official APIs first (Internet Archive, PeerTube) | `apps/server/src/adapters/` |
| Image galleries through gallery-dl (allowlisted entries only, images only, no cookies/logins/impersonation, every image re-encoded) | `apps/server/src/adapters/galleryDl.js`, `apps/server/src/engines/galleryDl.js`, `apps/server/src/media/gallery.js` |
| Egress guard proxy (SSRF, DNS rebinding, byte caps) | `apps/server/src/security/egressProxy.js` |
| Remux first, transcode only incompatible streams, honest labels | `apps/server/src/media/finalize.js`, `packages/shared/src/formats.js` |
| No IPs in logs, on-device history, no trackers | `apps/server/src/logger.js`, `apps/web/src/state/history.js` |
| Native download manager delivery with strong ETags | `apps/server/src/app.js` |
| Android share target, iOS standalone workaround | `apps/web/public/manifest.webmanifest`, `apps/web/src/lib/download.js` |

## 8. Open questions (tracked in `FEATURE-GAP-ANALYSIS.md` §5)

Whether a URL-fetching downloader is a DSA hosting service; whether per-job
attestations reduce operator liability; the outcome of the *Yout* appeal; iOS
background-download behaviour on each release (needs device tests); and keeping
the registry current — re-run the extractor count and policy review at every
yt-dlp upgrade.
