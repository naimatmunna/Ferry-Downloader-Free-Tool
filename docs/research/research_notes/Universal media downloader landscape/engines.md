# Open-source extraction & processing engines for a self-hosted, compliance-first media downloader (state as of 2026-11-24)

Scope: engines a Node.js worker could run as isolated subprocesses (argv arrays, no shell) behind an Express API: yt-dlp (+ yt-dlp-ejs), FFmpeg, gallery-dl, Streamlink, Cobalt, you-get, lux, aria2, N_m3u8DL-RE and 2025-2026 newcomers.

Evidence legend: **[V-local]** = verified on this machine on 2026-11-24 by running the installed binaries read-only (yt-dlp only with `--version`, `--help`, `--list-extractors`, `--extractor-descriptions`; FFmpeg only on synthetic `lavfi` test signals written to a scratch folder and deleted) or by reading installed source/metadata files; an offline Python introspection of yt-dlp's extractor registry (`python -I`, no network) was also run to reproduce `supportedsites.md` counts. **[V-web]** = verified from a primary web source. **[Inference]** = my reasoning, not a sourced fact. No media was downloaded. **Every web URL below was accessed on 2026-11-24.** Local test host: yt-dlp 2026.11.23 + yt-dlp-ejs 0.8.0 in a Python 3.12.10 venv; FFmpeg BtbN `n9.0.2-39-g7adfbe40dc-20261031` win64 GPL; Node.js v24.18.0; no Deno/Bun/QuickJS on PATH; `curl_cffi` not installed.

Licensing statements are factual summaries of license texts plus marked inferences; they are not legal advice.

---

## 1. yt-dlp: current version, Python minimum, dependencies, and the YouTube JavaScript-runtime (EJS) requirement (incl. Node 24)

### Takeaway
yt-dlp **2026.11.23** (released 2026-11-23, Unlicense) is current; it needs **Python ≥ 3.11** (3.10 was dropped in 2026.10.26). Full YouTube support needs the pinned **yt-dlp-ejs 0.8.0** package plus an external JS runtime: **Deno ≥ 2.3.0** (the only one on by default, and the only one documented as running with no file-system or network access), **Node ≥ 22.0.0**, QuickJS ≥ 2023-12-09 / any QuickJS-NG, or Bun 1.2.11–1.3.14 (deprecated). **Node 24 works**: pass `--no-js-runtimes --js-runtimes node[:PATH]`; yt-dlp then runs `node --permission -`, but the maintainers still call Node "insecure" compared with Deno.

