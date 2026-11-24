# Product Requirements — Ferry

> **Paste a link. Keep the file.**
> Ferry turns a media link into a clean file, in the format and quality you
> choose, without ads, trackers, fake buttons or invented numbers, and it is
> upfront about what each platform allows.

---

## 1. Positioning

Most downloaders compete on "supports 1,000+ sites" and pay for it with ads,
pop-unders, bundled installers and misleading quality labels (see
`COMPETITOR-ANALYSIS.md`). Ferry competes on **trust and craft**:

1. **Honest by design.** Only options that exist are shown, sizes are never
   invented, upscaling is never offered, and a 128 kbps source is never sold as
   "320 kbps quality".
2. **Transparent rules.** Every platform shows a plain-language policy: allowed,
   allowed for your own or licensed content, export-only, or protected, with the
   official route where one exists.
3. **Private.** No account, no tracking; history stays on the device; files are
   deleted from the server within an hour (or immediately, if the user chooses).
4. **Mobile-first.** Built for one-handed use, with share-to-Ferry on Android
   and a download flow that survives the app going to the background.
5. **Self-hostable.** One container; no external services needed.

## 2. Personas

| Persona | Need | Typical sources |
|---|---|---|
| **Maya, creator** | Archive and repurpose her own uploads in the right format (vertical MP4, audio-only for a podcast clip). | Her TikTok/YouTube/Instagram uploads (attested), Vimeo with downloads enabled. |
| **Dr. Okafor, educator** | Save lectures and public-domain films for offline teaching in low-connectivity classrooms. | Internet Archive, TED, MIT OCW, Wikimedia Commons, PeerTube. |
| **Leo, commuter** | Save podcast episodes and Creative Commons music for the subway. | Podcast RSS, Jamendo, Bandcamp free downloads, SoundCloud (uploader-enabled). |
| **Sam, operator** | Host Ferry for a team; restrict platforms; keep costs bounded. | Admin API, policy overrides, limits. |

## 3. User stories (MVP)

* As a user, I paste a link and immediately see which platform it is and what
  is allowed there, before anything is fetched.
* As a user, I see a preview (thumbnail, title, duration) and only the
  qualities and formats that the source actually has.
* As a user, I choose **Video + audio**, **Video only (no sound)**, or **Audio
  only**, pick a quality and a format, and download with one tap.
* As a user, I see real progress (bytes, speed, ETA when reliable) and can pause,
  resume, cancel, and retry when retrying makes sense.
* As a user, I can paste several links (or a playlist) and queue them with one
  preset.
* As a user, I can find, filter and re-download past items, or delete my
  history entirely.
* As a user, I set defaults once (format, quality, audio format, file naming,
  theme).
* As an Android user, I share a link from another app straight into Ferry.
* As an operator, I can disable or restrict a platform instantly without
  redeploying.

## 4. Functional requirements

### 4.1 URL intake and detection

| ID | Requirement |
|---|---|
| FR-1 | A single, large URL field is the primary element of the home screen, with **Paste** and **Clear** controls. |
| FR-2 | Detection runs locally as the user types (no network) and shows the platform name and policy badge within 100 ms. |
| FR-3 | URLs are trimmed, validated (`http/https`, ≤ 2 048 chars, no credentials), and normalized (tracking parameters such as `utm_*`, `si`, `igsh`, `fbclid` removed; known short links expanded at probe time). |
| FR-4 | Text containing several links is split into a batch (≤ `maxBatchUrls`). |
| FR-5 | Invalid input explains what is wrong ("Links must start with http:// or https://"). |

### 4.2 Analysis and preview

| ID | Requirement |
|---|---|
| FR-6 | Analysis shows thumbnail, platform, title, uploader, duration, license (when known), and available qualities, audio tracks and subtitle languages, with sizes when the source reports them. |
| FR-7 | Live streams in progress, private, sign-in-only, geo-blocked, DRM-only and over-limit items show a specific state and do not offer a download. |
| FR-8 | Playlists list up to `maxPlaylistItems` entries with select-all/none. |
| FR-9 | A skeleton reflects the real layout while analysis runs; no fake percentage. |

### 4.3 Download modes, formats, quality

