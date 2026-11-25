# API Documentation — Ferry v1

Base path: `/api/v1` · Content type: `application/json` (UTF-8) · Version: `1.0`

The API is designed for the bundled web client but is a stable, documented
contract. It is **stateless across instances**: every request carries what it
needs (a probe id, or a job id + job token).

---

## 1. Conventions

### 1.1 Authentication model

There are no user accounts. Access is capability-based:

| Credential | Issued by | Grants | Transport |
|---|---|---|---|
| `probeId` | `POST /probe` | Creating jobs from that analysis for 15 minutes | JSON body |
| Job token (256-bit, base64url) | `POST /jobs` | Read, control, and download **that job only** | `Authorization: Bearer <token>`; `?token=` only on file URLs (browser-native downloads cannot send headers) |
| `ADMIN_TOKEN` | Operator (env var) | `/admin/*` | `Authorization: Bearer <token>` |

Tokens are stored server-side only as SHA-256 hashes and compared in constant
time. File responses send `Referrer-Policy: no-referrer`; access logs never
contain query strings.

### 1.2 Error envelope

Every non-2xx JSON response:

```json
{
  "error": {
    "code": "CONTENT_UNAVAILABLE",
    "message": "This media is no longer available. It may have been removed or made private.",
    "retryable": false,
    "requestId": "01JD7Z5Q2W4M8V3K9T6R0X1Y2Z",
    "details": {}
  }
}
```

`message` is safe, human-readable copy (also available to the client from
`@ferry/shared/errors.js` for localization). Raw engine output is never returned.

### 1.3 Error codes

| Code | HTTP | Retryable | Meaning |
|---|---|---|---|
| `INVALID_URL` | 400 | no | Not a valid `http(s)` URL, or contains credentials/forbidden port. |
| `VALIDATION_FAILED` | 400 | no | Request body failed schema validation (`details.issues`). |
| `UNSUPPORTED_PLATFORM` | 422 | no | No adapter can handle the URL. |
| `PLATFORM_BLOCKED` | 403 | no | Protected source (DRM, paywall, login). `details.routes` lists official options. |
| `EXPORT_ONLY` | 403 | no | Only the platform's official export is supported. `details.routes`. |
| `PLATFORM_DISABLED` | 403 | no | Disabled by the operator. `details.reason`. |
| `ATTESTATION_REQUIRED` | 403 | no | Job needs `attest: true` (only when the server sets `ASK_PERMISSION=true`). |
| `BLOCKED_DESTINATION` | 403 | no | URL resolves to a private/reserved network address. |
| `PRIVATE_CONTENT` | 422 | no | The media is private. |
| `AUTH_REQUIRED` | 422 | no | The source requires sign-in (Ferry never asks for third-party passwords). |
| `DRM_PROTECTED` | 422 | no | Only DRM-protected formats exist. |
| `GEO_RESTRICTED` | 422 | no | Not available from the server's region. |
| `LIVE_NOT_SUPPORTED` | 422 | no | Live stream in progress. |
| `DURATION_LIMIT` | 422 | no | Longer than `limits.maxDurationSec`. |
| `FILE_TOO_LARGE` | 413 | no | Exceeds `limits.maxFileSizeBytes`. |
| `FORMAT_UNAVAILABLE` | 422 | no | Requested quality/format is not offered by the source. |
| `CONTENT_UNAVAILABLE` | 404 | no | Removed, unlisted-and-gone, or 404 at the source. |
| `NO_MEDIA_FOUND` | 422 | no | The page has no video or audio Ferry can read. |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | no | A request body was not `application/json`. |
| `PAYLOAD_TOO_LARGE` | 413 | no | Request body over 64 KB. |
| `EXTRACTION_FAILED` | 502 | yes | The source changed or responded unexpectedly. |
| `SOURCE_RATE_LIMITED` | 503 | yes | The source is throttling this server. |
| `NETWORK_ERROR` | 502 | yes | Connection failed. |
| `DOWNLOAD_INTERRUPTED` | 502 | yes | Transfer stalled or dropped. |
| `CONVERSION_FAILED` | 500 | yes | FFmpeg failed. |
| `TIMEOUT` | 504 | yes | A stage exceeded its time limit. |
| `INSUFFICIENT_STORAGE` | 507 | yes | Server storage is full. |
| `QUEUE_FULL` | 503 | yes | Too many queued jobs (`Retry-After`). |
| `BUSY` | 503 | yes | Analysis capacity exhausted (`Retry-After`). |
| `RATE_LIMITED` | 429 | yes | Client rate limit (`Retry-After`). |
| `TOO_MANY_ACTIVE_JOBS` | 429 | yes | Per-client active job cap reached. |
| `PROBE_EXPIRED` | 410 | no | `probeId` expired; analyze again. |
| `JOB_NOT_FOUND` | 404 | no | Unknown job id. |
| `JOB_EXPIRED` | 410 | no | Files were deleted after the retention period. |
| `FORBIDDEN` | 403 | no | Missing or wrong job token. |
| `INVALID_STATE` | 409 | no | Action not allowed in the job's current state. |
| `CANCELLED` | 409 | no | Job was cancelled. |
| `NOT_FOUND` | 404 | no | Unknown route. |
| `INTERNAL_ERROR` | 500 | yes | Unexpected server error. |

