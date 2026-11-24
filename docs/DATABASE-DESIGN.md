# Database & Data Design — Ferry

Ferry is **privacy-first**: the server keeps only what it needs to finish a
job, and only for as long as it needs it. Browsing history, settings and
download history live on the user's device.

---

## 1. Data inventory and retention

| Data | Where | Retention | Contains personal data? |
|---|---|---|---|
| Job (state, progress, output metadata) | Server memory (`JobStore`) | Until `expiresAt` (default 60 min after completion; 24 h hard cap for failed/cancelled) | Indirectly: a salted HMAC of the client IP for fairness limits. No raw IP. |
| Source URL of a job | Server memory, inside the job | Same as the job | Possibly (URLs can identify accounts). Never logged in full. |
| Job token | Server memory, **SHA-256 hash only** | Same as the job | No |
| Probe cache entry | Server memory (LRU, ≤ 500 entries) | 15 min | Same as source URL |
| Media files | `DATA_DIR/jobs/<uuid>/` | Same as the job; deleted immediately on `DELETE` | Content only |
| Rate-limit buckets | Server memory | Sliding window (≤ 1 min idle) | HMAC of client IP |
| Policy overrides | `DATA_DIR/policy-overrides.json` | Until changed | No |
| Logs | stdout (collected by the operator) | Operator policy (recommend ≤ 14 days) | Request id, route, status, platform id, URL hash. No IPs unless `LOG_CLIENT_IP=true`. |
| Settings | Browser `localStorage` (`ferry:settings:v1`) | Until the user clears it | No |
| Download history | Browser `localStorage` (`ferry:history:v1`) | Until the user deletes it; opt-out available | Titles and (optionally) source links |
| Active job tokens | Browser `localStorage` (`ferry:downloads:v1`) | Removed when the job expires | No |

---

## 2. Server-side entities (MVP drivers)

### 2.1 `Job`

```ts
type JobStatus = 'queued' | 'downloading' | 'paused' | 'processing'
               | 'ready' | 'failed' | 'cancelled' | 'expired';

interface Job {
  id: string;                    // UUID v4 (122 random bits) — also the directory name
  tokenHash: string;             // hex SHA-256 of the access token
  clientKey: string;             // HMAC-SHA256(secret, ip or ipv6/64), first 16 bytes hex
  status: JobStatus;
  createdAt: number; updatedAt: number;            // epoch ms
  startedAt?: number; finishedAt?: number; expiresAt?: number;
  attempt: number;               // 1..maxAttempts
  maxAttempts: number;           // 3
  priority: number;              // lower runs first (default 10)
  source: {
    url: string;                 // normalized URL (never returned by list endpoints)
    urlHash: string;             // for logs/metrics
    platformId: string;
    policyStatus: 'allowed' | 'attestation';
    attested: boolean;
    title?: string; uploader?: string; durationSec?: number;
    thumbnailUrl?: string;       // signed proxy URL
    entryId?: string;            // playlist entry
  };
  request: {
    mode: 'av' | 'video' | 'audio';
    video?: { container: 'mp4'|'webm'|'mkv'|'mov'|'avi'; quality: 'best'|number; compress?: boolean };
    audio?: { format: 'mp3'|'m4a'|'aac'|'wav'|'flac'|'opus'|'ogg'; bitrate: 'source'|number };
    extras: { subtitles: string[]; embedSubtitles: boolean; thumbnail: boolean; metadata: boolean;
              trim?: { start?: number; end?: number } };
    filename: { template: string };
  };
  plan?: object;                 // internal: yt-dlp selector/sort + finalize plan (never exposed)
  progress: {
    phase: 'queued'|'downloading'|'processing'|'finalizing'|null;
    percent: number | null;
    downloadedBytes: number | null; totalBytes: number | null; totalIsEstimate: boolean;
    speedBps: number | null; etaSec: number | null; queuePosition: number | null;
  };
  output?: { files: OutputFile[] };
  error?: { code: string; message: string; retryable: boolean; internal?: string };
}

interface OutputFile {
  id: string;                    // f0, f1 … (server-generated)
  kind: 'media' | 'subtitle' | 'thumbnail';
  diskName: string;              // file name inside the job directory (server-generated)
  name: string;                  // sanitized download name (Content-Disposition only)
  sizeBytes: number; mime: string; container: string;
  vcodec?: string | null; acodec?: string | null;
  width?: number | null; height?: number | null;
  durationSec?: number | null; bitrateKbps?: number | null;
}
```

**Invariants** (enforced by `JobStore.update`):
* `status` changes only through `@ferry/shared/jobs.js#canTransition`.
* `expiresAt` is set when entering a terminal state.
* `output` is set only in `ready`; `error` only in `failed`.

**Indexes** (memory driver): primary `Map<id, Job>`; secondary
`Map<clientKey, Set<id>>` for active-job counting; expiry scan every 60 s.

### 2.2 `Probe` (cache)

