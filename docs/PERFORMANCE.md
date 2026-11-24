# Performance — Ferry

Measured 2026-11-24 with `node scripts/perf.mjs` (real server, real yt-dlp/FFmpeg,
self-authored fixtures on a loopback server). Machine: Intel(R) Core(TM) i7-7567U CPU @ 3.50GHz (4 threads), 7.9 GB RAM, win32 10.0.19045, Node v24.18.0.
Numbers are for this development machine; source-site latency dominates analysis time in production.

| Area | Measurement | Result |
|---|---|---|
| API latency | GET /api/v1/config | p50 0.4 ms, p95 0.9 ms, p99 6.9 ms |
| API latency | GET /api/v1/platforms (251 entries) | p50 1.3 ms, p95 4.8 ms, p99 9.0 ms |
| API latency | POST /api/v1/jobs/status (10 jobs) | p50 0.7 ms, p95 1.3 ms, p99 7.7 ms |
| Analysis (probe) latency | Direct file (ranged read + ffprobe) | median 119.6 ms over 5 runs |
| Analysis (probe) latency | Embedded page via yt-dlp generic | median 3466.3 ms over 3 runs |
| Analysis (probe) latency | HLS manifest via yt-dlp | median 2115.6 ms over 3 runs |
| Worker throughput | 8 × (6 s clip → MP3 128 kbps), 2 workers | 1.6 s total, 301 jobs/min |
| Conversion cost (3 s of 1080p) | Remux 1080p H.264 → MP4 (copy) | 149.0 ms |
| Conversion cost (3 s of 1080p) | Re-encode 1080p H.264 → WebM (VP9 + Opus) | 1805.3 ms |
| Conversion cost (3 s of 1080p) | Re-encode 1080p → MP4 720p (downscale) | 1153.5 ms |
| Delivery (512 MB file, loopback) | Server RSS before → peak while streaming | 85 MB → 111 MB (Δ 26 MB, incl. this test's own reader); 203 MB/s |
| Client bundle | Initial JavaScript (gzip, static import graph) | 129.9 KB in 11 files; CSS 9.9 KB |

## Budgets

| Budget | Target | Status |
|---|---|---|
| Initial JS (gzip) | ≤ 135 KB | see "Client bundle" above |
| Non-probe API p99 | ≤ 50 ms | see "API latency" |
| Detection per keystroke | ≤ 1 ms | verified by `packages/shared/test/catalog.test.js` |
| Memory while delivering large files | flat (no buffering) | see "Delivery" |

## How the design keeps it fast

* Detection runs locally against the cached registry — no request per keystroke.
* The analysis workspace and secondary screens are code-split and prefetched as soon as a link is typed.
* Media never passes through Node's heap: engines write to disk, delivery streams with Range support.
* Stream copy is the default; re-encoding happens only for incompatible streams (compare the conversion rows).
* Engines run at below-normal priority with an FFmpeg thread cap, so the API stays responsive under load.