| ID | Requirement |
|---|---|
| FR-10 | Modes: **Video + audio**, **Video only** (audio track removed), **Audio only**. |
| FR-11 | Video containers: MP4 (default), WebM, MKV, MOV, AVI (marked "legacy, re-encodes"). |
| FR-12 | Qualities: 144p, 240p, 360p, 480p, 720p HD, 1080p Full HD, 1440p QHD, 2160p 4K, 4320p 8K and **Best**, filtered to what the source has. Labels use the shorter frame side, so vertical video is labelled correctly. |
| FR-13 | Audio formats: MP3, M4A, AAC, WAV, FLAC, Opus, OGG (Vorbis); bitrates 64–320 kbps or **Source**. |
| FR-14 | The UI shows source vs output quality ("Source: Opus ~130 kbps → MP3 192 kbps") and warns when a bitrate is above the source ("bigger file, no quality gain"). Lossless containers from lossy sources say so. |
| FR-15 | The UI states when a choice requires re-encoding and how slow it is relative to a remux. |

### 4.4 Advanced options

| ID | Requirement | MVP |
|---|---|---|
| FR-16 | Thumbnail download (separate JPEG). | ✅ |
| FR-17 | Subtitles: pick languages; separate SRT/VTT files or embedded (MP4/MKV/WebM). Auto-generated captions are labelled as such. | ✅ |
| FR-18 | Metadata tags (title, artist/uploader, date, source URL comment). | ✅ |
| FR-19 | File naming template with live preview: `{title}`, `{uploader}`, `{platform}`, `{id}`, `{quality}`, `{date}`. | ✅ |
| FR-20 | Trim (start/end). Precise when re-encoding; otherwise starts at the nearest keyframe (stated in the UI). | ✅ |
| FR-21 | Basic compression (smaller H.264/VP9 re-encode). | ✅ |
| FR-22 | Playlist and batch downloads; ZIP bundle for multi-file jobs. | ✅ |
| FR-23 | Image galleries/carousels (gallery-dl adapter): preview grid, pick images, every image re-encoded without metadata, ZIP for several. | ✅ |
| FR-24 | Livestream recording (Streamlink adapter, where authorized). | Future |
| FR-25 | Aspect-ratio conversion (crop/pad to 9:16, 1:1, 16:9). | Future |
| FR-26 | Channel/account exports via official APIs. | Future |

### 4.5 Download manager

| ID | Requirement |
|---|---|
| FR-27 | Per item: status, phase, progress, bytes, speed, ETA (only when the engine reports it), file size, platform, chosen format. |
| FR-28 | Actions: pause/resume (while downloading), cancel, retry (retryable failures only), save file, preview (play in browser), delete from server. |
| FR-29 | Simultaneous submissions configurable (1–3); server-side concurrency is enforced independently. |
| FR-30 | Survives reloads: active jobs are re-attached from local storage. |
| FR-31 | Completion is announced (toast, `aria-live`, tab title badge). |

### 4.6 History, settings, platforms

| ID | Requirement |
|---|---|
| FR-32 | History: search, filter by platform and status, details sheet, re-download with the same options (if the policy still allows), delete one, clear all. |
| FR-33 | Settings: default mode, container, quality, audio format, bitrate, metadata; file naming; theme (system/light/dark); simultaneous downloads; auto-save; privacy (save history, save source links, delete from server after saving); storage info and "clear local data". |
| FR-34 | A searchable **Sites** page lists every registry entry with its logo, status in plain words, content types, reliability, live status and official routes. Home shows the best-known sites as a logo wall grouped by status (download directly, official download only, protected). |

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Initial JS ≤ 135 KB gzip (measured 130 KB — React DOM alone is ~60 KB; the first target of 120 KB was not achievable without dropping React); LCP ≤ 2.0 s on a mid-range phone over 4G; detection ≤ 1 ms; probe p50 ≤ 5 s for common platforms (source-dependent). See `PERFORMANCE.md`. |
| Server | Never buffer media in memory; RSS stays flat while serving multi-GB files; API p99 ≤ 50 ms for non-probe endpoints under load. |
| Accessibility | WCAG 2.2 AA: 24×24 px minimum targets (44×44 on touch layouts), visible focus, contrast ≥ 4.5:1, status messages via `aria-live`, full keyboard support, reduced-motion support. |
| Privacy | No third-party requests from the client (fonts and thumbnails served from our origin); no analytics. |
| Security | See `SECURITY-AUDIT.md`. |
| Reliability | Retryable failures retry at most 3 times on request; no silent failures; every error has a code and plain copy. |
| Copy | English only (decided 2026-11-24). All UI copy lives in one dictionary (`apps/web/src/lib/i18n/en.js`) so the same thing is always called the same. |
| Browsers | Last 2 versions of Chrome, Edge, Firefox, Safari; iOS Safari 16.4+; Samsung Internet. |