```ts
interface Probe {
  id: string;                    // 'p_' + 128-bit random, base64url
  clientKey: string;             // probes are only usable by the client that created them
  urlHash: string;
  normalizedUrl: string;
  platformId: string;
  policy: { status: string; category: number };
  media: MediaInfo;              // public, normalized
  raw: { formats: Format[]; subtitles: object; durationSec?: number }; // trimmed, never exposed
  createdAt: number; expiresAt: number;
}
```

LRU with a 500-entry cap; the raw yt-dlp JSON is trimmed to formats and
subtitles to bound memory (≈ 20–60 KB per entry).

### 2.3 `PolicyOverride` (file driver)

`DATA_DIR/policy-overrides.json`:

```json
{
  "version": 1,
  "overrides": {
    "example-platform": {
      "policy": "disabled",
      "reason": "Temporarily unavailable.",
      "updatedAt": "2026-11-24T10:00:00.000Z",
      "updatedBy": "admin"
    }
  }
}
```

Written with write-to-temp + `rename` (atomic on the same volume); re-read when
the file's mtime changes, so manual edits also apply without a restart. A
malformed file is rejected (previous overrides stay active) and the error is
logged.

### 2.4 `RateBucket`

`Map<string, { tokens: number; updatedAt: number }>` keyed by
`<bucket>:<clientKey>`; token-bucket refill; idle entries evicted every minute.

---

## 3. Client-side storage schemas

All keys are versioned; on version mismatch the store migrates or resets.
Every access is wrapped in `try/catch` so private-mode/blocked storage
degrades to in-memory behaviour.

```ts
// ferry:settings:v1
interface Settings {
  theme: 'system' | 'light' | 'dark';
  defaults: {
    mode: 'av' | 'video' | 'audio';
    videoContainer: 'mp4' | 'webm' | 'mkv' | 'mov' | 'avi';
    quality: 'best' | number;
    audioFormat: 'mp3' | 'm4a' | 'aac' | 'wav' | 'flac' | 'opus' | 'ogg';
    audioBitrate: 'source' | number;
    metadata: boolean;
  };
  filenameTemplate: string;          // default '{title}'
  concurrency: 1 | 2 | 3;            // simultaneous submissions from this device
  autoSave: boolean;                 // start the browser download when ready
  privacy: { saveHistory: boolean; saveSourceLinks: boolean; deleteAfterSave: boolean };
  acknowledgedGenericTerms: boolean; // one-time notice for sites without a known policy
}

// ferry:history:v1  (newest first, capped at 500)
interface HistoryEntry {
  id: string;                        // job id
  createdAt: number; completedAt?: number;
  status: 'ready' | 'failed' | 'cancelled' | 'expired' | 'saved';
  platformId: string; platformName: string;
  title: string; uploader?: string; durationSec?: number;
  sourceUrl?: string;                // only when privacy.saveSourceLinks
  request: Job['request'];           // to re-download with the same options
  output?: { name: string; sizeBytes: number; mime: string }[];
  errorCode?: string;
}

// ferry:downloads:v1
interface TrackedJob { id: string; token: string; addedAt: number; batchId?: string }
```

---

## 4. Scale-out schemas (designed, not implemented)

### 4.1 Redis (BullMQ + shared state)

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `bull:ferry-jobs:*` | BullMQ | job retention | Queue (priority, attempts, backoff). |
| `ferry:job:<id>` | Hash (JSON fields) | `expiresAt` | Job document shared by API and workers. |
| `ferry:client:<clientKey>:active` | Set | 24 h | Active job ids for fairness limits. |
| `ferry:probe:<id>` | String (JSON, gzip) | 15 min | Probe cache shared by API nodes. |
| `ferry:rl:<bucket>:<clientKey>` | String counter | window | Fixed-window rate limits (`INCR` + `PEXPIRE`). |
| `ferry:events` | Pub/Sub | — | Cancel/pause signals to the worker that owns a job. |

### 4.2 MongoDB

```js
// policy_overrides
{ _id: 'vimeo', policy: 'disabled', reason: String, updatedAt: Date, updatedBy: String }

// audit_events  — TTL 90 days, no URLs, no IPs
{ _id: ObjectId, at: Date, type: 'job.ready'|'job.failed'|'policy.changed'|…,
  platformId: String, mode: String, code: String, bytes: Number, durationMs: Number }
// indexes: { at: 1 } expireAfterSeconds: 7776000 ; { platformId: 1, at: -1 }

// platform_health_daily — powers the "reliability" column
{ _id: { platformId: 'vimeo', day: '2026-11-24' }, ok: Number, failed: Number,
  byCode: { EXTRACTION_FAILED: Number, … } }

// (future, opt-in) users, presets, synced_history — only if accounts are introduced
```

---

## 5. Why not MongoDB in the MVP?

The MVP has no durable server-side data: jobs are ephemeral, history is
on-device, and policy overrides are a small file. Adding MongoDB now would add
an operational dependency without a feature that needs it. The `PolicyStore`
and `JobStore` interfaces are where a MongoDB/Redis driver plugs in when
multi-node deployment, audit retention, or accounts are introduced.
