# Security Audit — Ferry

* **Scope:** `apps/server` (API, worker, engines), `apps/web` (SPA, service
  worker), `packages/shared`, deployment files.
* **Method:** design-time threat model (STRIDE per trust boundary) →
  controls → automated attack tests (`apps/server/test/security/*.test.js`) →
  dependency audit → residual-risk review.
* **Evidence:** section 7 records the results of the test runs.

---

## 1. Assets

| Asset | Why it matters |
|---|---|
| The server's network position | A downloader fetches attacker-chosen URLs: the classic SSRF pivot into internal services and cloud metadata (`169.254.169.254`). |
| Host resources (CPU, disk, bandwidth, process table) | Media processing is expensive; abuse makes the service unusable or costly. |
| Other users' outputs | Files must be readable only by the job owner. |
| User privacy | Pasted URLs, IP addresses, download history. |
| Secrets | `SIGNING_SECRET` (HMAC for thumbnails/client keys), `ADMIN_TOKEN`. |
| Policy integrity | The policy registry is the compliance control; tampering would enable restricted sources. |

## 2. Trust boundaries

```
[Browser] ──(1) HTTPS──▶ [API process] ──(2) spawn──▶ [yt-dlp / ffmpeg]
                              │                              │
                              │(4) fs                         │(3) all traffic via egress guard
                              ▼                              ▼
                        [DATA_DIR/jobs]               [Public internet]
```

1. Untrusted client input (URLs, selections, filenames, tokens).
2. Child processes that parse untrusted remote content (yt-dlp extractors, FFmpeg demuxers).
3. Outbound network — must never reach non-public addresses.
4. Filesystem — engines write only inside their job directory.

---

## 3. Threats and controls