## 6. Error and edge states

| State | Code | User copy (EN) | Primary action |
|---|---|---|---|
| Invalid URL | `INVALID_URL` | "That doesn't look like a link. Links start with http:// or https://." | Edit |
| Unsupported platform | `UNSUPPORTED_PLATFORM` | "We can't read media from this site yet." | See supported platforms |
| Restricted content | `ATTESTATION_REQUIRED` | "This platform only allows downloads of content you own or have permission to save." | Confirm and continue |
| Protected platform | `PLATFORM_BLOCKED` | "This service protects its media, so Ferry can't download it. Use the official app's offline option." | Official route |
| Export only | `EXPORT_ONLY` | "Ferry can't download from here, but you can export your own content from the platform." | Official export |
| Authentication required | `AUTH_REQUIRED` | "This media requires signing in to the platform. Ferry never asks for your password, so it can't access it." | — |
| Private content | `PRIVATE_CONTENT` | "This media is private." | — |
| Source unavailable | `CONTENT_UNAVAILABLE` | "This media is no longer available. It may have been removed." | — |
| Extraction failure | `EXTRACTION_FAILED` | "We couldn't read this page. The site may have changed." | Retry |
| Conversion failure | `CONVERSION_FAILED` | "We downloaded the media but couldn't convert it. Try another format." | Retry / change format |
| Download interrupted | `DOWNLOAD_INTERRUPTED` | "The transfer stopped. You can resume or retry." | Retry |
| Network failure | `NETWORK_ERROR` | "We couldn't reach the source." | Retry |
| Expired download | `JOB_EXPIRED` | "This file was deleted from the server after {minutes} minutes. Download it again." | Re-download |
| Insufficient storage | `INSUFFICIENT_STORAGE` | "The server is out of space right now. Try again in a few minutes." | Retry later |
| File too large | `FILE_TOO_LARGE` | "This file is bigger than this server's {size} limit." | Lower quality / trim |
| Queue full | `QUEUE_FULL` | "Lots of downloads right now. Try again in a minute." | Retry after |
| Rate limit | `RATE_LIMITED` | "You're going a bit fast. Try again in {seconds} s." | Retry after |
| Live stream | `LIVE_NOT_SUPPORTED` | "This is a live stream. Try again after it ends." | — |
| Too long | `DURATION_LIMIT` | "This media is longer than this server's {duration} limit." | Trim |

## 7. Scope

### MVP (this release)

URL detection + registry (≥ 100 platforms) · policy engine with runtime
overrides · probe via yt-dlp and official APIs (Internet Archive, PeerTube) ·
direct media files · three modes · 5 video containers · 7 audio formats ·
quality ladder · thumbnails · subtitles · metadata · naming templates ·
trim · compression · playlists · batch · ZIP · download manager with
pause/resume/cancel/retry · history · settings · Sites page with logos and live status · English only ·
light/dark · PWA manifest + share target · security hardening · tests.

### Future

Streamlink livestream recording ·
aspect-ratio conversion · BullMQ/Redis + S3 scale-out drivers · MongoDB audit
& policy store · optional accounts with encrypted history sync · official API
exports (e.g. a user's own YouTube channel via OAuth + YouTube's download
features) · browser extension · native share extensions (iOS).

### Anti-goals

DRM removal; paywall, login or CAPTCHA bypass; browser impersonation;
collecting third-party passwords or cookies; ads, trackers, or dark patterns;
"1,000+ sites" marketing.

## 8. Success metrics

* Time from paste to download start (median) ≤ 8 s for common sources.
* Job success rate ≥ 95% for `allowed` platforms (excluding source-side errors).
* Zero fabricated progress/size values (enforced by design and tests).
* Lighthouse: Performance ≥ 95, Accessibility 100, Best Practices 100 (desktop).
* Support tickets mentioning "fake button", "ads", or "wrong quality": 0.
