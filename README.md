# Ferry

**Paste a link. Keep the file.** Ferry is a self-hostable media downloader that turns a link into
a clean file — video with sound, video without sound, or audio only — in the format and quality you
choose, and is upfront about what each platform allows. Image posts, albums and carousels (Imgur,
Flickr, Mastodon, …) open as a picture grid: choose the images, get clean copies (metadata removed)
and one ZIP.

* **Honest:** only qualities the source really has; sizes only when known; no upscaling; bitrate
  warnings when a conversion can't add quality; "copied" vs "converted" stated on every file.
* **Rules built in:** a registry of 249 platforms in five permission categories, enforced before
  anything is fetched and changeable at runtime. Protected and paid content stays protected;
  YouTube is official-export-only by default (see [docs/RESEARCH.md](docs/RESEARCH.md)).
* **Private:** no accounts, ads or trackers; history stays on the device; files leave the server
  within the hour (or right after saving).
* **Secure:** every engine connection goes through an egress guard (no SSRF, no DNS rebinding,
  per-job byte caps), no shell execution, hardened yt-dlp/gallery-dl/FFmpeg profiles.
* **See where it works:** real site logos, grouped by what Ferry can do with each site (download
  directly, official download only, protected), with live status dots from recent downloads.
* **Mobile-first:** one-handed layout with bottom tabs, Android share-to-Ferry, resumable native
  downloads, iOS Home-Screen workaround, light/dark. English only.

## Quick start (development)

Requirements: Node 22.12+ (24 recommended), Python 3.11+, FFmpeg/ffprobe (found on `PATH`, or on Windows in winget/Chocolatey/Scoop folders even when the shell predates the install; otherwise set `FFMPEG_PATH`/`FFPROBE_PATH`). Without them Ferry refuses links with a clear "engine unavailable" error.

```bash
npm run setup          # everything: finds Python, creates .venv with pinned yt-dlp + gallery-dl,
                       # npm install, test media, web build (Windows, macOS, Linux)
npm start              # http://127.0.0.1:8787
npm run dev            # API + Vite with hot reload → http://127.0.0.1:5173
```

`npm run setup` options: `--skip-build`, `--skip-fixtures`, `--recreate-venv`. To force a specific
interpreter: `PYTHON=/path/to/python npm run setup` (PowerShell: `$env:PYTHON="C:\…\python.exe"; npm run setup`).

**Windows: "Python was not found; run without arguments to install from the Microsoft Store".**
That message comes from Windows' *App execution aliases* (fake `python.exe`/`python3.exe` that open
the Store), not from Python. `npm run setup` avoids them by using the `py` launcher that the
python.org installer adds. To fix the `python` command itself: *Settings → Apps → Advanced app
settings → App execution aliases*, turn off **python.exe** and **python3.exe**, then open a new
terminal (PATH changes only apply to terminals opened afterwards).

## Tests

```bash
npm run fixtures       # generate self-authored test media with FFmpeg (once)
npm test               # unit + integration (real yt-dlp, gallery-dl and FFmpeg, local fixtures only)
npm run build && npm run test:e2e   # Playwright E2E in the installed Microsoft Edge (PW_CHANNEL=chrome for Chrome)
node scripts/perf.mjs  # performance measurements → docs/PERFORMANCE.md
```

No third-party media is downloaded by any test: fixtures are test patterns and tones generated
locally, served from a loopback server.

## Deploy

```bash
cp .env.example .env            # set SIGNING_SECRET (openssl rand -base64 48) and FERRY_DOMAIN
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
```

The container runs as an unprivileged user with a read-only root filesystem, dropped capabilities
and CPU/memory/process limits, behind Caddy (automatic HTTPS). See
[docs/SYSTEM-ARCHITECTURE.md §16](docs/SYSTEM-ARCHITECTURE.md) and the firewall note in
`deploy/docker-compose.yml`.

Operators can restrict or disable any platform at runtime:

```bash
curl -X PUT https://ferry.example.com/api/v1/admin/policies/vimeo \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"policy":"disabled","reason":"Temporarily unavailable."}'
```

## Repository

```
packages/shared   platform registry (249 platforms), URL detection, formats, errors, job states
apps/server       Express API, job queue, yt-dlp/FFmpeg pipeline, egress guard, official API adapters
apps/web          React + Vite + Tailwind client (PWA)
e2e               Playwright tests          scripts   fixtures, docs generator, perf, test stack
deploy            Dockerfile, Compose, Caddy          docs      research, architecture, security, API
```

## Documentation

| Document | Contents |
|---|---|
| [RESEARCH.md](docs/RESEARCH.md) | Findings and the decisions they drove (full report in `docs/research/`) |
| [PLATFORM-COMPATIBILITY.md](docs/PLATFORM-COMPATIBILITY.md) | Every platform, category, engine, restrictions (generated) |
| [COMPETITOR-ANALYSIS.md](docs/COMPETITOR-ANALYSIS.md) · [FEATURE-GAP-ANALYSIS.md](docs/FEATURE-GAP-ANALYSIS.md) | Market and product gaps |
| [PRODUCT-REQUIREMENTS.md](docs/PRODUCT-REQUIREMENTS.md) | Requirements, MVP vs future, error states |
| [SYSTEM-ARCHITECTURE.md](docs/SYSTEM-ARCHITECTURE.md) | Architecture, pipeline, adapters, deployment |
| [DATABASE-DESIGN.md](docs/DATABASE-DESIGN.md) | Data model and retention |
| [API-DOCUMENTATION.md](docs/API-DOCUMENTATION.md) | REST API v1 |
| [SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md) | Threat model, controls, test evidence |
| [PERFORMANCE.md](docs/PERFORMANCE.md) | Measured performance |
| [IMPLEMENTATION-ROADMAP.md](docs/IMPLEMENTATION-ROADMAP.md) | Phases, status, what's next |

## Legal

Ferry does not remove DRM, bypass paywalls, sign-ins, CAPTCHAs or anti-bot systems, and never asks
for third-party passwords or cookies. Many platforms restrict downloading in their terms; Ferry
shows each platform's rules and official routes, and asks users to confirm they own or are
licensed to save restricted content. This is not legal advice: operators should publish terms of
use, a rights-holder contact and takedown process, and take their own counsel.

Third-party software: yt-dlp (Unlicense), gallery-dl (GPL-2.0-only; run as a separate program, never
imported), FFmpeg (LGPL/GPL depending on build — the Debian build in the Docker image is GPL;
distributing the image triggers GPL obligations), React, Express and other
npm packages (MIT/ISC/Apache-2.0), the Archivo typeface (SIL OFL 1.1). Site logos come from
Simple Icons (CC0, vendored by `scripts/make-brand-icons.mjs`); they are trademarks of their owners
and appear only to name each site.