### Cited Findings
**Version, release cadence, maintenance**
- [V-local] The installed binary reports `2026.11.23`; the package metadata gives `Version: 2026.11.23` and `License-Expression: Unlicense` — [Local: yt-dlp --version](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Scripts/yt-dlp.exe); [Local: yt-dlp METADATA](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-web] Recent stable tags (newest first): 2026.11.23 (23 Nov), 2026.10.26, 2026.10.21, 2026.08.19, 2026.07.04, 2026.06.09, 2026.03.17, 2026.03.13, 2026.03.03, 2026.02.21. That is about 10 stable releases between February and November 2026. Nightly (`yt-dlp-nightly-builds`) and master (`yt-dlp-master-builds`) channels also exist — [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- [V-web] 2026.11.23 notes: added an `ios_producer` YouTube client, temporarily removed `web` from the default clients, made `tv` the default `player_js_variant`, and fixed several extractors (arte, DRTV, la7play, Twitter Spaces, etc.) — [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- [V-local] The code confirms the default YouTube clients are `('tv_samsung', 'visionos')`. The JS-less default is `('visionos',)` and `_DEFAULT_PLAYER_JS_VARIANT = 'tv'`. **Conflict:** the bundled README still says the default is `tv_samsung,visionos,web` (the docs lag the code) — [Local: yt_dlp/extractor/youtube/_video.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/youtube/_video.py); [Local: README in METADATA](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-web] 2026.10.26: the minimum required Python became 3.11, and 3.10 was removed after its October 2026 EOL. Official Windows binaries now need Windows 10+. Bundled `brotli` was bumped to 1.2.1 and `curl-cffi` to 0.17.0 for security — [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- [V-web] Repository stats: 210,249 stars, 18,608 forks, `open_issues_count` 2,787 (issues + PRs). The repo page shows about 2.1k open issues and 701 open PRs, and 24,069 commits. Created 2020-10-26; last push 2026-11-23T23:49Z — [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg); [yt-dlp repo page](https://github.com/yt-dlp/yt-dlp)
- [V-local] The package lists pukkandan as author. Maintainers: maintainers@yt-dlp.org, Grub4K, bashonly and coletdjnz — [Local: METADATA](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)

**Python and dependencies**
- [V-local] `Requires-Python: >=3.11`. Classifiers cover Python 3.11–3.15, CPython and PyPy. The README says Python 3.11+ (CPython and PyPy) is supported and that support for older versions is removed as they reach EOL — [Local: METADATA](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] Extras:
  - `default`: brotli/brotlicffi, `certifi>=2026.10.19`, mutagen, pycryptodomex, `requests>=2.32.2,<3`, `urllib3>=2.0.2,<3`, `websockets>=13.0` and **`yt-dlp-ejs==0.8.0`**.
  - `curl-cffi`: `curl-cffi>=0.5.10,<0.18`, excluding 0.6–0.9.
  - **`deno`: `deno>=2.9.8`** (the Deno binary as a PyPI package).
  - Also `pin`, `pin-curl-cffi` and `pin-deno`.

  — [Local: METADATA](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] README dependency licenses. Strongly recommended: ffmpeg/ffprobe (license depends on the build) and yt-dlp-ejs (Unlicense, bundles MIT and ISC components). Networking: certifi (MPLv2), brotli/brotlicffi (MIT), websockets (BSD-3-Clause), requests (Apache-2.0). Impersonation: curl_cffi (MIT, optional). Metadata: **mutagen (GPLv2+)** and AtomicParsley (GPLv2+). Misc: pycryptodomex (BSD-2-Clause, used for AES-128 HLS) and phantomjs (BSD-3, "to be deprecated"). The standalone binaries bundle the starred packages — [Local: README in METADATA](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] Installed in the venv: brotli 1.2.1, certifi 2026.11.20, mutagen 1.48.1, pycryptodomex 3.24.2, requests 2.34.2, urllib3 2.8.0, websockets 17.4, yt-dlp-ejs 0.8.0. There is **no curl_cffi** — [Local: pip list in .venv](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/)

**EJS / yt-dlp-ejs**
- [V-web] YouTube downloads need JavaScript challenges solved by an external runtime. The solver scripts come from yt-dlp-ejs, which replaced the earlier JSInterp/PhantomJS approach. The wiki page was last edited 2026-07-12 — [yt-dlp wiki: EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS)
- [V-web] yt-dlp-ejs 0.8.0 is the latest on PyPI (uploaded 2026-03-17). It requires Python ≥3.10 and is licensed `Unlicense AND MIT AND ISC`. Releases ran from 0.1.0 (2025-10-21) to 0.8.0 — [PyPI yt-dlp-ejs JSON](https://pypi.org/pypi/yt-dlp-ejs/json). The repo is `yt-dlp/ejs` (TypeScript, 487 stars, created 2025-08-24, last push 2026-10-26) — [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-web] Install paths:
  - Official PyInstaller executables and the zipimport binary bundle yt-dlp-ejs.
  - pip users run `pip install -U "yt-dlp[default]"`. A separately installed yt-dlp-ejs must match the version pinned in `pyproject.toml`, and older versions are ignored.
  - Alternatives: `--remote-components ejs:npm` (works only with Deno and Bun) or `ejs:github` (fails if GitHub is unreachable, including IPv6-only setups).

  — [yt-dlp wiki: EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS)

**Runtimes, minimum versions, defaults, flag syntax**

| Runtime | Minimum (wiki) | Code constant [V-local] | Enabled by default | Sandbox (wiki) |
|---|---|---|---|---|
| Deno (recommended) | 2.3.0 | `(2, 3, 0)` | **Yes (only one)** | no file system or network access |
| Node.js | 22.0.0 | `(22, 0, 0)` | No | some permissions restricted |
| QuickJS / QuickJS-NG | 2023-12-9 / all NG versions | `(2023, 12, 9)` | No | uses temp files, so a theoretical TOCTOU risk |
| Bun (deprecated) | 1.2.11; nothing above 1.3.14 is supported | `(1, 2, 11)` min, `_BUN_MAX_SUPPORTED_VERSION = (1, 3, 14)` | No | no permission restrictions |

— [yt-dlp wiki: EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS); [Local: yt_dlp/utils/_jsruntime.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/utils/_jsruntime.py); [Local: jsc/_builtin/bun.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/youtube/jsc/_builtin/bun.py)

- [V-web] QuickJS builds older than 2025-4-26, and QuickJS-NG older than 0.12.0, lack optimizations, so a solve can take several minutes. The executable must be named `qjs` unless a path is given — [yt-dlp wiki: EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS)
- [V-local] `--help` text:
  - **`--js-runtimes RUNTIME[:PATH]`**: PATH is the binary or its directory; the option is repeatable. Priority order is deno, node, quickjs, bun. Only "deno" is enabled by default. The highest-priority runtime that is both enabled and available is used. To use a lower-priority runtime when deno is available, pass **`--no-js-runtimes`** first.
  - **`--remote-components COMPONENT`**: `ejs:npm` or `ejs:github`. No remote components are allowed by default. It is "currently not needed" with official executables or the requisite yt-dlp-ejs installed.
  - **`--no-remote-components`**.

  — [Local: yt-dlp --help](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Scripts/yt-dlp.exe)
- [V-local] Deno is invoked as `deno run --ext=js --no-code-cache --no-prompt --no-remote --no-lock --node-modules-dir=none --no-config [--no-npm --cached-only] -`, with no `--allow-*` grants. yt-dlp's proxy is passed in via `HTTP(S)_PROXY` env vars. `--unsafely-ignore-certificate-errors` is added only if `--no-check-certificates` is set — [Local: jsc/_builtin/deno.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/youtube/jsc/_builtin/deno.py)
- [V-local] **Node** is invoked as `node --permission -` when Node ≥ 23.5.0, or `--experimental-permission --no-warnings=ExperimentalWarning` below that. The script arrives on stdin. An optional `--v8-flags=--jitless` is added — [Local: jsc/_builtin/node.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/youtube/jsc/_builtin/node.py)
- [V-local] The extractor-arg `youtube-ejs:jitless=true` runs deno, node or bun JIT-less: more secure, but slower. The README adds that node and bun "are still considered insecure" — [Local: README in METADATA](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] With no JS runtime, the `web` and `tv_samsung` clients are dropped (README), and the code falls back to `visionos` only. Some clients need a PO token for their formats to be downloadable — [Local: README in METADATA](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA); [Local: _video.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/youtube/_video.py)
- [V-local] Node v24.18.0 is on PATH (`C:\Program Files\nodejs`); deno, bun and qjs are not — [Local: node.exe](file:///C:/Program%20Files/nodejs/node.exe)

### Inferences
- **Node 24 how-to:** pass argv such as `["--no-js-runtimes", "--js-runtimes", "node:/usr/local/bin/node", ...]`. `--no-js-runtimes` keeps a stray Deno from winning on priority. Node 24.x ≥ 22.0.0 is supported and gets the stable `--permission` flag (≥ 23.5.0).
- **Deno is the safer choice for a multi-tenant server.** It runs with zero grants (no fs/net/env), while Node's permission model is a guard-rail the maintainers still call insecure. To my understanding, Node 24's model does not cut outbound network by default (not re-verified). Recommended: ship Deno via `pip install "yt-dlp[default,deno]"` or a pinned Deno binary, keep `--remote-components` unset, and pin yt-dlp and yt-dlp-ejs together.
- On this host as configured (no Deno, Node not enabled), YouTube extraction would run JS-less with the `visionos` client only, so expect fewer formats.
- Budget for upgrading yt-dlp every 1–4 weeks. YouTube client defaults changed in at least three 2026 releases.

### Gaps
- Contributor count was not retrieved (repo-page sidebar not captured). Release dates before 2026.02.21 (e.g. January 2026) were not captured.
- Deno and Node licenses, and Node 24 permission-model coverage of network access, were not re-verified this session.
- No performance numbers were found (startup time, per-challenge JS solve latency, memory).

---

## 2. yt-dlp flags for safe server use: exact names and semantics (2026.11.23)

### Takeaway
Every flag in the brief exists in 2026.11.23. The main safety levers:
- **`--ignore-config`**: blocks Portable, Home (a `yt-dlp.conf` in the download home path), User and System config files.
- **`--no-plugin-dirs`** or env **`YTDLP_NO_PLUGINS=1`**: disables all plugin loading, including PYTHONPATH and pip-installed plugins.
- An extractor allowlist via **`--ies`** (drop `generic`), **`--xff never`**, and native downloaders.
- Never `--exec`, `--netrc-cmd`, `--write-*link` or `--cookies-from-browser`.
- Enforce your own byte cap: **`--max-filesize` only aborts when the server sends a length**.

### Cited Findings
All `--help` facts are [V-local] — [Local: yt-dlp --help](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Scripts/yt-dlp.exe).

**Config and plugins**
- `--ignore-config` (alias `--no-config`): load no more config files except those given to `--config-locations`. If found inside the system config, the user config is skipped. `--no-config-locations`: load no custom config files (the default); inside a config file it cancels earlier `--config-locations`. `--config-locations PATH`: path or directory, `-` for stdin, repeatable — [help]
- [V-local] Config load order is Portable (next to the executable), **Home** (`yt-dlp.conf` inside the `-P home:` directory), User, then System. Each stage is skipped when `--ignore-config` is set — [Local: yt_dlp/options.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/options.py)
- `--plugin-dirs DIR` (the default is `default`; repeatable). `--no-plugin-dirs` clears all plugin dirs, including defaults — [help]
- [V-local] `load_plugins()` returns immediately if env `YTDLP_NO_PLUGINS` is set or the plugin-dir list is empty. The default search covers user and system config `plugins/` dirs, `yt-dlp-plugins/` next to the executable, and **every `sys.path` entry** (PYTHONPATH and pip) — [Local: yt_dlp/plugins.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/plugins.py)
- [V-local] The README warns that **all** plugins are imported even if not invoked, plugin code is not checked, and extractor plugins override built-ins — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- `--use-extractors NAMES` (alias `--ies`) takes names, regexes, `all`, `default` or `end`. A `-` prefix excludes, e.g. `--ies default,-generic` — [help]

**Network**
- `--proxy URL`: HTTP, HTTPS or SOCKS (e.g. `socks5://user:pass@127.0.0.1:1080/`). `--proxy ""` forces a direct connection. Also `--socket-timeout`, `--source-address`, `-4` and `-6` — [help]
- `--enable-file-urls`: file:// URLs are disabled by default for security reasons — [help]
- `--impersonate CLIENT[:OS]`, e.g. `chrome`, `chrome-110`, `chrome:windows-10`; `""` means any client. Help notes that forcing impersonation may hurt speed and stability. Also `--list-impersonate-targets` — [help]
- [V-local] Impersonation needs **curl_cffi** (MIT; the `curl-cffi` extra). It is included in most official builds **except** the `yt-dlp` zipimport binary and `yt-dlp_x86` — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] **21 extractor modules request impersonation automatically** when a capable handler is installed, including youtube/_video.py, instagram, tiktok, reddit, vimeo, soundcloud, kick, mixcloud, 9gag, nytimes and wsj. Without curl_cffi, yt-dlp warns and proceeds. Only modules with `require_impersonation=True` error out, and just one (bandcamp.py) does — [Local: yt_dlp/extractor/common.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/common.py) (grep of the installed extractor tree)
- `--xff VALUE`: fake X-Forwarded-For to try bypassing geo-restriction. Values: `default` (only when known useful), `never`, a CIDR block, or a country code. Also `--geo-verification-proxy URL` — [help]
- `--no-check-certificates` suppresses HTTPS validation; `--legacy-server-connect` allows servers without RFC 5746 support — [help]

**Selection and size**
- `-I, --playlist-items ITEM_SPEC`: comma-separated indices or `[START]:[STOP][:STEP]`, with negative indices and steps; e.g. `-I 1:3,7,-5::2` — [help]
- `--min-filesize` / `--max-filesize SIZE` (e.g. 50k, 44.6M): abort if the file is smaller or larger — [help]
- [V-local] **Enforcement:** the native HTTP downloader checks `max_filesize` only when the response length is known (Content-Length + resume offset), then aborts before writing the body. The curl external downloader receives `--max-filesize`. There is no check in `YoutubeDL` core or the fragment (HLS/DASH) downloaders — [Local: downloader/http.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/downloader/http.py); [Local: downloader/external.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/downloader/external.py)
- `--match-filters FILTER` (e.g. `!is_live`) and `--break-match-filters`; `--no-playlist` / `--yes-playlist`; `--max-downloads NUMBER`; `--age-limit YEARS`; `--download-archive FILE` — [help]
- `--flat-playlist`: do not extract a playlist's URL-result entries (some metadata may be missing, and downloading may be bypassed). `--lazy-playlist` processes entries as received — [help]

**Download engine**
- `-N, --concurrent-fragments N` (default 1, DASH/hlsnative); `-r, --limit-rate`; `--throttled-rate`; `-R, --retries` (default 10); `--fragment-retries` (default 10); `--file-access-retries` (default 3); `--retry-sleep [TYPE:]EXPR`; `--skip-unavailable-fragments` (default) vs `--abort-on-unavailable-fragments`; `--http-chunk-size` (experimental); `--hls-use-mpegts` (default for live) — [help]
- `--download-sections REGEX`: chapters matching the regex, or a time range with a `*` prefix. Negative timestamps count from the end, and `*from-url` uses start/end times from the URL. **Needs ffmpeg**; repeatable, e.g. `--download-sections "*10:15-inf"` — [help]
- `--downloader [PROTO:]NAME` (alias `--external-downloader`): native, aria2c, axel, curl, ffmpeg, httpie or wget, optionally per protocol (http, ftp, m3u8, dash, rtmp). Example `--downloader aria2c --downloader "dash,m3u8:native"`. `--downloader-args NAME:ARGS`; for ffmpeg, positional `_i`/`_o` like `--ppa` — [help]

**Filesystem and output**
- `-P, --paths [TYPES:]PATH`: `home` (default) and `temp` types; intermediates go to temp and are moved to home when done. Ignored if `--output` is absolute. `-o, --output [TYPES:]TEMPLATE`; `--output-na-placeholder` — [help]
- `--restrict-filenames`: ASCII only, no `&` or spaces. `--windows-filenames`: force Windows-compatible names. `--no-windows-filenames`: minimal sanitization. `--trim-filenames LENGTH` — [help]
- `-w/--no-overwrites`, `--force-overwrites`, `-c/--continue` (default), `--part` (default) / `--no-part`, `--no-mtime` (default) — [help]
- `--write-info-json` (may contain personal information); `--clean-info-json` (default); `--load-info-json FILE` — [help]
- **Cookies:** `--cookies FILE` reads cookies from a Netscape file **and dumps the cookie jar back into it**. `--no-cookies` is the default. `--cookies-from-browser BROWSER[+KEYRING][:PROFILE][::CONTAINER]` supports brave, chrome, chromium, edge, firefox, opera, safari, vivaldi and whale — [help]
- **Cache:** `--cache-dir DIR` (stores e.g. client ids and signatures; default `${XDG_CACHE_HOME}/yt-dlp`), `--no-cache-dir`, `--rm-cache-dir` — [help]. [V-local] The code falls back to `~/.cache` when `XDG_CACHE_HOME` is unset. `--rm-cache-dir` refuses to delete a path that contains neither "cache" nor "tmp" — [Local: yt_dlp/cache.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/cache.py)

**Machine-readable output and progress**
- `-j, --dump-json` prints one JSON per video. `-J, --dump-single-json` prints one JSON per URL, and a playlist is dumped in a single line. Both simulate unless `--no-simulate` — [help]
- `-O, --print [WHEN:]TEMPLATE`: implies `--quiet`, and `--simulate` unless `--no-simulate` or a later WHEN is used. Also `--print-to-file [WHEN:]TEMPLATE FILE` — [help]
- `--newline` prints the progress bar as new lines. Also `--no-progress` and `--progress` (shows progress even in quiet mode) — [help]
- `--progress-template [TYPES:]TEMPLATE` with types `download:` (default), `download-title:`, `postprocess:` and `postprocess-title:`. The template sees the `info` and `progress` keys. Also `--progress-delta SECONDS` (default 0) — [help]
- [V-local] **Progress keys** (progress-hook contract):
  - `status` (downloading / error / finished; ignore unknown values), `filename`, `tmpfilename`, `downloaded_bytes`, `total_bytes` (None if unknown), `total_bytes_estimate`, `elapsed`, `eta` (None if unknown), `speed` (bytes/s, None if unknown), `fragment_index`, `fragment_count`.
  - The downloader adds preformatted keys: `_percent`, `_percent_str`, `_eta_str`, `_speed_str`, `_total_bytes_str`, `_total_bytes_estimate_str`, `_downloaded_bytes_str`, `_elapsed_str`, `_default_template`.
  - The template receives `{'info': info_dict, 'progress': <progress dict without info_dict>}`.

  — [Local: yt_dlp/YoutubeDL.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/YoutubeDL.py); [Local: downloader/common.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/downloader/common.py)
- [V-local] Output templates support the conversion `j` (JSON; `#` pretty-prints, `+` keeps Unicode) along with `B`, `h`, `l`, `q`, `D` and `S` — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)

**Format and post-processing**
- `--merge-output-format FORMAT`: a `/`-separated list from avi, flv, mkv, mov, mp4 and webm; ignored if no merge is needed — [help]
- `--remux-video FORMAT`: avi, flv, gif, mkv, mov, mp4, webm, aac, aiff, alac, flac, m4a, mka, mp3, ogg, opus, vorbis or wav. Fails if the target container can't hold the codec. Rules are allowed, e.g. `aac>m4a/mov>mp4/mkv`. `--recode-video` uses the same syntax and formats but re-encodes — [help]
- `-x, --extract-audio` (needs ffmpeg and ffprobe). `--audio-format`: best (default), aac, alac, flac, m4a, mp3, opus, vorbis or wav. `--audio-quality` 0 (best) to 10 for VBR, or a bitrate (default 5) — [help]
- `--embed-metadata` (alias `--add-metadata`) also embeds chapters and infojson if present, unless `--no-embed-chapters` / `--no-embed-info-json` is given. `--embed-info-json` attaches to mkv/mka only — [help]
- `--embed-subs` works only for mp4, webm and mkv. Also `--write-subs`, `--write-auto-subs`, `--sub-format`, and `--sub-langs LANGS` (regex, `all`, `-` exclusions, e.g. `all,-live_chat`). `--convert-subs` takes ass, lrc, srt or vtt; `none` is the default — [help]
- `--write-thumbnail`, `--write-all-thumbnails`, `--embed-thumbnail`. `--convert-thumbnails` takes jpg, png or webp, with rules like `--remux-video`; `none` is the default — [help]
- `--postprocessor-args NAME:ARGS` (alias `--ppa`), with `PP+EXE:ARGS` and `_i`/`_o` positional variants. `--ffmpeg-location PATH` — [help]
- **`--exec [WHEN:]CMD`**: output-template fields are allowed, but for security only the `i`/`d`, `f` and `q` conversions. If no field is given, `%(filepath,_filename|)q` is appended. **`--no-exec`** removes previously defined `--exec` (none is defined by default) — [help]
- [V-local] `--compat-options allow-unsafe-exec-expansion` reverts the `--exec` restriction. Versions 2021.04.11 through 2026.03.17 did not apply it. `--compat-options allow-unsafe-ext` allows any file extension; the README links it to GHSA-79w7-vh3h-8g4j — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- `--netrc`, `--netrc-location`, `--netrc-cmd NETRC_CMD` (runs a command to get credentials). `--write-link`, `--write-url-link`, `--write-webloc-link`, `--write-desktop-link` — [help]
- `-t, --preset-alias` takes mp3, aac, mp4, mkv or sleep. `-t mp4` expands to `--merge-output-format mp4 --remux-video mp4 -S vcodec:h264,lang,quality,res,fps,hdr:12,acodec:aac` — [help]
- Hidden option: `--allow-unplayable-formats` (help suppressed) — see section 3 — [Local: options.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/options.py)

### Inferences
- **Suggested baseline argv** (constructed from the semantics above; untested end-to-end because downloads were out of scope):
  `yt-dlp --ignore-config --no-plugin-dirs --no-js-runtimes --js-runtimes deno:/opt/deno/deno --ies "<allowlist>,-generic" --proxy <egress-proxy> --socket-timeout 30 --xff never --no-cookies --cache-dir /work/<job>/cache --downloader native -P home:/work/<job>/out -P temp:/work/<job>/tmp -o "%(id)s.%(ext)s" --restrict-filenames --windows-filenames --trim-filenames 120 --no-playlist --max-filesize <cap> --newline --progress-delta 1 --progress-template "download:%(progress)j" --print "after_move:filepath" --merge-output-format "mp4/mkv" <URL>`
  - Add env `YTDLP_NO_PLUGINS=1`, and set `HOME`/`XDG_*`/`APPDATA` to per-job dirs.
  - For metadata-only previews: `-J --flat-playlist -I 1:50` (plus `--ignore-no-formats-error` to show DRM'd items as metadata).
- `--max-filesize` is not a safety boundary for HLS/DASH or for chunked responses without a length. Kill the process from the worker when `progress.downloaded_bytes` passes the cap, and also apply disk quotas.
- Prefer `-o "%(id)s.%(ext)s"` plus server-side naming over title-based templates. It shrinks the filename attack surface and makes `--restrict-filenames`/`--windows-filenames` mostly moot.
- `--xff never` matters for compliance: the default can fake X-Forwarded-For "when known to be useful" to dodge geo-blocks.
- `--cookies FILE` writes back to the file. If cookies are ever allowed (e.g., a tenant's own login), use a per-job copy.

### Gaps
- Not verified: whether `--ppa "ffmpeg_i:-protocol_whitelist file"` (no index) applies to every ffmpeg input yt-dlp creates.
- No live end-to-end test of `%(progress)j` output (no downloads permitted).

---

## 3. How yt-dlp marks DRM-protected formats, and which format fields are reliable

### Takeaway
Extractors set `has_drm` per format: `True` means DRM and not downloadable, `'maybe'` means the format must be tested. yt-dlp **drops `has_drm=True` formats before selection** and errors "This video is DRM protected" if nothing playable remains. Only a hidden developer flag (`--allow-unplayable-formats`) keeps them, and it never decrypts. `filesize` (exact) is mostly present only for progressive HTTP. Manifest formats usually lack size, because yt-dlp deliberately stopped estimating `filesize_approx` for them.

### Cited Findings
- [V-local] Field contract: `has_drm` is True if the format has DRM and cannot be downloaded, or `'maybe'` if it may have DRM and must be tested before download — [Local: yt_dlp/extractor/common.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/common.py)
- [V-local] Processing:
  - `info['_has_drm']` is set when any format has `has_drm` truthy and not `'maybe'`.
  - Unless `allow_unplayable_formats` is set, formats with `has_drm` (other than `'maybe'`) are **removed**.
  - If only image formats remain, yt-dlp warns that the video is DRM protected and only images are available.
  - If nothing remains, it raises an expected error with the message "This video is DRM protected".
  - `'maybe'` formats (and those flagged `__needs_testing`) are test-downloaded during selection.

  — [Local: yt_dlp/YoutubeDL.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/YoutubeDL.py)
- [V-local] `-F` shows a `DRM` or `Maybe DRM` marker. `--allow-unplayable-formats` is registered with help suppressed. Using it prints a warning that it is a debugging developer option and that users should not file bug reports — [Local: YoutubeDL.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/YoutubeDL.py); [Local: options.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/options.py)
- [V-local] Detection:
  - HLS: `HlsFD._has_drm` regex-matches FairPlay (`skd://`, `com.apple.streamingkeydelivery`), PlayReady `KEYFORMAT`, and Adobe Flash Access `#EXT-X-FAXS-CM:`.
  - DASH: `ContentProtection` on an AdaptationSet or Representation sets `has_drm = True`.

  — [Local: downloader/hls.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/downloader/hls.py); [Local: extractor/common.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/common.py)
- [V-local] AES-128 HLS (clear-key segment encryption, not DRM) is decrypted with pycryptodomex — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] Other field definitions:
  - `filesize`: bytes, if known in advance. `filesize_approx`: an estimate.
  - `tbr` / `abr` / `vbr`: average bitrates in kbps (1000 bits/s).
  - `vcodec` / `acodec`: codec names; `'none'` is used for absent streams in parsers.
  - `dynamic_range`: one of SDR (None), HDR10, HDR10+, HDR12, HLG or DV.
  - `protocol`: lower-case, e.g. `http`, `https`, `m3u8`, `m3u8_native`, `http_dash_segments`, `ism`, `f4m`, `rtmp`.

  — [Local: extractor/common.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/common.py); [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] yt-dlp 2021.11.10–2023.06.21 estimated `filesize_approx` for fragmented/manifest formats. That was reverted for "potentially extreme inaccuracy", and `--compat-options manifest-filesize-approx` restores it — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] Default codec preference when sorting:
  - video: av01 > vp9.2 > vp9 > h265 > h264 > vp8 > h263 > theora
  - audio: flac/alac > wav/aiff > opus > vorbis > aac > mp4a > mp3 > ac4 > eac3 > ac3 > dts

  The YouTube extractor-arg `formats=` can add `missing_pot` (formats needing an absent PO token) or `incomplete` formats, which are hidden by default — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)

### Inferences
- **Policy hook:** treat `_has_drm` true (in `-J` output), or a "DRM protected" extractor error, as a hard compliance stop. Show a "protected content, not supported" message and never pass `--allow-unplayable-formats`. Treat `has_drm == 'maybe'` formats as ineligible unless yt-dlp's own test resolves them.
- The HLS regex does not list a Widevine `KEYFORMAT`, so do not treat `has_drm` absence as proof of no DRM. Keep yt-dlp's default refusal behaviour, and do not add external decryptors.
- Size estimates for UI and quota pre-checks: prefer `filesize`, then `filesize_approx`, then `tbr × duration / 8` (marked as an estimate). Enforce real caps at runtime (section 2).
- `vcodec == 'none'` or `acodec == 'none'` reliably flags audio-only or video-only formats. `None` means unknown, not absent.

### Gaps
- No empirical measurement of how often `filesize`, `tbr` or `dynamic_range` are populated per site.
- Not verified: whether native HLS refuses SAMPLE-AES/Widevine HLS by itself or falls back to ffmpeg.

---

## 4. yt-dlp security advisories (2023-11 → 2026-11), fixed versions, and server mitigations

### Takeaway
GitHub lists **13 yt-dlp advisories**. **10 fall inside the three-year window** (on or after 2023-11-24), and CVE-2023-46121 (2023-11-14) misses it by 10 days. **Six were published in 2026**: a 2026-02-21 `--netrc-cmd` injection, four on 2026-06-09 and one on 2026-07-04, all fixed by 2026.07.04. Almost all are reachable only through optional features: `--exec`, `--netrc-cmd`, `--write-*link`, the aria2c/curl external downloaders, and subtitle/thumbnail extension handling. A server running **≥ 2026.07.04** (ideally 2026.11.23) with those features off and native downloaders on avoids every known issue.

### Cited Findings
Source for all rows: [GitHub API: yt-dlp security advisories](https://api.github.com/repos/yt-dlp/yt-dlp/security-advisories?per_page=100) (full array read, 13 objects) and [yt-dlp advisories page](https://github.com/yt-dlp/yt-dlp/security/advisories).

| Published | GHSA / CVE | Sev. | Issue (paraphrased) | Affected → Fixed | Advisory workaround |
|---|---|---|---|---|---|
| 2026-07-04 | GHSA-6v4j-43gg-vj32 / **CVE-2026-55404** | High | Internet-shortcut output (`--write-link`, `--write-url-link`, `--write-desktop-link`) could carry file:// URLs or injected desktop-entry lines → downstream command execution | < 2026.07.04 → **2026.07.04** | don't use the link options |
| 2026-06-09 | GHSA-vx4q-3cr2-7cg2 / **CVE-2026-50574** (NVD 9.6 Critical) | High | Crafted HLS/DASH manifests inject aria2c options → arbitrary file write/code execution when aria2c is the downloader | < 2026.06.09 → **2026.06.09** | `--downloader dash,m3u8:native` |
| 2026-06-09 | GHSA-f7j3-774f-rfhj / **CVE-2026-50019** | Moderate | Cookie leak to other hosts after redirects with `--downloader curl` | ≥2023.09.24, <2026.06.09 → **2026.06.09** | don't use curl downloader |
| 2026-06-09 | GHSA-c6mh-fpjc-4pr3 / **CVE-2026-50023** | High | Bypass of CVE-2024-38519: the allow-list let shortcut-type extensions through, so malicious subtitles could be saved as shortcut files | < 2026.06.09 → **2026.06.09** | trusted URLs only; avoid subtitle/thumbnail options |
| 2026-06-09 | GHSA-69qj-pvh9-c5wg / (no CVE) | High | `--exec` allowed unsafe output-template conversions → metadata such as titles could inject shell commands | ≥2021.04.11, <2026.06.09 → **2026.06.09** | only `%()q` or avoid `--exec` |
| 2026-02-21 | GHSA-g3gw-q23r-pgqm / **CVE-2026-26331** | High | Crafted hostnames in some extractors inject into the `--netrc-cmd` command | ≥2023.06.21, <2026.02.21 → **2026.02.21** | don't use `--netrc-cmd` |
| 2025-07-21 | GHSA-45hg-7f49-5h56 / **CVE-2025-54072** | High | Windows `--exec` default `{}` placeholder mis-escaped (bypass of CVE-2024-22423) | < 2025.07.21 → **2025.07.21** | avoid `--exec` on Windows |
| 2024-07-07 | GHSA-3v33-3wmw-3785 / (no CVE) | Low | Douyu extractors loaded third-party CDN JavaScript (run via PhantomJS) | 2023.09.24–2024.07.02 → patched version reported as "2024.07.07" (see Gaps) | avoid Douyu / uninstall PhantomJS |
| 2024-07-01 | GHSA-79w7-vh3h-8g4j / **CVE-2024-38519** | High | Unrestricted file extensions → overwrite executables or `yt-dlp.conf` (RCE) | < 2024.07.01 → **2024.07.01** | upgrade; avoid generic extractor/subtitles |
| 2024-04-09 | GHSA-hjq6-52gw-2g7p / **CVE-2024-22423** | High | Windows `--exec` `%q` escaping bypass (of CVE-2023-40581) | ≥2021.04.11, <2024.04.09 → **2024.04.09** | avoid template expansion in `--exec` |
| 2023-11-14 | GHSA-3ch3-jhc6-5r8x / **CVE-2023-46121** | Medium | Generic extractor: a malicious page could smuggle a proxy header → MITM | ≥2022.10.04 → **2023.11.14** | disable generic extractor |
| 2023-09-24 | GHSA-42h4-v29r-42qg / CVE-2023-40581 | High | Windows `--exec` `%q` command injection (outside the 3-year window) | ≥2021.04.11, <2023.09.24 → 2023.09.24 | — |
| 2023-07-06 | GHSA-v8mc-9377-rwjj / CVE-2023-35934 | Medium | Cookie leak on redirects in downloaders (outside the window) | < 2023.07.06 → 2023.07.06 | — |

- [V-web] Dependency-driven: 2026.10.21 warns that **old yt-dlp executables are vulnerable to MITM** (citing certifi advisory GHSA-6q48-6c7w-9gw2). It advises avoiding the self-updater (`-U`/`--update-to`) and installing the release manually — [GitHub API: release 2026.10.21](https://api.github.com/repos/yt-dlp/yt-dlp/releases/tags/2026.10.21). 2026.10.26 bundled brotli 1.2.1 and curl-cffi 0.17.0 for security — [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- [V-local] The local venv already has brotli 1.2.1 and certifi 2026.11.20 — [Local: site-packages](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/)
- [V-local] `--compat-options allow-unsafe-ext` re-opens the GHSA-79w7 attack surface and prints a warning at startup — [Local: yt_dlp/__init__.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/__init__.py)

### Inferences
- **Server mitigations (all available in 2026.11.23):**
  - Pin ≥ 2026.07.04; prefer the latest release, and rebuild images from pinned, hash-checked PyPI wheels. Never run `-U` in production.
  - Never pass `--exec`, `--netrc-cmd`, `--write-*link` or compat `allow-unsafe-*`.
  - Force native downloaders (do not ship aria2c or curl as yt-dlp downloaders).
  - Exclude the `generic` extractor via `--ies`, which removes the vector named in two advisories.
  - Use `--ignore-config` so a planted `yt-dlp.conf` in the download directory is never read (the CVE-2024-38519 payload).
  - Write outputs to a non-executable, per-job directory owned by an unprivileged user, and serve files with forced `Content-Disposition: attachment` and a server-chosen extension.
- The pattern of two bypasses (CVE-2024-22423 → CVE-2025-54072; CVE-2024-38519 → CVE-2026-50023) suggests filename/extension and `--exec` handling remain fragile. Defence-in-depth at the worker level is warranted.

### Gaps
- The Douyu advisory's patched version came back as "2024.07.07", which may be the advisory date rather than a release tag; verify on the advisory page.
- There are no CVE IDs for GHSA-69qj-pvh9-c5wg and GHSA-3v33-3wmw-3785.

---

## 5. yt-dlp supported-site count: entries vs "Currently broken" vs aliases vs distinct platforms

### Takeaway
yt-dlp 2026.11.23 has **1,751 extractors**. Its `supportedsites.md` equivalent has **1,731 entries**, of which **136 (7.9%) are marked "Currently broken"**. The entries collapse to about **1,362 name families**, or **922 extractor modules** (831 with at least one working extractor). An honest headline is "≈850–1,250 working site integrations", not "1,700+ sites".

### Cited Findings
- [V-local] `yt-dlp --list-extractors` printed 1,752 lines, with `generic` listed twice, a lazy-loader quirk. That makes **1,751 unique extractor names**. **136** are tagged `(CURRENTLY BROKEN)`. `--extractor-descriptions` (which skips broken and hidden extractors) printed 1,595 lines — [Local: yt-dlp --list-extractors / --extractor-descriptions](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Scripts/yt-dlp.exe)
- [V-local] Offline introspection reproduced the `devscripts/make_supportedsites.py` rule (entries are extractors with `IE_DESC is not False`; broken ones get the `(**Currently broken**)` suffix). Results:
  - **1,731 supportedsites entries**, of which **136 not working**
  - **20 hidden** extractors (not listed)
  - **10 search pseudo-extractors** (`SEARCH_KEY`, e.g. `ytsearch:`)
  - **232** login-capable extractors (`_NETRC_MACHINE`)
  - Distinct IE_NAME prefixes before the first `:`: **1,362** (1,250 with a working extractor)
  - Distinct extractor modules: **922** (831 with a working extractor)
  - Largest modules: zattoo 40 (white-label IPTV brands), bilibili 22, dplay 20, youtube 17, vimeo 12, niconico 11

  — [Local: yt_dlp/extractor/common.py (`description()`)](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/common.py); [Local: yt_dlp/extractor/__init__.py (`list_extractor_classes`)](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/__init__.py)

### Inferences
- About 369 entries (1,731 − 1,362) are colon sub-extractors of the same site (`:playlist`, `:channel`, `:live`, `:tab`…). Grouping by module, about 809 are secondary extractors inside a module.
- Module count still overstates "consumer platforms" in some ways: several modules are embed/CDN handlers such as Brightcove, Kaltura and JW Player. It understates them in others: one module can serve many brands (zattoo has 40 extractors for white-label services).
- **Conservative marketing claim:** "~850+ working site integrations (yt-dlp), excluding broken, hidden, search and generic". Recount at each yt-dlp upgrade with the same script.
- A compliance-first product should expose only an allowlist (e.g., 20–100 platforms with reviewed ToS) via `--ies`, regardless of the raw count.

### Gaps
- The GitHub `master` copy of `supportedsites.md` was not line-counted directly; counts are regenerated from the 2026.11.23 installed code. Master may differ slightly.

---

## 6. FFmpeg: current release, LGPL vs GPL vs non-free, needed encoders/muxers, valid codec/container combos, machine progress, recent CVEs and hardening

### Takeaway
- **Releases:** the latest is **FFmpeg 9.1 "Gauss" (2026-11-20)**. The locally installed BtbN build is 9.0.2 "Lei" (2026-09-18) plus 39 commits. Point releases continue for 8.1.x (8.1.3, 2026-09-21), 8.0.x and 7.1.x.
- **Licensing:** default FFmpeg is LGPL-2.1+. `--enable-gpl` (libx264/x265/xvid, some filters) makes the whole build GPL. BtbN "gpl" builds also set `--enable-version3`, so they are **GPLv3+**. `--enable-nonfree` (fdk-aac) makes a binary **unredistributable**.
- **Containers:** verified locally, WebM accepts only VP8/VP9/AV1 + Vorbis/Opus (+WebVTT). MOV rejects VP9/AV1/Opus. M4A (ipod muxer) rejects Opus. MP4 accepts Opus, VP9, AV1, FLAC and MP3.
- **Hardening:** use `-protocol_whitelist file`, `-nostdin`, `-xerror`, size/time/alloc limits, and OS sandboxing. Many 2026 CVEs are in demuxers, decoders and swscale, which process untrusted bytes.

### Cited Findings
**Releases and maintenance**
- [V-web] The download page lists 9.1 "Gauss" (2026-11-20), 8.1.3 "Hoare" (2026-09-21), 9.0.2 "Lei" (2026-09-18), 5.1.10 and 4.4.8 (2026-06-21), 7.1.5 "Péter" and 6.1.6 (2026-06-20), and 8.0.3 "Huffman" (2026-06-18). FFmpeg ships a major release about every 6 months, with bug-fix point releases in between. The development branch is the only one developers actively work on — [ffmpeg.org/download](https://ffmpeg.org/download.html)
- [V-web] The news section's newest release post is 8.1 "Hoare" (2026-03-16); there are no 9.0/9.1 posts yet. The 8.0 "Huffman" post (2025-08-22) announced contributions via a Forgejo forge at code.ffmpeg.org — [ffmpeg.org news](https://ffmpeg.org/index.html)
- [V-web] The GitHub mirror has 68,014 stars and was last pushed 2026-11-24 — [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-local] Local build: `ffmpeg version n9.0.2-39-g7adfbe40dc-20261031`, gcc 16.2.0. Configure flags include `--enable-gpl --enable-version3 ... --disable-libfdk-aac --enable-schannel`. `ffmpeg -L` prints GPL **version 3** or later — [Local: ffmpeg -version / -L](file:///C:/Users/weeam%20server/AppData/Local/Microsoft/WinGet/Packages/BtbN.FFmpeg.GPL.9.0_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0/bin/ffmpeg.exe)

**BtbN builds**
- [V-web] Variants are **gpl** (all dependencies, including GPL-only), **lgpl** (omits GPL-only libraries, notably libx264 and libx265) and **nonfree** (adds fdk-aac to gpl), each also as `-shared`.
- [V-web] Auto-builds run daily at 12:00 UTC for win64, winarm64, linux64 and linuxarm64. The last 14 dailies are kept, plus the last build of each month for 2 years.
- [V-web] Release-branch add-ins cover 4.4 through 9.0. Windows targets 7+ with UCRT, but the minimum supported is Windows 10 22H2. Linux targets RHEL/CentOS 8+ (glibc 2.28, kernel 4.18). The repo itself is MIT.

  — [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds)
- [V-local] yt-dlp maintains its own FFmpeg builds (yt-dlp/FFmpeg-Builds), which it says are now equivalent to upstream — [Local: yt-dlp README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)

**Licensing**
- [V-web] FFmpeg is LGPL v2.1+. Optional GPL parts, if used, put all of FFmpeg under the GPL. No commercial license is offered. The LGPL checklist:
  - compile without `--enable-gpl` and `--enable-nonfree`
  - link dynamically
  - distribute the matching source, a diff of changes, and the configure options, hosted alongside the binary
  - give attribution in the about box/EULA and on download pages
  - do not claim ownership or ban reverse-engineering
  - keep FFmpeg DLL names unobfuscated

  The legal page also says commercial users may face patent licensing demands for MPEG technologies — [ffmpeg.org/legal](https://ffmpeg.org/legal.html)
- [V-web] LICENSE.md:
  - **GPL-only external libraries** (`--enable-gpl`): avisynth, frei0r, libcdio, libdavs2, librubberband, libvidstab, **libx264, libx265**, libxavs, libxavs2, **libxvid**.
  - **GPL-only internal filters** include delogo, cropdetect, hqdn3d, eq, boxblur, mpdecimate, pullup, stereo3d, tinterlace and others.
  - **`--enable-version3`** covers LGPLv3 (gmp, libaribb24, liblensfun) and Apache-2.0 (mbedTLS, OpenCORE, VisualOn, libastcenc, RK MPI) libraries; libsmbclient needs GPLv3.
  - **Non-free:** Fraunhofer FDK AAC and OpenSSL are listed as incompatible with GPL v2/v3. With `--enable-nonfree` the binary is "unredistributable".

  — [FFmpeg LICENSE.md](https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/LICENSE.md)

**Encoders and muxers in the local GPL build** [V-local] — [Local: ffmpeg -encoders / -muxers](file:///C:/Users/weeam%20server/AppData/Local/Microsoft/WinGet/Packages/BtbN.FFmpeg.GPL.9.0_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0/bin/ffmpeg.exe)
- **Video encoders:**
  - H.264: libx264 (GPL), plus h264_nvenc / h264_qsv / h264_amf; the build also has `--enable-libopenh264`.
  - HEVC: libx265 (GPL).
  - VP8: libvpx. VP9: libvpx-vp9.
  - AV1: libaom-av1, libsvtav1, librav1e.
  - MPEG-4 Part 2: mpeg4 and libxvid (GPL).
- **Audio encoders:** native `aac`, libmp3lame, **libopus** (native `opus` is experimental), **libvorbis** (native `vorbis` is experimental), flac, alac, pcm_s16le. libfdk_aac is **absent**.
- **Subtitle encoders:** srt, webvtt, ass, mov_text.
- **Muxers:** mp4, ipod (.m4a), mov, webm, matroska, avi, mp3, adts (.aac), wav, flac, ogg, oga, opus, mpegts, hls, null.

**Codec/container validity** [V-local] — each combination below was muxed from synthetic `testsrc2`/`sine` signals with FFmpeg n9.0.2 — [Local: ffmpeg mux tests](file:///C:/Users/weeam%20server/AppData/Local/Microsoft/WinGet/Packages/BtbN.FFmpeg.GPL.9.0_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0/bin/ffmpeg.exe)

| Container | Accepted | Rejected (FFmpeg error) |
|---|---|---|
| MP4 | H.264+AAC, H.264+MP3, H.264+FLAC, H.264+ALAC, H.264+PCM, H.264+Vorbis, HEVC+AAC, **VP9+Opus**, **AV1+Opus** | VP8 ("Could not find tag for codec vp8") |
| WebM | VP9+Opus, VP8+Vorbis, AV1+Opus (SVT-AV1 & libaom) | **H.264**, HEVC, AAC ("Only VP8 or VP9 or AV1 video and Vorbis or Opus audio and WebVTT subtitles are supported for WebM") |
| MKV | H.264+AAC, VP9+Opus, HEVC+FLAC, AV1+Opus | none in the test set |
| MOV | H.264+AAC, H.264+MP3, HEVC+ALAC | VP9 ("vp9 only supported in MP4"), AV1 ("av1 only supported in MP4 and AVIF"), Opus ("opus only supported in MP4") |
| AVI | MPEG-4 (Xvid)+MP3, H.264+AAC | VP9+Opus (header write failed) |
| MP3 | libmp3lame | — |
| M4A (ipod) | AAC, ALAC | **Opus** |
| AAC (ADTS) | AAC only | MP3 ("adts muxer supports only codec aac") |
| WAV / FLAC | PCM / FLAC | — |
| OGG | Vorbis, Opus, FLAC | — |
| .opus | Opus (the muxer also accepted Vorbis; the extension is not enforced) | — |

**Machine-readable progress** [V-local]
- `-progress <url>` "write program-readable progress information"; `-stats_period <time>` sets the update period — [Local: ffmpeg -h long](file:///C:/Users/weeam%20server/AppData/Local/Microsoft/WinGet/Packages/BtbN.FFmpeg.GPL.9.0_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0/bin/ffmpeg.exe)
- A `-progress pipe:1` sample emitted `key=value` lines: `frame`, `fps`, `stream_0_0_q`, `bitrate`, `total_size`, `out_time_us`, `out_time_ms`, `out_time`, `dup_frames`, `drop_frames`, `speed`, then `progress=end` (or `continue`). **`out_time_ms` carried the same microsecond value as `out_time_us`** (866667), a naming quirk — [Local: ffmpeg run](file:///C:/Users/weeam%20server/AppData/Local/Microsoft/WinGet/Packages/BtbN.FFmpeg.GPL.9.0_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0/bin/ffmpeg.exe)

**Hardening options present in 9.0.2** [V-local] — [Local: ffmpeg -h full](file:///C:/Users/weeam%20server/AppData/Local/Microsoft/WinGet/Packages/BtbN.FFmpeg.GPL.9.0_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0/bin/ffmpeg.exe)
- Protocol control (per input): `-protocol_whitelist` / `-protocol_blacklist`.
- Process control: `-nostdin`, `-xerror`, `-abort_on`.
- Resource limits:
  - allocation and probing: `-max_alloc <bytes>`, `-max_streams` (default 1000), `-max_probe_packets` (default 2500), `-probesize` (default 5,000,000), `-analyzeduration`
  - I/O: `-rw_timeout`
  - output size and duration: `-fs <bytes>`, `-t` / `-to`, `-timelimit` (CPU-seconds)
  - decoder and threading: `-max_pixels`, `-threads` / `-filter_threads`
- HLS demuxer: `-allowed_extensions`; `-allowed_segment_extensions`, whose **default list includes `html`**; `-extension_picky` (default true).
- DASH demuxer: `-allowed_extensions` (default `aac,m4a,m4s,m4v,mov,mp4,webm,ts`).
- MOV demuxer: `-enable_drefs` (default false) and `-use_absolute_path` (default false; flagged as a possible security issue).
- Concat demuxer: `-safe` (default true).
- The BtbN build compiles in many network input protocols: http(s), rtmp*, srt, rist, sftp, udp, tcp, tls, zmq, ipfs/ipns, gopher and others.

**CVEs (FFmpeg security page and NVD)**
- [V-web] The security page lists CVEs fixed per release:
  - **9.0:** CVE-2026-8461, -12706, -30997, -30998, -30999, -66038, -70629, -70631
  - **8.1.2:** CVE-2026-8461, -30999
  - **8.1:** CVE-2025-12343, CVE-2025-67306, CVE-2025-69693, CVE-2026-30754
  - **8.0.3:** CVE-2026-8461, -30999
  - **8.0.2:** CVE-2025-67306
  - **8.0.1:** CVE-2025-63757, -69693
  - **8.0:** CVE-2024-55069, CVE-2025-0518, -1373, -1594, -1816, -9951, -10256, -12343, -22919, -22920, -22921, -25469, -25471, -25473, -59728…-59734
  - **7.1.2:** CVE-2025-1594, -9951, -59728, -59731, -59732, -59733
  - **7.1.1:** CVE-2025-0518, -1816, -22919
  - **7.1:** CVE-2024-7055, -32228, -32229, -32230, -35368 (rkmpp only), -36615, -36619
- [V-web] At access time the page had **no headings for 9.0.1, 9.0.2, 9.1, 8.1.1, 8.1.3 or 7.1.3–7.1.5**. It asks reporters for hand-verified, reproducible reports, says automated submissions are not accepted, and rejects LLM-generated patches.

  — [ffmpeg.org/security](https://ffmpeg.org/security.html)
- [V-web] NVD, CVEs published 2026-07-27 → 2026-11-24 (186 keyword hits; first ~100k chars read). Selected FFmpeg-core items:
  - **Fixed in 9.0:**
    - CVE-2026-70628 (DVB subtitle parser via crafted WTV, heap overflow; CVSS 7.8)
    - CVE-2026-70632 (CFHD decoder during AVI probing, OOB write; CVSS 7.8)
    - CVE-2026-70629, -70630, -70631 (RSCC, Screenpresso and TIFF decoders leaking uninitialized heap; CVSS 5.5 each)
  - **Fixed by commit, release not stated:** CVE-2026-75146 (DASH demuxer OOB read; CVSS 8.1); CVE-2026-75143 (RIST protocol heap overflow; CVSS 9.8); and muxer/packetizer overflows CVE-2026-75141, -75142, -75144, -75145, -75147.
  - **libswscale/vf_scale DoS bugs** CVE-2026-38343…-38350 (fix not stated).
  - **"Before 9.0":** CVE-2026-52297 (MOV demuxer OOB read) and CVE-2026-52296 (WMA encoder).
  - **CVE-2026-90815** (vf_convolution) is fixed in 4.4.7, 5.1.9, 6.1.5, 7.1.4, 8.0.2, 8.1.1 and 9.0.

  — [NVD API query](https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=FFmpeg&pubStartDate=2026-07-27T00:00:00.000&pubEndDate=2026-11-24T00:00:00.000)
- **Conflict:** NVD cites fixed point releases (7.1.4, 8.0.2, 8.1.1) that the ffmpeg.org security page does not list. The security page lags NVD — [ffmpeg.org/security](https://ffmpeg.org/security.html) vs [NVD API query](https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=FFmpeg&pubStartDate=2026-07-27T00:00:00.000&pubEndDate=2026-11-24T00:00:00.000)

### Inferences
- **Commercial SaaS invoking ffmpeg as a subprocess:**
  - GPL and LGPL obligations attach to *distribution*, and FFmpeg is not AGPL. So running even a GPLv3 build server-side does not impose source obligations on the Node.js code that spawns it.
  - Exec'ing a separate binary with argv is the classic "separate program" pattern, not linking.
- **Shipping inside a Docker image:**
  - If the image is distributed outside the company (customers, on-prem, public registry), that conveys FFmpeg.
  - GPL build: provide the complete corresponding source for FFmpeg and every bundled GPL library, the license texts, and the build configuration.
  - LGPL build: follow the legal-page checklist.
  - Purely internal deployment is generally not distribution.
  - **Never ship nonfree (fdk-aac) builds.**
- **Which build:** if processing is mostly remux (`-c copy`) plus AAC/Opus/MP3/FLAC audio and VP9/AV1 output, an **LGPL build suffices**. Choose GPL only if x264/x265 encoding is required. H.264/HEVC/AAC carry patent-pool exposure for commercial encoding; prefer remux and royalty-free codecs where possible.
- **Hardening recipe for processing downloaded files:**
  - argv: `ffmpeg -nostdin -hide_banner -xerror -protocol_whitelist file -max_alloc <N> -probesize <N> -analyzeduration <N> -i <local-input> ... -fs <cap> -t <cap> -progress pipe:1 -nostats <output>` (add `pipe` to the whitelist only if piping).
  - Run under a non-root UID in a container or namespace **without network**, with cgroup CPU/memory/pids limits, a wall-clock kill timer, read-only root and a tmpfs work dir.
  - Keep HLS/DASH fetching in yt-dlp's native downloader so ffmpeg only touches local files.
  - Track 9.1 or the newest 9.0.x/8.1.x point release.
- **Output-format policy for the product:**
  - MP4: H.264/HEVC/AV1/VP9 + AAC/Opus/MP3.
  - WebM: VP9/AV1/VP8 + Opus/Vorbis only.
  - MKV: anything.
  - MOV: H.264/HEVC + AAC/ALAC/MP3.
  - AVI: legacy (MPEG-4 Part 2 + MP3).
  - Audio files: M4A = AAC/ALAC, AAC = ADTS AAC, MP3, WAV (PCM), FLAC, OGG = Vorbis/Opus/FLAC, OPUS = Opus.
  - Re-encode (`--recode-video` / `-x`) whenever the source codec is not allowed in the requested container.
- Player support for Vorbis-in-MP4 and PCM-in-MP4 is poor even though the muxer accepts them; avoid them.

### Gaps
- The 9.0 major-release date and the 9.1 changelog were not found on ffmpeg.org news.
- Unknown whether 9.0.2 already contains the commit fixes for CVE-2026-75141…-75147.
- BtbN 9.1 branch builds were not confirmed. Which libraries the BtbN `lgpl` variant keeps (e.g., openh264) was not verified.

---

## 7. gallery-dl: license, coverage, JSON output, proxy, galleries/carousels, maintenance

### Takeaway
gallery-dl (**GPL-2.0-only**, Python ≥3.8) is the strongest open-source engine for **image galleries, carousels and multi-image posts**. **v1.32.21 (2026-11-21)** is current, releases come roughly weekly, and **primary development moved to Codeberg** in 2026. Its supported-sites table has about 360 rows, but many are instances of shared engines and many sites are NSFW. Good machine output (`-j`, `-J`, `-K`, `--print`) and proxy support make it a solid secondary engine. Gate it by site allowlist because many extractors rely on cookies or OAuth.

### Cited Findings
- [V-web] PyPI 1.32.21: `requires_python >=3.8`; license GPL-2.0-only (classifier GPLv2); Python 3.8–3.14 classifiers; wheel uploaded 2026-11-21. Dependencies:
  - required: `requests>=2.11.0`
  - extra `video`: yt-dlp
  - extra `extra`: requests[socks], yt-dlp[default], jinja2, pyyaml, toml (<3.11), truststore (≥3.10), secretstorage (Linux)

  — [PyPI gallery-dl 1.32.21 JSON](https://pypi.org/pypi/gallery-dl/1.32.21/json)
- [V-web] Releases run v1.32.14 (2026-09-27) through **v1.32.21 (2026-11-21)**: 8 releases in about 8 weeks. They mostly add sites and domains (e.g., Instagram reposts/highlights, Steam screenshots) and drop dead domains. The v1.32.21 notes point to the Codeberg move — [GitHub API: gallery-dl releases](https://api.github.com/repos/mikf/gallery-dl/releases?per_page=8)
- [V-web] README:
  - Active development has moved to **https://codeberg.org/mikf/gallery-dl**.
  - Optional tools: FFmpeg (Pixiv Ugoira), mkvmerge, PySocks (SOCKS), brotli/zstandard, PyYAML/toml, SecretStorage, Psycopg (PostgreSQL archive), truststore, Jinja.
  - Distribution: standalone `gallery-dl.exe`/`.bin`, Docker images `mikf123/gallery-dl` and `ghcr.io/mikf/gallery-dl` (the `dev` tag is nightly), and Snap, Chocolatey, Scoop, Homebrew, MacPorts and Nix packages.
  - Default config paths include `%APPDATA%\gallery-dl\config.json` and `${XDG_CONFIG_HOME}/gallery-dl/config.json`; later files override earlier ones.

  — [gallery-dl README](https://raw.githubusercontent.com/mikf/gallery-dl/master/README.rst)
- [V-web] Codeberg repo: 591 stars, 118 open issues, 25 open PRs, 9,081 commits, last commit 2026-11-22. GitHub repo: 20,632 stars, 1,541 forks, `open_issues_count` 1,049, last push 2026-11-21 — [Codeberg mikf/gallery-dl](https://codeberg.org/mikf/gallery-dl); [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-web] Options:
  - Output: **`-j, --dump-json`** prints JSON information; `-J, --resolve-json` also resolves intermediary URLs; `-s, --simulate`; `-g/-G` print URLs; `-K, --list-keywords`; `-N/--print`; `--no-download`.
  - Network: **`--proxy`**, `--source-address`, `-a/--user-agent`, `-R/--retries`, `--http-timeout` (default 30.0), `--no-check-certificate`.
  - Cookies: `-C/--cookies`, `--cookies-from-browser`.
  - Config: `-c/--config`, **`--config-ignore`** (do not load default config files), `--config-yaml`.
  - Downloads: `-d/-D` destination; `-f` filename format; `--range`, `--filter` (a Python expression); `-r/--limit-rate`; `--sleep`, `--sleep-request`; `--download-archive`; `--no-part`, `--no-mtime`, `--no-skip`.
  - Post-processing: `--no-postprocessors`, `--exec` / `--exec-after`, `--write-metadata`, `--ugoira`, `--zip`.

  — [gallery-dl docs/options.md](https://raw.githubusercontent.com/mikf/gallery-dl/master/docs/options.md)
- [V-web] JSON message protocol: `-j` output is a list of messages:
  - `[2, {...}]` **Directory**: general metadata for the files that follow
  - `[3, "url", {...}]` **Url**: a file URL and its metadata
  - `[6, "url", {...}]` **Queue**: a URL for another extractor to handle

  Types 1, 4, 5 and 7 are obsolete — [gallery-dl message.py](https://raw.githubusercontent.com/mikf/gallery-dl/master/gallery_dl/extractor/message.py)
- [V-web] Supported sites (`docs/supportedsites.md`, auto-generated by `scripts/supportedsites.py`; note: "Consider all listed sites to potentially be NSFW"):
  - A hand count by the fetch tool found about **220 rows** in the main table and about **138 rows** in grouped instance sections (Danbooru, Gelbooru, Moebooru, Shimmie2, szurubooru, Mastodon, Misskey, Nitter, Wikimedia, XenForo, Shopify, FoolFuuka, "Image Hosting Sites", etc.).
  - Auth: 3 rows say login is "Required" (e.g., Madokami, nijie), about 33 say "Supported", and several use cookies or OAuth (e.g., Instagram, Twitter via cookies; Reddit, Tumblr, Pixiv via OAuth).

  — [gallery-dl supportedsites.md](https://raw.githubusercontent.com/mikf/gallery-dl/master/docs/supportedsites.md)
- [V-web] The GitHub repository security-advisories API returned an **empty list** — [GitHub API: gallery-dl advisories](https://api.github.com/repos/mikf/gallery-dl/security-advisories?per_page=50)

### Inferences
- **Coverage claim:** about 360 table rows, but distinct engines and families are notably fewer. Do not inflate; quote "≈220 named sites + ≈140 instance rows".
- **Fit:** excellent for Instagram/Twitter-X/Reddit/Bluesky/Tumblr/Pinterest/booru-style galleries and carousels. Videos inside galleries can be delegated to yt-dlp (the `video` extra). Its JSON (Directory, Url, Queue) maps cleanly onto a "picker" UI.
- **Licensing:** GPL-2.0-only as a subprocess in SaaS triggers no obligations. Shipping it in a distributed image means GPLv2 source-offer obligations for gallery-dl. Ship it as a separate program (mere aggregation), not imported into proprietary Python.
- **Server hardening:** `--config-ignore`, `--no-postprocessors` unless needed, never `--exec`/`--exec-after`, `--proxy`, per-job `-D`, keep `.part` files (don't pass `--no-part`), and `--range` limits.
- **Supply chain:** the Codeberg move means watching both forges; PyPI is the stable distribution channel.
- **Compliance:** NSFW-heavy coverage and login-dependent extractors call for a strict site allowlist and no cookie or OAuth use on behalf of end-users.

### Gaps
- The exact site-row count is approximate (hand count by the fetch tool).
- No NVD/OSV search for gallery-dl CVEs, only the empty GitHub repository advisories.
- No performance data found.

---

## 8. Streamlink: license, plugin count, livestream recording, limitations

### Takeaway
Streamlink (**BSD-2-Clause**, Python ≥3.10) is the most suitable OSS engine for **recording live HLS/DASH streams**. **8.6.3 (2026-10-29)** is current, it has **132 plugins**, and it carries a small backlog (72 open issues and PRs). It is not a VOD downloader; its YouTube plugin is live-only. 2026 brought **three local-file-read advisories, all fixed by 8.6.2**. The Twitch and Kick plugins rely on browser-based integrity and JS-challenge solving, which a compliance-first product should treat as anti-bot-adjacent.

### Cited Findings
- [V-web] PyPI 8.6.3:
  - `requires_python >=3.10`; license expression **BSD-2-Clause**; classifiers 3.10–3.15; uploaded 2026-10-29.
  - Dependencies: certifi, isodate, lxml (≥5,<8), pycountry, pycryptodome, PySocks, requests (≥2.30), trio, trio-websocket, urllib3 (≥2), websocket-client. Extra `decompress` adds brotli and zstd.

  — [PyPI streamlink 8.6.3 JSON](https://pypi.org/pypi/streamlink/8.6.3/json)
- [V-web] Releases: 8.6.3 (2026-10-29), 8.6.2 (10-07), 8.6.1 (09-16), 8.6.0 (09-13), 8.5.0 (08-01), 8.4.0 (05-06), 8.3.0 (04-10), 8.2.1 (03-05).
  - 8.6.0 added Python 3.15 support and HLS packed audio, and removed plugins (ard_live, piczel, trovo).
  - 8.5.0 hardened the release process (immutable releases, pinned actions, uv lockfile).

  — [GitHub API: streamlink releases](https://api.github.com/repos/streamlink/streamlink/releases?per_page=8)
- [V-web] Repo: 11,995 stars, 1,217 forks, `open_issues_count` 72, last push 2026-11-18 — [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-web] The plugins page lists **132 plugins**; the extracted list was re-counted locally.
  - Examples: twitch, youtube, kick, bilibili, douyin, huya, tiktok, dailymotion, vimeo, vk, okru, pluto, zattoo, bbciplayer, ard_mediathek, zdf_mediathek, nrk, svtplay, rtve, raiplay, abematv, nicolive, soop, chzzk, and platform providers such as brightcove, mdstrm, streann and mediavitrina.
  - **youtube** is live-only; the page says VOD and protected videos are not supported.
  - **twitch** (live + VOD) needs a web browser to obtain a client-integrity token.
  - **kick** (live + VOD) needs a web browser to solve a JS challenge.
  - 8 plugins require an account (clubbingtv, nicolive, piaulizaportal, steam, tf1, ustvnow, wwenetwork, yupptv).
  - tvp notes geo-restriction.

  — [Streamlink plugins](https://streamlink.github.io/plugins.html)
- [V-web] CLI:
  - Output: `-o/--output` writes stream data to a file instead of playing it; `-r/--record` writes while playing; `--stdout`; `-j/--json`.
  - Retries: `--retry-streams`, `--retry-max`.
  - HLS: `--hls-live-edge`; `--hls-live-restart` (start of stream or as far back as possible); `--hls-start-offset`; `--stream-segmented-duration` limits HLS/DASH output duration.
  - `--stream-passthrough-encrypted` passes encrypted data through **without decryption** (warned to "likely result in garbage output").
  - Network: `--http-proxy` (HTTP, HTTPS and WebSocket), `--interface`, `-4/-6`.
  - FFmpeg: `--ffmpeg-ffmpeg`, `--ffmpeg-copyts`, `--ffmpeg-fout`, `--ffmpeg-no-validation`.
  - Plugins and config: `--plugin-dir`, `--no-plugin-sideloading`, `--no-config`.
  - Twitch: `--twitch-force-client-integrity`, `--twitch-purge-client-integrity`.
  - No DRM support statement appears on the CLI page.

  — [Streamlink CLI](https://streamlink.github.io/cli.html)
- [V-web] Security advisories (3 total):
  - **GHSA-hgqw-6m45-hw5f / CVE-2026-44353**: file:// URIs in HLS/DASH segments allow local file read; ≤8.3.0, fixed **8.4.0**.
  - **GHSA-vf2x-4v53-pm7v / CVE-2026-92164**: HTTP redirects into file:// URLs; ≤8.5.0, fixed **8.6.0**. 8.6.0 also fixed insecure HTTPS→HTTP redirects.
  - **GHSA-j7pf-m7gx-jr33** (no CVE): DASH `<Location>` bypasses the scheme check; ≤8.6.1, fixed **8.6.2**.
  - 8.6.3 bumped brotli to 1.2.1 in the Windows/AppImage builds (CVE-2026-111497).

  — [GitHub API: streamlink advisories](https://api.github.com/repos/streamlink/streamlink/security-advisories?per_page=50); [GitHub API: streamlink releases](https://api.github.com/repos/streamlink/streamlink/releases?per_page=8)

### Inferences
- **Fit:** use Streamlink only for a "record live stream" feature. yt-dlp also offers `--live-from-start` for YouTube, Twitch, TVer and mellow-fan, plus `--wait-for-video`, so a second engine may be unnecessary for a small allowlist.
- **Hardening:** pin ≥ 8.6.3, `--no-config`, `--no-plugin-sideloading`, `--stream-segmented-duration` caps, `-o` into a per-job dir, `--http-proxy` for egress control, and kill on byte or time caps.
- **Compliance:** avoid or disable the browser-challenge flows (Twitch client-integrity, Kick JS challenge) in a compliance-first configuration, and never use `--stream-passthrough-encrypted`. Treat a protected stream as unsupported.
- **License:** BSD-2-Clause is permissive; keep the copyright notice when distributing.

### Gaps
- Whether individual plugins can be disabled without forking was not verified.
- No performance or concurrency data.
- The plugin count relies on the extracted list (re-counted locally at 132).

---

## 9. Cobalt (imputnet/cobalt): license, services, public-instance terms, architecture, maintenance, YouTube status

### Takeaway
- **License and terms:** the Cobalt **API is AGPL-3.0**, but the **web frontend is CC-BY-NC-SA-4.0 (non-commercial)** and the branding is not licensed. Hosted instances such as `api.cobalt.tools` are **not to be used by other projects without explicit permission**.
- **Maintenance:** the repo has been **dormant since 2026-04-06** (v11.7 / api 11.7.1). An open issue (2026-11-17) asks to archive it, and YouTube complaints sit unanswered.
- **Compliance flags:** its YouTube path depends on youtubei.js plus an optional **poToken session generator**, and an optional **per-download random IPv6 (freebind)**. Both are anti-bot or rate-limit-evasion features.
- **Verdict:** use Cobalt as an architectural reference, not as an embedded engine.

### Cited Findings
- [V-web] Root README:
  - The monorepo holds `/api/`, `/web/` and `/packages/`. The API and web licenses are given in their own READMEs; everything else is AGPL-3.0.
  - Cobalt describes itself as never caching content and working like a "fancy proxy".
  - It states it is no piracy tool and can only download free and publicly accessible content, and that users are responsible for their downloads.

  — [cobalt README](https://raw.githubusercontent.com/imputnet/cobalt/main/README.md)
- [V-web] api/README:
  - The **Cobalt API is AGPL-3.0**, with credit, license-link and same-license conditions.
  - **21 services**: Bilibili, Bluesky, Dailymotion, Facebook (public videos only), Instagram, Loom, Newgrounds, ok.ru, Pinterest, Reddit, Rutube, Snapchat, SoundCloud (audio), Streamable, TikTok, Tumblr, Twitch Clips, Twitter/X ("may not be 100% reliable"), Vimeo, VK, YouTube (videos, music, Shorts, up to 8K/HDR, h264/AV1/VP9).
  - It relies on FFmpeg via `ffmpeg-static`.
  - The fetch summary also states there is no publicly available pre-hosted API for third parties.

  — [cobalt api/README](https://raw.githubusercontent.com/imputnet/cobalt/main/api/README.md)
- [V-web] web/README: **CC-BY-NC-SA-4.0**, no commercial use. Branding and mascots are copyrighted and not covered by the license. Only unmodified non-commercial hosting with branding is allowed; forks must remove the branding — [cobalt web/README](https://raw.githubusercontent.com/imputnet/cobalt/main/web/README.md)
- [V-web] API:
  - Auth is `Authorization: Api-Key <key>` or a `Bearer` JWT. JWTs are issued via `POST /session` after a Cloudflare **Turnstile** solve.
  - `POST /` takes `url` (required) plus options:
    - `videoQuality` (default 1080; up to `max`/4320)
    - `audioFormat` (default mp3; best/ogg/wav/opus), `audioBitrate`
    - `downloadMode` (auto/audio/mute), `filenameStyle`
    - `localProcessing` (disabled/preferred/forced), `subtitleLang`
    - `youtubeVideoCodec` (h264/av1/vp9), `youtubeVideoContainer`, `youtubeDubLang`, `youtubeBetterAudio`, `youtubeHLS`
    - `allowH265`, `tiktokFullAudio`, `convertGif`, `alwaysProxy`, `disableMetadata`
  - Response statuses: `tunnel`, `redirect`, `local-processing`, `picker`, `error`.
  - `GET /` returns instance info and the service list; it is the only endpoint without a rate limit.
  - Hosted instances like `api.cobalt.tools` are **not intended for other projects without explicit permission**.

  — [cobalt docs/api.md](https://raw.githubusercontent.com/imputnet/cobalt/main/docs/api.md)
- [V-web] Environment variables (defaults):
  - Rate limits: `RATELIMIT_MAX` 20 per 60 s; `SESSION_RATELIMIT_MAX` 10 per 60 s; `TUNNEL_RATELIMIT_MAX` 40 per 60 s.
  - Limits and access: `DURATION_LIMIT` 10800 s; `TUNNEL_LIFESPAN` 90 s; `CORS_WILDCARD` 1 (allow any site).
  - Auth: `API_AUTH_REQUIRED`, `API_KEY_URL`, `TURNSTILE_SITEKEY`/`TURNSTILE_SECRET`, `JWT_SECRET`/`JWT_EXPIRY` (120 s).
  - Networking: `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`; **`FREEBIND_CIDR`**, a random IPv6 per download (Linux).
  - Scaling: `API_REDIS_URL`; `API_INSTANCE_COUNT` (Linux, Node ≥23.1.0).
  - Operations: `COOKIE_PATH`, `DISABLED_SERVICES`, `PROCESSING_PRIORITY` (nice for ffmpeg), `FORCE_LOCAL_PROCESSING`.
  - YouTube: `CUSTOM_INNERTUBE_CLIENT`; **`YOUTUBE_SESSION_SERVER`** (a yt-session-generator supplying `poToken` and `visitor_data`); `YOUTUBE_SESSION_INNERTUBE_CLIENT`; `YOUTUBE_ALLOW_BETTER_AUDIO`; `YOUTUBE_PLAYER_ID`; `ENABLE_DEPRECATED_YOUTUBE_HLS`.

  — [cobalt docs/api-env-variables.md](https://raw.githubusercontent.com/imputnet/cobalt/main/docs/api-env-variables.md)
- [V-web] Running an instance: Docker Compose is recommended (from `examples/docker-compose.example.yml`, auto-updated by Watchtower), with an optional `cookies.json`. Public instances should sit behind a reverse proxy and be protected with Turnstile, API keys or both. Running outside Docker needs Node.js 18+ and pnpm. On Ubuntu 22.04, `ffmpeg-static` needs `nscd` for DNS — [cobalt docs/run-an-instance.md](https://raw.githubusercontent.com/imputnet/cobalt/main/docs/run-an-instance.md)
- [V-web] `api/package.json`: `@imput/cobalt-api` **11.7.1**, AGPL-3.0, `engines.node >=18.17`, ESM.
  - Dependencies include express, express-rate-limit, undici, **youtubei.js 17.0.1**, **isolated-vm**, **ffmpeg-static**, hls-parser, zod and nanoid.
  - Optional dependencies: freebind, redis 4.7.1, rate-limit-redis.

  — [cobalt api/package.json](https://raw.githubusercontent.com/imputnet/cobalt/main/api/package.json)
- [V-web] Maintenance:
  - The latest commits are all from 2026-04-06 ("update: cobalt 11.7", dependency bumps, VK endpoint fix, Redis revert).
  - On 2026-03-30 Xiaohongshu support was removed.

  — [GitHub API: cobalt commits](https://api.github.com/repos/imputnet/cobalt/commits?per_page=12)
- [V-web] The GitHub Releases API returns an empty list (versions are tags/commits only) — [GitHub API: cobalt releases](https://api.github.com/repos/imputnet/cobalt/releases?per_page=8)
- [V-web] Repo: 47,054 stars, 4,231 forks, `open_issues_count` 296, last push 2026-04-06 — [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-web] Issues and PRs created since 2026-05-01 that mention YouTube: 14 results.
  - #1626 (2026-11-17), "Request to archive the project", cites 230+ issues and 50+ open PRs.
  - Reports of YouTube failures (#1560), API errors on self-hosted instances (#1562), and a 1080p cap on the main instance (#1570).
  - Unmerged YouTube PRs: #1581, #1594, #1607, and **#1613**, which proposes replacing youtubei.js with a vendored "ytubedl engine".
  - An SSRF report (#1573) was closed "not planned".
  - No maintainer replies were visible in the sample.

  — [GitHub API: cobalt issue search](https://api.github.com/search/issues?q=repo:imputnet/cobalt+youtube+created:>2026-05-01&sort=created&order=desc&per_page=20)
- [V-web] Advisories: 1 — **GHSA-cm4c-v4cm-3735 / CVE-2024-51498**, XSS in cobalt-web via a picker item from a malicious instance; <10.2.1, fixed **10.2.1** — [GitHub API: cobalt advisories](https://api.github.com/repos/imputnet/cobalt/security-advisories?per_page=50)
- Third-party 2026 articles claim YouTube via the main instance has become unreliable. These are low-quality, vendor-written sources that sell competing tools, so treat them as unverified — [Wondershare article](https://repairit.wondershare.com/online-video/cobalt-tools-alternative.html)

### Inferences
- **AGPL implications:**
  - Running the unmodified API as a separate service and calling it over HTTP from your Express API keeps your code separate.
  - If you **modify** the API and users interact with it over the network, AGPL §13 requires offering them the modified source.
  - Importing Cobalt modules into your proprietary worker would extend the AGPL to that combined work.
  - The CC-BY-NC-SA web UI cannot be used commercially at all.
- **Not recommended as an engine:** the dormant upstream, an unmerged YouTube backlog, reliance on poToken generation and IP-rotation features (non-compliant by design for this product), and a narrower 21-service scope versus yt-dlp.
- **Reusable design patterns:** the tunnel/redirect/picker response model, short-lived tunnel IDs, no content caching, per-IP rate limits and a duration limit.

### Gaps
- No first-party statement on the current YouTube status of the official instance; only community issues and vendor articles.
- The Docker image name and tag were not verified.
- Unclear whether the API README's "no public pre-hosted API" wording reflects current policy, versus docs/api.md's "not intended for other projects without permission" (both cited).

---

## 10. Other alternatives: you-get, lux, aria2, and 2025–2026 newcomers

### Takeaway
**None of these is a production-grade replacement for yt-dlp.**
- you-get (MIT): last release 2025-01-04; Chinese-platform focus; unstable JSON.
- lux (MIT, Go): last release 2024-05-06; 45 sites; no `--proxy` flag.
- aria2 (GPL-2.0): last release 2023-11-15, with **three unpatched 2026 CVEs** in 1.37.0. It also starred in yt-dlp's CVE-2026-50574.
- The 2025–2026 wave is mostly **GUIs and wrappers around yt-dlp + FFmpeg**. No new standalone engine of note has emerged.

### Cited Findings
**you-get**
- [V-web] Latest **v0.4.1743 (2025-01-04)**, a YouTube extraction fix; earlier v0.4.1730 (2024-08-19). The repo is still pushed (2026-11-15) but has made no release since — [GitHub API: you-get releases](https://api.github.com/repos/soimort/you-get/releases?per_page=4); [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-web] Repo: 56,849 stars, 9,646 forks, 382 open. GitHub license detection says NOASSERTION; the README says **MIT** — [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg); [you-get README](https://raw.githubusercontent.com/soimort/you-get/develop/README.md)
- [V-web] README:
  - Python 3.7.4+ recommended; FFmpeg recommended for merging and ≥1080p YouTube.
  - **77 supported-site rows**, mostly Chinese platforms.
  - `--json` output schema is "not stabilized".
  - Options: `-i` info, `-x/--http-proxy`, `-c/--cookies` (sqlite or Netscape), `-o` output dir.

  — [you-get README](https://raw.githubusercontent.com/soimort/you-get/develop/README.md)

**lux (formerly annie)**
- [V-web] Latest **v0.24.1 (2024-05-06)**, a Go 1.22 bump; earlier v0.24.0 (2024-04-22). Repo: 31,857 stars, 547 open, MIT, Go, last push 2026-03-29 — [GitHub API: lux releases](https://api.github.com/repos/iawia002/lux/releases?per_page=4); [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-web] README:
  - **45 supported sites**, e.g. Douyin, Bilibili, Youku, YouTube, Instagram, Twitter, TikTok, Reddit, VK, Rumble.
  - FFmpeg is required for merging.
  - Options: `-j` JSON, `-i` info, `-c` cookies, `-p` playlist, `-f` stream. **No `--proxy` flag**; it honours the `HTTP_PROXY` env var instead.
  - A known issue: Youku `ccode` changes break it.

  — [lux README](https://raw.githubusercontent.com/iawia002/lux/master/README.md)

**aria2**
- [V-web] Latest **release-1.37.0 (2023-11-15)**, which included memory-safety fixes. Earlier: 1.36.0 (2021-08-21). Repo: GPL-2.0 per GitHub, C++, 43,598 stars, 1,188 open, last push 2026-06-25. It supports HTTP/HTTPS, FTP, SFTP, BitTorrent and Metalink — [GitHub API: aria2 releases](https://api.github.com/repos/aria2/aria2/releases?per_page=4); [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-web] NVD, published after 2023-11-24:
  - **CVE-2026-8367** (2026-05-13, 5.3): accepts server certificates with the wrong Extended Key Usage. Range ≤1.37.0; the NVD entries are internally inconsistent on whether 1.37.0 is included.
  - **CVE-2026-71832** (2026-08-24, 6.2): divide-by-zero in `bittorrent_helper.cc` (DoS), ≤1.37.0.
  - **CVE-2026-75421** (2026-08-25, 4.0): stack-buffer-underflow in `IOFile::getLine()`, ≤1.37.0.
  - The same query surfaces yt-dlp's CVE-2026-50574 (aria2c option injection via yt-dlp).

  — [NVD API: aria2](https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=aria2)

**2025–2026 newcomers** (GitHub repos created after 2025-01-01 with >800 stars matching "downloader"; descriptions paraphrased)
- [V-web] Results:
  - **omniget**: GPL-3.0, Rust, 14,594 stars, created 2026-02-11. A local MCP server giving AI agents access to the machine and logged-in accounts; also downloads video, music and *purchased courses*.
  - **reclip**: MIT, 11,251 stars. A self-hosted web UI.
  - **VidBee**: MIT, TypeScript, 11,203 stars. A desktop app claiming 1000+ sites (yt-dlp topics).
  - **yubal**: MIT, a YouTube Music downloader/syncer.
  - **Downvid**, **youwee**, **hometube**: yt-dlp/FFmpeg GUIs or wrappers.
  - **Fluent-M3U8**: GPL-3.0, an m3u8/MPD GUI.

  — [GitHub search API: new downloaders](https://api.github.com/search/repositories?q=downloader+in:name,description,topics+created:>2025-01-01+stars:>800&sort=stars&order=desc&per_page=30)
- [V-web] Native re-implementations are tiny. `ytget/ytdlp` (MIT, Go, 8 stars, created 2025-08-19) is a "native Go library", initially for progressive formats only. Most "ytdlp-go" repos are thin wrappers around the yt-dlp CLI (e.g., `lrstanley/go-ytdlp`, 331 stars) — [GitHub search API: ytdlp-go](https://api.github.com/search/repositories?q=ytdlp-go+OR+%22yt-dlp+in+go%22+OR+%22yt-dlp+rewrite%22&sort=stars&per_page=10)
- A web search surfaced claims of a Go reimplementation ("ytdlp-go", behind a desktop app "VidStow") and a GUI "Deviload" (first released September 2026). Neither was verified against a repository. This is a low-confidence aggregator source — [opensourcealternatives.to: Deviload](https://www.opensourcealternatives.to/item/deviload)

### Inferences
- **you-get and lux:** keep them out of production (stale releases, narrow or regional coverage, weak machine interfaces). Their only edge, some Chinese platforms, is mostly covered by yt-dlp extractors (bilibili alone has 22).
- **aria2:** it no longer adds enough value to justify the risk. The last release is three years old, it has unpatched 2026 CVEs including TLS validation, and yt-dlp integrations have produced RCE-class bugs. yt-dlp's native downloader with `-N` concurrency covers HLS/DASH, and plain HTTP is rarely the bottleneck.
- **Newcomers:** front-ends, not engines. omniget and yubal raise red flags for a compliance-first product (logged-in account access and purchased content; music-service ripping).
- **Node-native alternative to watch:** `youtubei.js`, which Cobalt uses (MIT per general knowledge; not verified this session). It is single-platform and needs the same anti-bot workarounds.

### Gaps
- No CVE search for you-get or lux.
- aria2's OpenSSL linking exception was not re-verified.
- The newcomer list covers only the first 19 of 30 search results (truncated).
- No stars or activity data for the unverified "ytdlp-go/VidStow".

---

## 11. Tools and features to AVOID because their purpose includes DRM decryption or anti-bot circumvention

### Takeaway
Exclude:
- **N_m3u8DL-RE**: it decrypts DRM'd DASH/HLS/MSS given keys.
- **Impersonation tooling**: yt-dlp `--impersonate` via curl_cffi/curl-impersonate. Leave curl_cffi uninstalled, because 21 yt-dlp extractors will use it automatically if present.
- **PO-token / BotGuard session generators**: yt-dlp PoT provider plugins, Cobalt's `YOUTUBE_SESSION_SERVER`.
- **IP-rotation and geo-spoofing features**: Cobalt `FREEBIND_CIDR`, yt-dlp `--xff`/`--geo-verification-proxy`.
- **Ad-gate skipping**: YouTube `use_ad_playback_context`.
- **Browser-challenge solving flows**: Streamlink Twitch/Kick.
- **yt-dlp's hidden `--allow-unplayable-formats`**.

Treat all of these as **explicitly prohibited configuration**, not just "unused".

### Cited Findings
- [V-web] **N_m3u8DL-RE** (MIT, C#; 9,120 stars; pushed 2026-11-23; README mentions 0.6.0 / 20261012) supports DASH, HLS and MSS. Decryption features:
  - `--key KID:KEY` (repeatable) and `--key-text-file`
  - `--decryption-engine` MP4DECRYPT (default), SHAKA_PACKAGER or FFMPEG, plus `--decryption-binary-path`
  - `--mp4-real-time-decryption`
  - `--custom-hls-method/-key/-iv/-scope`
  - live-recording options

  The README disclaimer frames it as for learning/research only and puts legal responsibility on users — [N_m3u8DL-RE README](https://raw.githubusercontent.com/nilaoda/N_m3u8DL-RE/main/README.md); [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg)
- [V-local] yt-dlp impersonation: the README says curl_cffi provides Chrome, Edge and Safari targets, "may be required" for sites using TLS fingerprinting. 21 extractor modules request it automatically when available — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA); [Local: extractor tree](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/extractor/)
- [V-local] yt-dlp YouTube extractor-args:
  - `po_token`, `fetch_pot` and `pot_trace` handle Proof-of-Origin tokens; some clients need a PO token for downloadable formats.
  - `use_ad_playback_context` skips preroll ads to avoid the mandatory wait.

  — [Local: README](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp-2026.11.23.dist-info/METADATA)
- [V-local] `--xff` exists to fake X-Forwarded-For and bypass geo-restriction. `--allow-unplayable-formats` is a hidden developer option — [Local: yt-dlp --help](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Scripts/yt-dlp.exe); [Local: options.py](file:///C:/Users/weeam%20server/Documents/download-link/.venv/Lib/site-packages/yt_dlp/options.py)
- [V-web] Cobalt: `YOUTUBE_SESSION_SERVER` supplies `poToken` and `visitor_data` from a yt-session-generator. `FREEBIND_CIDR` picks a random IPv6 per download — [cobalt docs/api-env-variables.md](https://raw.githubusercontent.com/imputnet/cobalt/main/docs/api-env-variables.md)
- [V-web] Streamlink: Twitch requires a web browser for a client-integrity token, and Kick requires a browser to solve a JS challenge — [Streamlink plugins](https://streamlink.github.io/plugins.html)
- [V-web] omniget's description includes access to logged-in accounts and downloading purchased courses — [GitHub search API: new downloaders](https://api.github.com/search/repositories?q=downloader+in:name,description,topics+created:>2025-01-01+stars:>800&sort=stars&order=desc&per_page=30)

### Inferences
- **Make the policy enforceable in code:** the worker should build argv from an allowlisted option set and reject any of:
  - `--impersonate`, `--allow-unplayable-formats`, `--cookies-from-browser`, `--xff` (other than `never`), `--geo-verification-proxy`
  - `--extractor-args` containing `po_token`, `fetch_pot`, `use_ad_playback_context` or `impersonate`
  - `--exec`, `--netrc-cmd`, `--write-*link`, compat `allow-unsafe-*`, `--remote-components`

  The container image should not contain curl_cffi, PoT-provider plugins, mp4decrypt/shaka-packager, N_m3u8DL-RE, or Widevine/PlayReady CDM tooling.
- **Consistency:** Deno for yt-dlp-ejs solves YouTube's *JavaScript signature/n-parameter challenges*, which yt-dlp needs for normal playback URLs. It is distinct from minting BotGuard PO tokens, but product/legal should still review the ToS of each allowlisted platform (out of scope here).
- **Other categories to exclude (general knowledge, not individually verified this session):** Widevine CDM/key tooling, DRM'd music-service rippers, and paywall bypassers.

### Gaps
- No exhaustive survey of DRM-decryption tools was performed; only N_m3u8DL-RE was verified directly.

---

## 12. Cross-engine summary matrix and suitability verdicts (commercial, compliance-first SaaS)

### Takeaway
**Recommended stack:**
- **yt-dlp 2026.11.23** (pip-installed, without curl-cffi, with Deno for EJS) as the primary extractor.
- **FFmpeg** as the processor: an LGPL build if no x264/x265 encoding is needed, otherwise a GPL build; never nonfree. Track 9.1 / latest 9.0.x.
- **gallery-dl** for image galleries and carousels.
- Optionally **Streamlink ≥ 8.6.3** for live recording.

**Avoid:** Cobalt (licensing, dormancy and anti-bot features), you-get and lux (stale), aria2 (unpatched CVEs), and N_m3u8DL-RE (DRM decryption).

### Cited Findings

Sources: per-row citations are in sections 1–11. Repo stats come from the [GitHub search API](https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg). In the Security column, "advisories" means GitHub security advisories. Lines starting with "Inference:" are my assessment, not sourced facts.

**yt-dlp**
- **License:** Unlicense.
- **Latest release:** 2026.11.23 (2026-11-23).
- **Runtime:** Python ≥3.11; JS runtime for YouTube (Deno ≥2.3 / Node ≥22).
- **Coverage:** 1,731 supportedsites entries; 136 broken; 1,362 name families; 922 modules.
- **Activity:** 210,249 stars; about 10 releases in 2026; ~2.1k open issues + 701 PRs.
- **Security (3 years):** 10 advisories in the window (13 in total); latest fix 2026.07.04.
- Inference — subprocess in SaaS: no obligations. Shipping in Docker: no obligations for yt-dlp itself, but bundled deps (mutagen GPLv2+, certifi MPL-2.0) carry their own terms.
- Inference — verdict: **Use (primary)** with hardening.

**FFmpeg**
- **License:** LGPL-2.1+ by default; GPL with `--enable-gpl`; BtbN gpl builds are GPLv3+; nonfree builds are unredistributable.
- **Latest release:** 9.1 (2026-11-20); local 9.0.2 (2026-09-18).
- **Runtime:** C; native binary.
- **Coverage:** not applicable (processor).
- **Activity:** about 6-monthly majors plus point releases; daily BtbN builds.
- **Security (3 years):** dozens of CVEs (security page, NVD); 9.0 fixes 8 listed CVEs.
- Inference — subprocess in SaaS: no obligations (not AGPL). Shipping in Docker: GPLv3 or LGPL source obligations when distributed; never nonfree.
- Inference — verdict: **Use (required)**; sandbox with no network; protocol whitelist.

**gallery-dl**
- **License:** GPL-2.0-only.
- **Latest release:** v1.32.21 (2026-11-21).
- **Runtime:** Python ≥3.8; optional yt-dlp and FFmpeg.
- **Coverage:** about 220 site rows + about 138 instance rows.
- **Activity:** weekly releases; dev moved to Codeberg; 20.6k GitHub stars.
- **Security (3 years):** 0 GitHub advisories.
- Inference — subprocess in SaaS: no obligations. Shipping in Docker: GPLv2 source offer when distributed.
- Inference — verdict: **Use (secondary, galleries)** with a site allowlist.

**Streamlink**
- **License:** BSD-2-Clause.
- **Latest release:** 8.6.3 (2026-10-29).
- **Runtime:** Python ≥3.10.
- **Coverage:** 132 plugins (live-focused).
- **Activity:** about monthly releases; 72 open issues/PRs; 12.0k stars.
- **Security (3 years):** 3 advisories in 2026 (local file read), fixed by 8.6.2.
- Inference — subprocess in SaaS and shipping in Docker: permissive (keep the notice).
- Inference — verdict: **Optional (live recording only)**; disable browser-challenge plugins.

**Cobalt**
- **License:** API AGPL-3.0; web CC-BY-NC-SA-4.0; branding reserved.
- **Latest release:** 11.7 / api 11.7.1 (2026-04-06 commits; no GitHub releases).
- **Runtime:** Node.js ≥18.17; youtubei.js; isolated-vm; ffmpeg-static.
- **Coverage:** 21 services.
- **Activity:** dormant since 2026-04-06; archive-request issue open; 47.1k stars.
- **Security (3 years):** CVE-2024-51498 (web XSS), fixed 10.2.1.
- Inference — subprocess in SaaS: AGPL §13 applies if modified. Shipping in Docker: AGPL; web UI unusable commercially.
- Inference — verdict: **Avoid** (reference only).

**you-get**
- **License:** MIT (per README).
- **Latest release:** v0.4.1743 (2025-01-04).
- **Runtime:** Python 3.7.4+.
- **Coverage:** 77 site rows (mostly China).
- **Activity:** still pushed; no release in 22 months.
- **Security (3 years):** not checked.
- Inference — subprocess in SaaS and shipping in Docker: permissive.
- Inference — verdict: **Avoid**.

**lux**
- **License:** MIT.
- **Latest release:** v0.24.1 (2024-05-06).
- **Runtime:** Go.
- **Coverage:** 45 sites.
- **Activity:** last push 2026-03-29.
- **Security (3 years):** not checked.
- Inference — subprocess in SaaS and shipping in Docker: permissive.
- Inference — verdict: **Avoid**.

**aria2**
- **License:** GPL-2.0.
- **Latest release:** 1.37.0 (2023-11-15).
- **Runtime:** C++.
- **Coverage:** not applicable (generic downloader).
- **Activity:** last push 2026-06-25; no release in 3 years.
- **Security (3 years):** 3 CVEs in 2026, unpatched in any release; plus yt-dlp CVE-2026-50574.
- Inference — subprocess in SaaS: no obligations. Shipping in Docker: GPLv2 source offer when distributed.
- Inference — verdict: **Avoid**.

**N_m3u8DL-RE**
- **License:** MIT.
- **Latest release:** README mentions 0.6.0 (20261012).
- **Runtime:** C# / .NET.
- **Coverage:** not applicable (DASH/HLS/MSS).
- **Activity:** active (pushed 2026-11-23).
- **Security (3 years):** not checked.
- Inference — licensing is irrelevant here.
- Inference — verdict: **Prohibit** (DRM decryption features).

#### Source log (every URL accessed 2026-11-24)
- yt-dlp:
  - https://github.com/yt-dlp/yt-dlp
  - https://github.com/yt-dlp/yt-dlp/releases
  - https://api.github.com/repos/yt-dlp/yt-dlp/releases/tags/2026.10.21
  - https://github.com/yt-dlp/yt-dlp/security/advisories
  - https://api.github.com/repos/yt-dlp/yt-dlp/security-advisories?per_page=100
  - https://github.com/yt-dlp/yt-dlp/wiki/EJS
  - https://pypi.org/pypi/yt-dlp-ejs/json
- Repo stats (one query):
  - https://api.github.com/search/repositories?q=repo:yt-dlp/yt-dlp+repo:mikf/gallery-dl+repo:streamlink/streamlink+repo:imputnet/cobalt+repo:soimort/you-get+repo:iawia002/lux+repo:aria2/aria2+repo:nilaoda/N_m3u8DL-RE+repo:yt-dlp/ejs+repo:BtbN/FFmpeg-Builds+repo:FFmpeg/FFmpeg
- FFmpeg:
  - https://ffmpeg.org/download.html
  - https://ffmpeg.org/security.html
  - https://ffmpeg.org/legal.html
  - https://ffmpeg.org/index.html
  - https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/LICENSE.md
  - https://github.com/BtbN/FFmpeg-Builds
  - https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=FFmpeg&pubStartDate=2026-07-27T00:00:00.000&pubEndDate=2026-11-24T00:00:00.000
- gallery-dl:
  - https://api.github.com/repos/mikf/gallery-dl/releases?per_page=8
  - https://raw.githubusercontent.com/mikf/gallery-dl/master/README.rst
  - https://raw.githubusercontent.com/mikf/gallery-dl/master/docs/supportedsites.md
  - https://raw.githubusercontent.com/mikf/gallery-dl/master/docs/options.md
  - https://raw.githubusercontent.com/mikf/gallery-dl/master/gallery_dl/extractor/message.py
  - https://pypi.org/pypi/gallery-dl/1.32.21/json
  - https://codeberg.org/mikf/gallery-dl
  - https://api.github.com/repos/mikf/gallery-dl/security-advisories?per_page=50
- Streamlink:
  - https://api.github.com/repos/streamlink/streamlink/releases?per_page=8
  - https://streamlink.github.io/plugins.html
  - https://streamlink.github.io/cli.html
  - https://pypi.org/pypi/streamlink/8.6.3/json
  - https://api.github.com/repos/streamlink/streamlink/security-advisories?per_page=50
- Cobalt:
  - https://raw.githubusercontent.com/imputnet/cobalt/main/README.md
  - https://raw.githubusercontent.com/imputnet/cobalt/main/api/README.md
  - https://raw.githubusercontent.com/imputnet/cobalt/main/web/README.md
  - https://raw.githubusercontent.com/imputnet/cobalt/main/docs/api.md
  - https://raw.githubusercontent.com/imputnet/cobalt/main/docs/run-an-instance.md
  - https://raw.githubusercontent.com/imputnet/cobalt/main/docs/api-env-variables.md
  - https://raw.githubusercontent.com/imputnet/cobalt/main/api/package.json
  - https://api.github.com/repos/imputnet/cobalt/commits?per_page=12
  - https://api.github.com/repos/imputnet/cobalt/releases?per_page=8
  - https://api.github.com/search/issues?q=repo:imputnet/cobalt+youtube+created:>2026-05-01&sort=created&order=desc&per_page=20
  - https://api.github.com/repos/imputnet/cobalt/security-advisories?per_page=50
  - https://repairit.wondershare.com/online-video/cobalt-tools-alternative.html (low-quality vendor source)
- Others:
  - https://api.github.com/repos/soimort/you-get/releases?per_page=4
  - https://raw.githubusercontent.com/soimort/you-get/develop/README.md
  - https://api.github.com/repos/iawia002/lux/releases?per_page=4
  - https://raw.githubusercontent.com/iawia002/lux/master/README.md
  - https://api.github.com/repos/aria2/aria2/releases?per_page=4
  - https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=aria2
  - https://raw.githubusercontent.com/nilaoda/N_m3u8DL-RE/main/README.md
  - https://api.github.com/search/repositories?q=downloader+in:name,description,topics+created:>2025-01-01+stars:>800&sort=stars&order=desc&per_page=30
  - https://api.github.com/search/repositories?q=ytdlp-go+OR+%22yt-dlp+in+go%22+OR+%22yt-dlp+rewrite%22&sort=stars&per_page=10
  - https://www.opensourcealternatives.to/item/deviload (search snippet only; low confidence)
- Local artifacts (2026-11-24):
  - `C:\Users\weeam server\Documents\download-link\.venv\Scripts\yt-dlp.exe` and `.venv\Lib\site-packages\yt_dlp\**`
  - `yt_dlp-2026.11.23.dist-info\METADATA` and `yt_dlp_ejs-0.8.0.dist-info\METADATA`
  - `C:\Users\weeam server\AppData\Local\Microsoft\WinGet\Packages\BtbN.FFmpeg.GPL.9.0_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0\bin\ffmpeg.exe`
  - `C:\Program Files\nodejs\node.exe` (v24.18.0)

### Inferences
- **Process model for the Node.js worker** (all engines):
  - `child_process.spawn(binary, argv, {shell: false, env: minimal, cwd: per-job dir})`.
  - Run as a dedicated UID with a per-job temp dir and cgroup/Job-Object limits.
  - Network egress goes through a forward proxy for extraction (`--proxy`); FFmpeg gets no network.
  - Wall-clock and byte caps are enforced by the worker using yt-dlp `progress.downloaded_bytes` and FFmpeg `-progress` `out_time_us`/`total_size`.
- **Upgrade cadence:** watch yt-dlp releases weekly (YouTube client churn), and gallery-dl weekly. Watch Streamlink and FFmpeg point releases monthly. Re-run the extractor-count script at each yt-dlp bump.
- **Licensing posture for a SaaS that never distributes images:** all of the "use" engines impose no copyleft obligations on proprietary code.
- **If images will ship to customers or on-prem:**
  - Prefer an LGPL FFmpeg build.
  - Include a source-offer bundle for FFmpeg, gallery-dl and mutagen.
  - Keep Cobalt out.

### Gaps
- No head-to-head performance benchmarks (throughput, memory, startup) for any engine were found or run (downloads were out of scope).
- Contributor counts are not captured for most repos.
- No OSV/NVD sweep was done for you-get, lux, gallery-dl or N_m3u8DL-RE.