### 1.4 Rate limiting headers

Responses include `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
(seconds). `429` and `503` responses include `Retry-After` (seconds).

| Bucket | Default |
|---|---|
| All API requests | 300 / minute / client |
| `POST /probe` | 30 / minute / client |
| `POST /jobs` | 20 / minute / client |
| Active (non-terminal) jobs | 4 / client |

A client is the source IP (IPv6 grouped by /64; `TRUST_PROXY` controls
`X-Forwarded-For` handling).

---

## 2. Service endpoints

### `GET /healthz`
Liveness. `200 {"status":"ok"}`.

### `GET /readyz`
Readiness. `200` when yt-dlp, ffmpeg, ffprobe are executable and free disk ≥
`MIN_FREE_DISK_MB`; otherwise `503`.

```json
{ "status": "ready", "checks": { "ytdlp": true, "ffmpeg": true, "ffprobe": true, "disk": true } }
```

### `GET /api/v1/config`
Public client configuration.

```json
{
  "app": { "name": "Ferry", "version": "1.0.0" },
  "limits": {
    "maxDurationSec": 10800, "maxFileSizeBytes": 2147483648,
    "maxBatchUrls": 20, "maxPlaylistItems": 50, "jobTtlMinutes": 60,
    "maxActiveJobsPerClient": 4, "maxGalleryItems": 100
  },
  "features": { "pauseResume": true, "playlists": true, "subtitles": true, "trim": true, "compress": true, "thumbnails": true, "extend": true, "galleries": true }
}
```

`features.galleries` is `true` when gallery-dl, FFmpeg and ffprobe were found at startup.

`testHosts` is added only when the test-only `SSRF_ALLOW_HOSTS` is set (refused in production).

### `GET /api/v1/status`
Public service health for the status display: engine availability, queue load,
and per-platform live status (aggregate counts only). The web app shows it as the
coloured dots on site logos.

```json
{
  "updatedAt": "2026-11-24T10:00:00.000Z",
  "engines": { "extraction": true, "conversion": true, "galleries": true },
  "queue": { "active": 1, "waiting": 0, "concurrency": 2 },
  "platforms": {
    "internet-archive": { "window": "1h", "attempts": 12, "successRate": 91.7, "status": "operational", "topErrors": [{ "code": "NETWORK_ERROR", "count": 1 }] }
  }
}
```

`window` is `1h` when the last 60 minutes hold at least 3 attempts, otherwise `24h`;
`attempts` and `successRate` describe that window, `topErrors` the last 24 hours.
`status` is `operational` (≥ 90 %), `degraded` (≥ 50 %), `failing`, or `unknown` (< 3 attempts).
Only source-side failures count against a platform; policy refusals and user limits do not.
Outcomes are kept in 5-minute buckets for 24 hours, in memory only.

---

## 3. Platforms

### `GET /api/v1/platforms`
The registry with **effective** policies (defaults + runtime overrides).
Supports `If-None-Match` (`304`).

```json
{
  "version": "W/\"p-5c1e\"",
  "platforms": [
    {
      "id": "youtube", "name": "YouTube", "kind": "video",
      "hosts": ["youtube.com", "youtu.be", "youtube-nocookie.com"],
      "paths": [], "patterns": [],
      "content": ["video", "audio", "live", "playlist", "subtitles"],
      "category": 4, "policy": "attestation", "overridden": false, "reason": null,
      "attestation": "YouTube's terms allow downloading only through YouTube's own features. Only download videos you uploaded, that carry a Creative Commons licence, or that the rights holder has allowed you to save.",
      "routes": [
        { "label": "Your own uploads: YouTube Studio > Content > Download", "url": "https://support.google.com/youtube/answer/56100?hl=en" },
        { "label": "All your uploads: Google Takeout (YouTube and YouTube Music)", "url": "https://takeout.google.com/" }
      ],
      "restrictions": "YouTube's terms and API policies forbid downloading outside YouTube's own features, and courts in the US and Germany have treated its signature cipher as copy protection, so Ferry never solves it and some formats may be missing.",
      "auth": "sometimes", "officialApi": "YouTube Data API v3 (metadata only)", "reliability": "experimental",
      "available": true, "lastChecked": "2026-11-24"
    },
    {
      "id": "vimeo", "name": "Vimeo", "kind": "video", "category": 4, "policy": "attestation",
      "attestation": "Vimeo lets owners enable downloads. Only download videos you own or that the owner has made available.",
      "…": "…"
    }
  ]
}
```

---

## 4. Analysis

### `POST /api/v1/probe`

Validates the URL, applies the policy, and extracts metadata. No media bytes
are downloaded.

Request:

```json
{ "url": "https://archive.org/details/night_of_the_living_dead", "playlist": false }
```

| Field | Type | Notes |
|---|---|---|
| `url` | string ≤ 2048 | `http`/`https` only. Tracking parameters are stripped. |
| `playlist` | boolean | When the URL points to a playlist/album/channel tab, list its entries (≤ `maxPlaylistItems`) instead of resolving one item. |

Response `200`:

```json
{
  "probe": { "id": "p_8Q2v…", "expiresAt": "2026-11-24T10:15:00.000Z" },
  "source": {
    "url": "https://archive.org/details/night_of_the_living_dead",
    "platform": { "id": "internet-archive", "name": "Internet Archive", "kind": "open-library" },
    "policy": { "status": "allowed", "category": 1, "attestation": null, "confirm": false, "routes": [] }
  },
  "media": {
    "kind": "video",
    "title": "Night of the Living Dead",
    "uploader": null,
    "durationSec": 5737,
    "uploadDate": "1968-10-01",
    "thumbnailUrl": "/api/v1/thumb?u=…&e=…&s=…",
    "license": "Public Domain",
    "isLive": false,
    "video": {
      "qualities": [
        { "res": 480, "label": "480p", "fps": 30, "hdr": false, "codecs": ["h264"], "sizeBytes": 1047552000, "sizeApprox": false }
      ]
    },
    "audio": {
      "tracks": [{ "id": "a0", "codec": "aac", "abrKbps": 128, "language": null }],
      "best": { "codec": "aac", "abrKbps": 128 }
    },
    "subtitles": [],
    "capabilities": {
      "modes": ["av", "video", "audio"],
      "containers": ["mp4", "webm", "mkv", "mov", "avi"],
      "audioFormats": ["mp3", "m4a", "aac", "wav", "flac", "opus", "ogg"],
      "trim": true
    },
    "entries": null
  }
}
```

**Image galleries.** For platforms whose engine is gallery-dl (Imgur, Flickr,
Mastodon, …) `media.kind` is `"gallery"`, `capabilities.modes` is
`["gallery"]`, and the images are listed in `media.gallery` (source URLs never
leave the server; previews go through the signed thumbnail proxy):

```json
"gallery": {
  "items": [
    { "index": 1, "ext": "jpg", "width": 800, "height": 400, "sizeBytes": null, "previewUrl": "/api/v1/thumb?u=…&e=…&s=…" },
    { "index": 3, "ext": "gif", "width": 320, "height": 240, "sizeBytes": 35787, "previewUrl": "/api/v1/thumb?u=…&e=…&s=…" }
  ],
  "truncated": false,
  "skipped": { "videos": 1, "other": 0, "links": 0 }
}
```

`index` is the file's position in the post (gaps are videos or other files
that are not offered). `truncated` means the post has more than
`limits.maxGalleryItems` files. `skipped` counts videos, non-image files and
links to other pages that are left out.

Errors: `INVALID_URL`, `BLOCKED_DESTINATION`, `UNSUPPORTED_PLATFORM`,
`PLATFORM_BLOCKED`, `EXPORT_ONLY`, `PLATFORM_DISABLED`, `PRIVATE_CONTENT`,
`AUTH_REQUIRED`, `DRM_PROTECTED`, `GEO_RESTRICTED`, `LIVE_NOT_SUPPORTED`,
`DURATION_LIMIT`, `CONTENT_UNAVAILABLE`, `EXTRACTION_FAILED`,
`SOURCE_RATE_LIMITED`, `NETWORK_ERROR`, `TIMEOUT`, `BUSY`, `RATE_LIMITED`.

---

## 5. Jobs

### 5.1 The `Job` object

```json
{
  "id": "0f8f6b8e-0d6e-4c0e-9a52-0d1f0f6f9a11",
  "status": "downloading",
  "createdAt": "2026-11-24T10:00:00.000Z",
  "updatedAt": "2026-11-24T10:00:12.000Z",
  "expiresAt": null,
  "attempt": 1,
  "maxAttempts": 3,
  "source": {
    "platformId": "internet-archive", "platformName": "Internet Archive",
    "title": "Night of the Living Dead", "uploader": null, "durationSec": 5737,
    "thumbnailUrl": "/api/v1/thumb?u=…"
  },
  "request": {
    "mode": "audio",
    "audio": { "format": "mp3", "bitrate": 192 },
    "extras": { "metadata": true },
    "filename": { "template": "{title}" }
  },
  "progress": {
    "phase": "downloading",
    "percent": 41.7,
    "downloadedBytes": 43712512,
    "totalBytes": 104857600,
    "totalIsEstimate": false,
    "speedBps": 5242880,
    "etaSec": 12,
    "queuePosition": null
  },
  "output": null,
  "error": null,
  "actions": { "pause": true, "resume": false, "cancel": true, "retry": false, "delete": true }
}
```

`status` ∈ `queued | downloading | paused | processing | ready | failed | cancelled | expired`.
`progress.percent` is `null` whenever the true value is unknown — clients must
render an indeterminate state rather than invent progress.

When `status = ready`:

```json
"output": {
  "files": [
    {
      "id": "f0", "kind": "media", "name": "Night of the Living Dead.mp3",
      "sizeBytes": 137689344, "mime": "audio/mpeg", "container": "mp3",
      "vcodec": null, "acodec": "mp3", "width": null, "height": null,
      "durationSec": 5737, "bitrateKbps": 192,
      "url": "/api/v1/jobs/0f8f…/files/f0"
    }
  ],
  "archiveUrl": null
}
```

### 5.2 `POST /api/v1/jobs`

Request:

```json
{
  "probeId": "p_8Q2v…",
  "entryId": null,
  "mode": "av",
  "video": { "container": "mp4", "quality": 1080, "compress": false },
  "audio": { "format": "m4a", "bitrate": "source" },
  "extras": {
    "subtitles": ["en"], "embedSubtitles": false,
    "thumbnail": false, "metadata": true,
    "trim": { "start": 30, "end": 95.5 }
  },
  "filename": { "template": "{title} [{quality}]" },
  "attest": true
}
```

| Field | Values | Rules |
|---|---|---|
| `mode` | `av` · `video` · `audio` · `gallery` | `av` = video with sound; `video` = video without sound; `audio` = audio only; `gallery` = chosen images of a gallery probe. |
| `gallery.items` | 1–500 indexes from `media.gallery.items[].index` | Required for (and only allowed with) `gallery`. Each image is re-encoded by FFmpeg without metadata (JPEG→JPEG, PNG→PNG, GIF→GIF, lossy WebP/AVIF→JPEG, alpha→PNG, other animations→GIF) and named `<template> - 01.jpg`…; `video`/`audio`/`extras` do not apply. |
| `video.container` | `mp4` · `webm` · `mkv` · `mov` · `avi` | Required for `av`/`video`. |
| `video.quality` | `"best"` or a resolution present in `media.video.qualities[].res` | Upscaling is rejected (`FORMAT_UNAVAILABLE`). |
| `video.compress` | boolean | Re-encode for a smaller file (H.264 CRF 28 / VP9 CRF 36). |
| `audio.format` | `mp3` · `m4a` · `aac` · `wav` · `flac` · `opus` · `ogg` | Required for `audio`. In `av` mode, an optional audio-codec preference. |
| `audio.bitrate` | `"source"` or `64` · `96` · `128` · `192` · `256` · `320` | Ignored for `wav`/`flac`. |
| `extras.subtitles` | language codes from `media.subtitles` | Delivered as separate files, or embedded when `embedSubtitles` and the container supports it. |
| `extras.thumbnail` | boolean | Adds the thumbnail as a separate JPEG file. |
| `extras.metadata` | boolean | Writes title/artist/date tags. |
| `extras.trim` | `{ start?, end? }` seconds | `0 ≤ start < end ≤ durationSec`. |
| `filename.template` | ≤ 120 chars | Tokens: `{title}` `{uploader}` `{platform}` `{id}` `{quality}` `{date}`. Sanitized server-side. |
| `privacy.deleteAfterDownload` | boolean | Delete the job's files two minutes after the main file has been delivered in full (galleries: the ZIP, or the only image). |
| `attest` | boolean | Required `true` when the probe returned `policy.confirm: true`: the status is `attestation` and the server sets `ASK_PERMISSION=true`. Off by default, so the field is ignored. |
| `entryId` | string | Selects one entry of a playlist probe. |

Response `202`: `{ "job": Job, "token": "kX3…" }` — the token is returned
**once**; store it client-side.

Errors: `VALIDATION_FAILED`, `PROBE_EXPIRED`, `ATTESTATION_REQUIRED`,
`FORMAT_UNAVAILABLE`, `PLATFORM_*`, `QUEUE_FULL`, `TOO_MANY_ACTIVE_JOBS`,
`RATE_LIMITED`.

### 5.3 `POST /api/v1/jobs/status`

Batched polling for the download manager.

```json
{ "jobs": [ { "id": "0f8f…", "token": "kX3…" }, { "id": "9a1b…", "token": "Qw7…" } ] }
```

Response `200`:

```json
{ "jobs": [ { "id": "0f8f…", "job": { … } }, { "id": "9a1b…", "error": { "code": "JOB_EXPIRED", … } } ] }
```

At most 50 jobs per request.

### 5.4 Single-job endpoints

All require `Authorization: Bearer <job token>`.

| Method & path | Effect | Allowed from |
|---|---|---|
| `GET /api/v1/jobs/:id` | Read the job | any |
| `POST /api/v1/jobs/:id/cancel` | Stop and discard | `queued`, `downloading`, `paused`, `processing` |
| `POST /api/v1/jobs/:id/pause` | Stop the transfer, keep partial data | `downloading` |
| `POST /api/v1/jobs/:id/resume` | Re-queue; continues from partial data | `paused` |
| `POST /api/v1/jobs/:id/retry` | Re-queue a failed job (attempt + 1) | `failed` with `retryable` and `attempt < maxAttempts` |
| `POST /api/v1/jobs/:id/extend` | "Keep longer": push `expiresAt` to now + `JOB_TTL_MINUTES`, capped at `JOB_MAX_RETENTION_MINUTES` after completion (WCAG 2.2.1) | `ready` |
| `DELETE /api/v1/jobs/:id` | Delete files now | any (idempotent) |

Illegal transitions return `409 INVALID_STATE`.

### 5.5 File delivery

`GET /api/v1/jobs/:id/files/:fileId?token=…[&disposition=inline]`

* `200`/`206` with `Accept-Ranges: bytes`, `ETag`, `Last-Modified` — resumable.
* `Content-Disposition: attachment; filename="ascii-fallback.mp4"; filename*=UTF-8''…`
  (`inline` only for media preview; still sandboxed).
* `Content-Type` is the server-determined MIME of the produced container.
* `X-Content-Type-Options: nosniff`,
  `Content-Security-Policy: default-src 'none'; sandbox`,
  `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`.

`GET /api/v1/jobs/:id/archive?token=…` — a streamed ZIP (stored, no
recompression) of every file of the job; available when the job has more than
one file. A gallery's ZIP is named after the filename template (`<template>.zip`).
Gallery jobs whose images were not all usable carry the note `gallery-partial`
in `output.notes`.

### 5.6 Thumbnail proxy

`GET /api/v1/thumb?u=<base64url url>&e=<unix expiry>&s=<HMAC>`

Only URLs signed by the server (from a probe) are proxied — it is not an open
proxy. Responses are size-limited (2 MB), verified by magic bytes
(JPEG/PNG/WebP/GIF/AVIF), and cached privately for 1 hour. Keeps the client's
IP away from third-party CDNs and lets the CSP stay `img-src 'self'`.

---

## 6. Admin endpoints

Enabled only when `ADMIN_TOKEN` is set; otherwise they return `404`.
`Authorization: Bearer <ADMIN_TOKEN>` is required.

### `GET /api/v1/admin/policies`
Registry defaults, overrides, and effective values.

### `PUT /api/v1/admin/policies/:platformId`

```json
{ "policy": "disabled", "reason": "Temporarily unavailable while the provider is fixed." }
```

`policy` ∈ `allowed | attestation | export_only | blocked | disabled`.
`platformId` may be `*` (global kill switch). Takes effect immediately; written
atomically to `DATA_DIR/policy-overrides.json` and audit-logged.

### `DELETE /api/v1/admin/policies/:platformId`
Removes an override (reverts to the registry default).

### `GET /api/v1/admin/status`
Engine versions, queue depth, jobs by status, disk usage, uptime.

### `GET /api/v1/admin/metrics`
Prometheus text exposition (`ferry_jobs_total{status}`, `ferry_queue_depth`,
`ferry_active_jobs`, `ferry_bytes_served_total`, `ferry_probe_duration_seconds`,
`ferry_failures_total{platform,code}`).

---

## 7. Example flow

```bash
# 1. Analyze
curl -s localhost:8787/api/v1/probe -H 'content-type: application/json' \
  -d '{"url":"https://archive.org/details/night_of_the_living_dead"}'

# 2. Create a job (audio only, MP3 192 kbps)
curl -s localhost:8787/api/v1/jobs -H 'content-type: application/json' \
  -d '{"probeId":"p_…","mode":"audio","audio":{"format":"mp3","bitrate":192}}'

# 3. Poll
curl -s localhost:8787/api/v1/jobs/<id> -H "authorization: Bearer <token>"

# 4. Download (resumable)
curl -OJ "localhost:8787/api/v1/jobs/<id>/files/f0?token=<token>"
```