| # | Threat | Control(s) | Test |
|---|---|---|---|
| T1 | **SSRF via submitted URL** (`http://127.0.0.1:6379`, `http://169.254.169.254/latest/meta-data`) | URL guard: `http/https` only, no userinfo, port allowlist (80, 443, 8080, 8443). **Egress guard proxy** resolves the host and rejects any address whose range is not public unicast before connecting. | `server/test/security/egress.test.js`, `integration/api.test.js` |
| T2 | **Alternative IP encodings** (`127.1`, `0x7f.0.0.1`, `2130706433`, `[::ffff:127.0.0.1]`, `[::1]`, `0.0.0.0`) | WHATWG URL normalization (canonical dotted IPv4); `ipaddr.js` classification; IPv4-mapped IPv6 unwrapped; NAT64/6to4/Teredo (embedded IPv4) rejected. | `security/ip.test.js`, `shared/test/url.test.js` |
| T3 | **DNS rebinding** (public at check time, private at fetch time) | The proxy performs the only resolution and connects to the validated, pinned IP. API-side fetches use a custom `lookup` that validates every connection. | `security/egress.test.js` (rebinding + mixed-answer resolvers, pinned-IP check) |
| T4 | **Malicious redirects** (public → private) | Each hop is a new proxied connection → re-validated. Guarded fetch follows ≤ 5 redirects manually, re-validating each. | `security/egress.test.js`; `integration/api.test.js` (redirect inside yt-dlp) |
| T5 | **Non-HTTP protocols** (rtmp, ftp, file, gopher via engines) | URL guard rejects them; planner keeps only formats whose protocol is `http(s)`, `m3u8(_native)`, `http_dash_segments`; yt-dlp uses the native downloader; FFmpeg runs with `-protocol_whitelist file,pipe`. | `unit/ytdlp-args.test.js`, `unit/normalize.test.js` |
| T6 | **Command / shell injection** | `spawn(file, argv, { shell: false })` everywhere; no string commands. URL passed after `--`. All other argv values come from enums or server-generated paths. Windows: `.bat/.cmd` launchers refused; engines resolved to `.exe`. | `unit/process.test.js`, `unit/ytdlp-args.test.js` |
| T7 | **Option injection into yt-dlp** (`--exec`, `-o`, `--config-location` smuggled in a URL) | `--` terminator; URL must parse as `http(s)`; `--ignore-config`, `--no-plugin-dirs`; no `--exec`, no `--cookies*`, no `--load-info-json` from users. | `unit/ytdlp-args.test.js` |
| T8 | **Path traversal** (`/jobs/../../etc/passwd/files/f0`, `fileId=../x`) | Job ids must match UUID v4; file ids `^f\d{1,3}$`; resolved paths must stay inside the job directory; disk names are server-generated. | `integration/api.test.js` |
| T9 | **Unsafe download names** (`CON.mp4`, `a/../../b`, RTLO `‮` spoofing, CRLF header injection) | `sanitizeFilename`: strips control, bidi-override and zero-width characters, path separators and reserved characters; avoids Windows device names; trims dots/spaces; length-limits at a grapheme boundary; forces the server-chosen extension. `Content-Disposition` built with ASCII fallback + RFC 5987 `filename*`. | `shared/test/filename.test.js`, `integration/api.test.js` |
| T10 | **MIME spoofing / malicious file delivery** (HTML or executable disguised as media) | Output is **always written by FFmpeg** (remux or transcode), never raw source bytes; ffprobe verifies the output has the expected streams; MIME from our container table; `nosniff`; `Content-Security-Policy: default-src 'none'; sandbox`; `attachment` by default. Thumbnails re-encoded to JPEG. | `integration/finalize.test.js` (HTML disguised as .mp4) |
| T11 | **Excessive sizes / durations** | Probe rejects `duration > MAX_DURATION_SECONDS` and known sizes > `MAX_FILESIZE`; yt-dlp `--max-filesize`; directory-size watchdog during download; stdout capped (probe JSON ≤ 32 MB). | `security/egress.test.js` (byte cap), `integration/api.test.js` |
| T12 | **Resource exhaustion** (CPU, memory, processes, disk) | Global concurrency, probe semaphore, per-stage timeouts, stall watchdog, below-normal priority, FFmpeg `-threads`, disk guard, storage cap, TTL cleanup; container CPU/memory/pids limits in deployment. | `unit/process.test.js`, `integration/api.test.js` |
| T13 | **Queue abuse / DoS** | Per-client token buckets (IPv6 /64 aggregation), per-client active-job cap, global queue cap (`503` + `Retry-After`), jobs require a probe owned by the same client, JSON body limit 64 KB, server header/request timeouts. | `integration/api.test.js` |
| T14 | **Unauthorized job/file access** | 122-bit random job ids + 256-bit job tokens; tokens stored as SHA-256; constant-time comparison; tokens never logged; `Referrer-Policy: no-referrer`. | `integration/api.test.js` |
| T15 | **Temporary file exposure** | `DATA_DIR` outside any static root; directories `0700`; no listing route; deletion on expiry, on `DELETE`, and at start-up. | `integration/api.test.js` (expiry sweep, delete) |
| T16 | **CSRF** (a third-party page making a visitor's browser create jobs) | No cookies or ambient credentials; mutating endpoints require `Content-Type: application/json` (forces a CORS preflight); CORS disabled unless `CORS_ORIGINS` is set. | `integration/api.test.js` |
| T17 | **XSS via source metadata** (titles/uploaders are attacker-controlled) | React text rendering only (no `dangerouslySetInnerHTML`); strict CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`); thumbnails served from our origin. | `integration/api.test.js` |
| T18 | **Admin API abuse** | Disabled unless `ADMIN_TOKEN` is set; ≥ 32 chars required in production; constant-time compare; changes audit-logged; separate rate bucket. | `integration/api.test.js` |
| T19 | **Sensitive data in logs** | pino redaction for `authorization`, `token`, query strings; URLs logged as platform + salted hash; client IPs not logged by default; engine stderr only at `debug`. | `unit/policy-logging.test.js` |
| T20 | **Secrets leakage to child processes** | Children get a minimal allowlisted environment (`PATH`, `SYSTEMROOT`, temp dirs, locale, proxy vars) — never `SIGNING_SECRET` or `ADMIN_TOKEN`. | `unit/process.test.js` |
| T21 | **Hostile media exploiting FFmpeg/yt-dlp parsers** | Separate processes, low priority, timeouts, per-job working directory, unprivileged container user, read-only root FS, `no-new-privileges`, pinned and regularly updated engines. | Deployment review |
| T22 | **Platform spoofing** (`youtube.com.evil.example`, IDN homographs) | Suffix matching on label boundaries only; hostnames are punycode-normalized by the URL parser, so homographs never match a registry host. | `shared/test/url.test.js`, `shared/test/catalog.test.js` |
| T23 | **ReDoS** in URL patterns | Patterns are anchored and linear; inputs length-capped at 2 048; tested with adversarial long inputs. | `shared/test/url.test.js`, `shared/test/catalog.test.js` |
| T24 | **Policy bypass** (attestation skipped, blocked platform via redirect/shortener) | Policy checked at probe **and** at job creation; job creation requires `attest` when needed; the extractor-reported final domain is re-checked against the registry after probing (catches shorteners/embeds that resolve to a blocked platform). | `unit/policy-logging.test.js`, `integration/api.test.js`, `shared/test/catalog.test.js` |
| T25 | **Engine supply chain** | yt-dlp and gallery-dl pinned in the image (gallery-dl in its own venv, without yt-dlp); Docker build installs from PyPI over TLS; no runtime remote code (`--remote-components` unused, bundled `yt-dlp-ejs`); no `curl_cffi`/impersonation; gallery-dl's browser imitation off. | Deployment review |
| T26 | **Gallery engine reaching what Ferry would refuse** (gallery-dl following an embed into YouTube via `ytdl:`, crawling links to other sites, loading config/cookies) | Image items only (`http(s)` + image extension); `ytdl:`/`text:`/video items counted, never offered; download mode uses `--child-filter False` and `-o downloader.ytdl.enabled=false`; child links followed once, only when the registry maps them to the **same** platform; `--config-ignore`, no cookies/logins; all traffic through the per-job egress proxy. | `unit/gallerydl-engine.test.js`, `unit/gallerydl-adapter.test.js`, `integration/gallery.test.js` |
| T27 | **Hostile images** (HTML or polyglots named `.jpg`, decompression bombs, EXIF/GPS leaks) | Magic-byte sniff (JPEG/PNG/GIF/WebP/AVIF only) **and** ffprobe decoder must agree; one image stream, no audio; ≤ `MAX_IMAGE_MEGAPIXELS` and 30 000 px per side before decoding; per-file `--filesize-max`; re-encoded by FFmpeg built-in encoders with `-map_metadata -1` (EXIF, comments, text chunks removed); output re-probed. | `unit/gallery-media.test.js`, `integration/gallery.test.js` |

---

## 4. Engine hardening profile

**yt-dlp** (always):

```
--ignore-config --no-plugin-dirs --no-playlist (unless playlist probe)
--proxy http://<random-user>:<random-pass>@127.0.0.1:<egress-port>
--socket-timeout 30 --retries 3 --fragment-retries 5
--max-filesize <limit> --no-mtime --no-cookies-from-browser
--paths home:<jobDir> --paths temp:<jobDir>/tmp -o "src.%(ext)s"
--downloader native --newline --no-colors --progress-template download:...JSON...
--cache-dir <DATA_DIR>/cache/yt-dlp
-- <normalized URL>
```

Never used: `--exec`, `--cookies`, `--cookies-from-browser`, `--username`,
`--password`, `--netrc`, `--impersonate`, `--load-info-json`, `--config-locations`,
`--plugin-dirs`, `--remote-components`, `--no-check-certificates`.

**gallery-dl** (always; image galleries only):

```
--config-ignore --no-input --no-colors
--proxy http://<random-user>:<random-pass>@127.0.0.1:<egress-port> -o proxy-env=false
-o browser=false -o extractor.imgur.mp4=false
--cache-file <job tmp>/gallery-dl-cache.sqlite3 --http-timeout 30 -R 3 --no-mtime
probe:    --no-postprocessors -j --range 1-<MAX_GALLERY_ITEMS+1>
download: --range <chosen indexes> --child-filter False -o downloader.ytdl.enabled=false
          -D <job tmp>/gallery --restrict-filenames ascii --filesize-max <MAX_IMAGE_MB>
          --Print "prepare:FERRY_GDL_FILE {_url!q}"
-- <http(s) URL, or mastodon:<URL> for federated posts>
```

Never used: `--exec`, `--exec-after`, `-C`/`--cookies`, `--cookies-from-browser`,
`-u`/`--username`, `-p`/`--password`, `--netrc`, `-c`/`--config*`, `-X`/`--extractors`,
`-i`/`--input-file`, `-J`/`--resolve-json`, `--xff`, `-U`/`--update`, `--no-check-certificate`.

**FFmpeg / ffprobe** (always): `-nostdin -hide_banner -protocol_whitelist file,pipe`,
inputs and outputs are server-generated paths inside the job directory,
`-threads <n>`, below-normal priority, timeout.

---

## 5. Checklist

| Area | Item | Status |
|---|---|---|
| Input | URL schema/length/port/credential validation | ✅ see §7 |
| Network | Egress proxy enforces public-only, pinned IPs | ✅ |
| Network | Redirect re-validation | ✅ |
| Network | Non-HTTP protocols impossible | ✅ |
| Process | No shell; argv only; `--` before URL | ✅ |
| Process | Minimal env, timeouts, kill-tree, priority | ✅ |
| Files | UUID paths, containment, sanitized names | ✅ |
| Files | FFmpeg-written outputs only, ffprobe verification | ✅ |
| Files | TTL cleanup, delete-on-demand, start-up purge | ✅ |
| AuthZ | Per-job tokens, hashed, constant-time | ✅ |
| Abuse | Rate limits, active-job cap, queue cap | ✅ |
| Abuse | Size, duration, disk, storage limits | ✅ |
| HTTP | Helmet headers, strict CSP, CORS off by default | ✅ |
| HTTP | JSON-only mutations (CSRF) | ✅ |
| Logs | Redaction, URL hashing, no IPs by default | ✅ |
| Secrets | Required in production, never passed to children | ✅ |
| Deps | `npm audit` clean at release | see §7 |
| Deploy | Non-root, read-only FS, cap-drop, resource limits | Provided in `deploy/` (not built in this environment) |
| Deploy | Host egress firewall for private ranges | Documented (operator action) |

---

## 6. Residual risks

1. **Zero-days in FFmpeg/yt-dlp parsers.** Mitigated by isolation and limits,
   not eliminated. Keep engines updated; prefer the container deployment.
2. **Shared-IP fairness.** Users behind one NAT/CGNAT share a rate bucket.
3. **In-memory state** is lost on restart (jobs fail and files are purged); acceptable
   for ephemeral jobs, documented to users as "files are temporary".
4. **Legal risk is not a technical control.** The policy registry and attestation
   reduce misuse but do not replace a takedown process; operators should publish
   terms and a contact for rights holders (see `RESEARCH.md` §Legal).

---

## 7. Verification results (2026-11-24)

### Test evidence

| Suite | Result | What it exercises |
|---|---|---|
| `packages/shared/test/*` | 54 / 54 pass | URL parsing incl. encoded-IPv4 and IDN-homograph cases, ReDoS input, filename/RTLO/device-name sanitization, Content-Disposition, policy resolution, registry integrity (251 entries) |
| `apps/server/test/security/*` | 15 / 15 pass | IP classification (v4/v6/mapped/NAT64/6to4/Teredo), proxy auth, private-target refusal, DNS rebinding and mixed answers, pinned-IP connect, per-job byte cap, guarded fetch redirects |
| `apps/server/test/unit/*` | 28 / 28 pass | No-shell argv (metacharacters stay literal), secret-free child env, timeout/stall/abort with whole-tree kill, bounded output, hardened yt-dlp profile, error classification, normalization (DRM incl. "maybe", protocols), policy re-check after extraction, log redaction |
| `apps/server/test/integration/*` | 21 / 21 pass | Real yt-dlp + FFmpeg end to end: every container and audio format, HTML-as-MP4 rejection, redirect-to-private blocked inside yt-dlp, token checks, path traversal, 413/415, attestation, runtime overrides, pause/resume/cancel/retry, expiry and deletion, rate limiting |
| `e2e/*` (Playwright, Edge) | 10 / 10 pass | Browser flows incl. refusals with official routes, downloads verified with ffprobe, keyboard-only use, mobile layout |
| `npm audit` (prod + dev) | 0 vulnerabilities | — |
| Python environment | yt-dlp 2026.11.23 (all 13 published advisories fixed by 2026.07.04); `curl_cffi` absent | — |

### Defects found and fixed during testing

| Finding | Severity | Fix |
|---|---|---|
| Guarded fetch skipped validation for **IP-literal hosts** (Node never calls a custom `lookup` for literals), so `http://127.0.0.1:…` would have connected | High | Every request now resolves and validates explicitly, then connects to the validated IP with the original hostname used for SNI/Host (`security/guardedFetch.js`) |
| Interrupted direct downloads resumed with `Range` but **no validator**, which can splice two different versions of a resource | Medium | Resume only with a strong ETag or Last-Modified via `If-Range`; otherwise restart (`adapters/http.js`) |
| Subtitle/audio language codes could start with `-` (inert as a comma-joined value, but sloppy) | Low | Codes must start with a letter or digit (schema + argv builder) |
| Generic geo-block wording ("has not made this video available in your country") misclassified | Low | Classifier pattern broadened |
| Form and URL field shared one accessible name (double announcement) | Low (a11y) | Form label removed |

### Not verified in this environment

* The Docker image and Compose stack were written but not built (Docker is not
  installed here); the Caddy log-filter syntax is likewise untested.
* Host-level egress firewall rules are an operator action (documented in
  `deploy/docker-compose.yml`).
* Live third-party platforms were not exercised by automated tests (fixtures only).
