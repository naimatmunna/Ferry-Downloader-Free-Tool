# Web platform capabilities and mobile UX constraints for a mobile-first web media downloader (state as of 2026-11-24)

Scope: what a React SPA served by an Express backend (server prepares the media file, then delivers it as an HTTP download) can rely on across iOS Safari, Android Chrome, Samsung Internet, Firefox (Android and desktop) and desktop Chrome/Edge/Safari, and whether a PWA adds real value.

Conventions used in these notes:
- Every URL was accessed on 2026-11-24. A full source register (with access date) is at the end of the last section.
- "BCD" = MDN browser-compat-data JSON (the data behind MDN and many caniuse tables). When BCD says "mirror", the browser inherits the upstream value (Edge from Chrome, Chrome Android from Chrome, Samsung Internet from Chrome Android, Firefox Android from Firefox, Safari iOS from Safari). Concrete Samsung Internet / Edge / iOS numbers derived from a "mirror" are my own mapping and are marked "(inferred)".
- "[search summary]" = the claim comes from a search engine's summary of that page; the page itself was not fetched, so treat it as lower confidence.
- Safari and iOS versions: Safari 13.1 shipped with iOS 13.4, Safari 15.2 with iOS 15.2, Safari 17 with iOS 17 (background knowledge). From 2025 Apple aligned numbering (Safari 26 = iOS 26; Safari 27 = iOS 27), as the WebKit WWDC posts state.
- On iOS/iPadOS every browser (Chrome, Firefox, Edge, and others) still uses WebKit in practice (see Q6), so "iOS Safari" capabilities apply to all iOS browsers unless stated otherwise.

---

## Q1. File downloads: same-origin `Content-Disposition: attachment` and `<a download>`, where files land, files over 1 GB, backgrounding and screen lock, resuming, pitfalls

### Takeaway
The most reliable path on every target browser is a plain same-origin link to an Express endpoint that streams the finished file with `Content-Disposition: attachment` (an ASCII `filename` plus an RFC 5987 `filename*`), `Content-Length`, `Accept-Ranges` and a **strong** validator. That hands the transfer to the browser's own download manager, which saves to Files > Downloads on iOS and to the device's download location on Android. It also gives Chromium what it needs to resume automatically. Don't use fetch → Blob → `blob:` downloads for large media. Android Chromium's blob limits are tiny, and the StreamSaver author recommends server-side `Content-Disposition` instead. iOS is the weak spot in two ways. Downloads that continue in the background are unreliable there (only conflicting user reports exist). And **downloads inside iOS Home Screen web apps are broken**: an open WebKit bug, unfixed since April 2025, leaves the app stuck on an "Open in…" screen.

### Cited Findings

**`<a download>` support and semantics**
- BCD versions for `<a download>`: Chrome 14, Edge 18 (partial in 13–17), Firefox 20, Firefox for Android 20, Safari 10.1, Safari on iOS 13. Chrome Android, Samsung Internet and WebView mirror Chrome. — [BCD html/elements/a.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/a.json)
- Chrome 65+ and Edge 79+ don't honor `download` on **cross-origin** URLs. So if the Express API runs on a different origin from the SPA (for example `api.example.com` vs `app.example.com`), the attribute neither forces a download nor renames the file. — [BCD a.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/a.json)
- Firefox for Android uses the `download` value as the suggested filename only for `blob:` and `data:` URLs; other schemes ignore it (bug 1845642). For http(s) downloads, the name must come from `Content-Disposition`. — [BCD a.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/a.json)
- MDN: when the browser honors it, `download` overrides `Content-Disposition: inline`. But a `filename` parameter in `Content-Disposition` overrides the name given in `download`. — [MDN Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition)
- From Firefox 82, `download` on a same-origin URL makes Firefox ignore an `inline` disposition; before that, the header won. In Chrome and Safari, saving an `inline` document uses the document title, not `filename`. — [BCD http/headers/Content-Disposition.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/http/headers/Content-Disposition.json)

**Filename encoding (RFC 5987 `filename*=UTF-8''…`)**
- `filename*` uses RFC 5987 encoding (`charset'lang'percent-encoded`). When a header carries both `filename` and `filename*` and the browser understands both, `filename*` wins. MDN recommends sending both, with an ASCII-transliterated `filename` as the fallback, e.g. `attachment; filename="resume-jose.pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9-jos%C3%A9.pdf`. — [MDN Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition)
- Avoid percent-escapes in the plain `filename`: Firefox and Chrome decode them, Safari does not. — [MDN Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition)
- Browsers may turn path separators (`/`, `\`) into `_`. Servers should treat the filename as untrusted and sanitize it. MDN cites RFC 6266 (Content-Disposition in HTTP) and RFC 5987 §3.2; it does not cite RFC 8187, which replaced RFC 5987. — [MDN Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition)
- WebKit bug 249134 (filed against Safari 15): with a very long filename in `Content-Disposition`, Safari displayed an MP4 inline instead of downloading it, while Chrome and Firefox downloaded it. — [WebKit bug 249134](https://auto-bugs.webkit.org/show_bug.cgi?id=249134) [search summary]
- An Apple Developer Forums report says Safari can truncate a long `Content-Disposition` header, which corrupts the filename. — [Apple Developer Forums 685138](https://developer.apple.com/forums/thread/685138) [search summary]

**Where files land**
- iOS/iPadOS: web downloads go to the Downloads folder in the Files app. A downloads button appears next to Safari's search field. — [Apple Support 102440](https://support.apple.com/102440) [search summary]
- The iOS destination is set under Settings > Safari > Downloads (Settings > Apps > Safari on newer iOS). Options include iCloud Drive > Downloads (default), On My iPhone, or another folder. — [MacRumors how-to](https://www.macrumors.com/how-to/change-where-safari-files-download-in-ios/) [search summary]; [SlashGear](https://www.slashgear.com/2215121/where-you-can-find-downloads-on-iphone/) [search summary]
- Users on iOS 18.5 reported Safari downloads missing from Files > Downloads. These are single forum reports, not confirmed. — [Apple Community 256063732](https://discussions.apple.com/thread/256063732) [search summary]
- Chrome on Android saves to the device's default download location, visible in the Files app. Chrome's own list (More > Downloads) offers pause, cancel, rename, share and delete. The help page doesn't cover changing the location or background behavior. — [Google Chrome Help (Android)](https://support.google.com/chrome/answer/95759?hl=en&co=GENIE.Platform%3DAndroid)
- Samsung Internet: third-party guides describe its own download-location setting (internal storage vs SD card) and, on some builds, an ask-where-to-save prompt. The guides conflict, and no official Samsung page was found. — [geekchamp](https://geekchamp.com/?p=565612) [search summary]; [androidexperto](https://androidexperto.com/?p=319723) [search summary]
- macOS: the same download from a Safari "Add to Dock" web app saves to Downloads and doesn't disturb navigation (unlike iOS web apps, below). — [WebKit bug 290847](https://bugs.webkit.org/show_bug.cgi?id=290847)

**Large files (>1 GB), memory and `blob:` URLs**
- Chromium blob storage limits. In-memory cap: 2 GB on 64-bit desktop, **physical RAM / 100 on Android**, RAM / 5 on ChromeOS. Larger blobs page to disk, with disk caps of disk / 10 on desktop, **6% of disk on Android** and disk / 2 on ChromeOS. Worked examples: a 2 GB RAM / 32 GB Android device gets about 20 MB in memory and about 1.9 GB on disk; a 512 MB / 8 GB device gets 5 MB and 491 MB. — [Chromium storage/browser/blob/README.md](https://chromium.googlesource.com/chromium/src/+/main/storage/browser/blob/README.md)
- The StreamSaver.js README names RAM and maximum blob size as the limits of blob-based saving. It advises using the server (Content-Disposition headers, no AJAX) when the file comes from a server, and calls client-side stream saving a last resort. — [StreamSaver.js README](https://github.com/jimmywarting/StreamSaver.js)
- One user reported that a ~2 GB test download in iOS Safari (to internal storage) finished even after the phone auto-locked. — [MacRumors forum](https://forums.macrumors.com/threads/downloading-files-continuously-in-the-background.2461737) [search summary; anecdotal]

**Backgrounding and screen lock**
- An iOS 26.1 user reports that Safari downloads start but cancel immediately when switching apps or minimizing Safari. — [Apple Community 256211824](https://discussions-jp-prz.apple.com/en/thread/256211824) [search summary; direct fetch returned HTTP 502]
- An iOS 26 thread reports that media downloads started in Safari fail to finish in the background, mainly larger files. — [Apple Community 256160022](https://discussions-jp-prz.apple.com/thread/256160022) [search summary]
- An older (2019) report: if iOS kills Safari under memory pressure the download fails, but restarting it can continue where it stopped. — [MacRumors forum 2187558](https://forums.macrumors.com/threads/background-downloading.2187558) [search summary; anecdotal]
- Apple's background `URLSession` keeps transfers running while an app is suspended, but it's a native-app API. Nothing found says Safari's web downloads are guaranteed the same treatment. — [Apple docs: Downloading files in the background](https://developer.apple.com/documentation/foundation/downloading-files-in-the-background) [search summary]
- Chrome on Android was changed (2017, Android N and later) to run downloads as a **foreground service** with a notification, which lets them continue when Chrome is backgrounded. — [Chromium code review 2735073002](https://codereview.chromium.org/2735073002) [search summary]
- Firefox for Android bug: if the app is killed from recents, the download notification disappears while the download manager keeps going, leaving the status unclear. — [Bugzilla 1833297](https://bugzilla.mozilla.org/show_bug.cgi?id=1833297) [search summary]

**Resuming (Range / If-Range / ETag) in each download manager**
- **Chromium (Chrome, Edge, Samsung Internet engine):** a source comment says a strong validator (ETag or Last-Modified) is required for the range requests used in download resumption **and "parallel download"**. — [Chromium download_utils.cc](https://chromium.googlesource.com/chromium/src.git/+/33df9d4f09e56fd37e48ab00c5e925b7ad2941c6/content/browser/download/download_utils.cc) [search summary]
- Chromium uses validators only when they are strong (2013 review). Since 2016 it resumes with `If-Range`, sending the ETag if present, otherwise Last-Modified, so a changed file comes back as a full 200 rather than a corrupt splice. Downloads without a strong validator are not auto-resumed, to avoid restart/interrupt loops. — [Chromium code review 1444253003](https://codereview.chromium.org/1444253003) [search summary]; [Chromium code review 67883007](https://codereview.chromium.org/67883007) [search summary]
- Chromium treats `Last-Modified` as weak unless it is **at least 60 seconds earlier than the response's `Date`** (`HttpUtil::HasStrongValidators`, following the HTTP spec's clock-skew rule). — [Chromium code review 1481143002](https://codereview.chromium.org/1481143002) [search summary; 2015–16 code, current source not re-checked]
- The `etag` npm package (used across the Express ecosystem) generates **weak** ETags (`W/"…"`) by default when given an `fs.Stats` object. — [jshttp/etag README](https://github.com/jshttp/etag)
- Third-party extension listings claim Chrome auto-retries a failed download only a few times before a manual resume is needed. — [Chrome Web Store: Auto Resume Downloads](https://chrome.google.com/webstore/detail/auto-resume-downloads/pifbhionjpacnpjoaomhdpbekkdphdgd) [search summary; low confidence]
- **Firefox for Android** "Downloads v2" bug 1819001: pause → resume failed when the server answered a Range request with 200 instead of 206. The fix (resolved for milestone **Firefox 154**, about mid-2026) refactors resume and **restarts from zero** when the server ignores Range. A 206 without `Content-Range` still fails. The bug also reproduced on desktop Firefox, and it blocks the 2025 Downloads v2 meta-bug 1948708. — [Bugzilla 1819001](https://bugzilla.mozilla.org/show_bug.cgi?id=1819001)
- Firefox for Android bug 1912455: downloads fail when the connection drops (unstable mobile data or VPN) and must be restarted manually. — [Bugzilla 1912455](https://bugzilla.mozilla.org/show_bug.cgi?id=1912455) [search summary; current status unknown]
- **iOS Safari:** Cloudflare notes that Safari and iOS rely on HTTP range requests for video seeking and for resuming interrupted downloads. — [Cloudflare docs: MP4 videos on iOS and Safari](https://developers.cloudflare.com/cache/troubleshooting/mp4-videos-on-ios-and-safari/) [search summary]

**iOS Home Screen web app (standalone) downloads: the most serious pitfall**
- WebKit bug 290847 (its title describes iOS 18.4 web-app downloads and inline file display leaving the app with no navigation). In a Home Screen web app, an `<a download>` link to a file served with `Content-Disposition: attachment` shows an "Open in …" screen that blocks further navigation; only force-quitting recovers. Without `attachment`, an inline PDF also leaves no way back. The reporter also reproduced it on iOS 16.7.10. Status: **NEW**, P2, assignee "Nobody", imported to Apple Radar (rdar://148831174), last activity 2025-04-08, no workaround. — [WebKit bug 290847](https://bugs.webkit.org/show_bug.cgi?id=290847)
- History: WebKit bug 209407 (2020), the `download` attribute failing only when saved to the Home Screen (since marked resolved); bug 236943, similar stranding from a `download` link in an installed app. — [WebKit bug 209407](https://auto-bugs.webkit.org/show_bug.cgi?id=209407) [search summary]; [WebKit bug 236943](https://auto-bugs.webkit.org/show_bug.cgi?id=236943) [search summary]
- Since iOS 26, every site added to the Home Screen opens as a web app by default. Users can switch off "Open as Web App" to get a bookmark that opens in their default browser. Before, a site opened as a web app only with `apple-mobile-web-app-capable` or a manifest `display` value. — [WebKit: News from WWDC25 (Safari 26)](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)

### Inferences
- **Server contract (Express):** serve the result at a same-origin URL (or proxy it under the SPA's origin) such as `GET /api/jobs/:id/file`, with:
  - `Content-Disposition: attachment; filename="<ascii-fallback>"; filename*=UTF-8''<percent-encoded UTF-8>`
  - the real `Content-Type` (e.g. `video/mp4`) and `Content-Length`
  - `Accept-Ranges: bytes`, with correct `206` + `Content-Range` replies to `Range`, and `If-Range` honored
  - a **strong** `ETag`, e.g. a hash or `"<jobId>-<size>"` with no `W/` prefix, plus `Last-Modified`

  This follows from the Chromium and Firefox resume findings above.
- **Express caveat (background knowledge; verify in code):** `res.download()` / `res.sendFile()` go through the `send` module, which builds its ETag with `etag(stat)`, giving a *weak* ETag (see the etag README finding). A freshly prepared file also has a `Last-Modified` less than 60 seconds before `Date`. Together, a file downloaded right after it's prepared may present **no strong validator** to Chromium, so an interrupted download won't auto-resume. Fix: disable send's ETag (`etag: false`) and set your own strong ETag header, or compute a content hash during preparation. Also make sure compression middleware never touches media responses (it breaks `Content-Length` and ranges).
- `res.attachment()` / `res.download()` use the `content-disposition` module, which emits both `filename` (ASCII fallback) and `filename*` for non-ASCII names (background knowledge; verify). Keep generated names short (for example ≤100 characters) and strip emoji and control characters, because of the Safari long-filename and truncation reports.
- **Trigger UX:** when a job finishes, show a real `<a href="/api/jobs/:id/file" download>` "Save file" button the user taps. Don't auto-navigate from an async callback. A tap counts as a user gesture, which download and pop-up heuristics treat favorably, and the user knows where the file is going. Keep `download` as a hint only; the name must come from the header (Firefox Android ignores `download` names for http URLs).
- **Never buffer media in JS** (fetch → Blob → `URL.createObjectURL`). On Android Chromium the in-memory blob cap is RAM/100 and the disk cap is 6% of storage, so a >1 GB file would page to disk at best and fail at worst. iOS memory limits for blobs are undocumented. Native downloads stream to disk.
- **iOS specifics to communicate in the UI:** the file lands in Files > Downloads, not Photos. Tell users how to move a video into Photos (Files > Share > Save Video). For large files, say "keep Safari open until the download finishes", since background continuation isn't reliable. Make re-tapping "Save file" safe: same URL, same ETag, ranges supported.
- **Detect iOS standalone mode** (`matchMedia('(display-mode: standalone)')` or `navigator.standalone`). In that mode, warn that downloads can strand the app and ask the user to open the site in Safari. iOS 26 makes Home Screen sites standalone by default even without a manifest, so you can't avoid this just by leaving out `display: standalone`.
- **Retention:** keep each prepared file, with stable validators, for a generous window (≥20 h would also meet the WCAG 2.2.1 exception; see Q5), so retries and resumes work across network changes.

### Gaps
- No official Apple documentation on what Safari's download manager does when Safari is backgrounded, the screen locks or memory runs low (iOS 26/27), or on its resume semantics. Only conflicting user anecdotes were found.
- No primary source on the current iOS "Do you want to download …?" confirmation UX in iOS 26/27, or on whether `video/*` with `attachment` ever previews inline on current iOS (the known inline case involves very long filenames).
- No authoritative Samsung Internet documentation on download location, background behavior or resume support (presumably Chromium-like, but unverified).
- Firefox for Android's default folder and background behavior weren't found in official docs. Bug 1912455's current status wasn't checked.
- No documented per-file size cap for native downloads in any browser (FAT32 SD-card 4 GB limits are general knowledge, not verified here).
- Untested: whether a `target="_blank"` link to an out-of-scope URL from an iOS Home Screen web app opens an in-app Safari view where downloads work. This needs device testing.
- Whether WebKit bug 290847 is fixed in iOS 26.x/27.x isn't confirmed. The bug was still NEW at access time, but fixes can ship without a bug update.

---

## Q2. PWA capability matrix: installation, Web Share Target, Background Fetch, Background Sync, File System Access, push and badging on iOS, storage quotas and eviction, `navigator.storage.persist()`

### Takeaway
PWA capabilities split sharply by engine. **Chromium on Android (Chrome, Samsung Internet)** has what matters for a downloader: WebAPK install, **Web Share Target** (Chrome Android 76+) so users can share a link from the YouTube, Instagram or TikTok apps into the downloader, Background Fetch (74+), Background Sync (49+) and File System Access pickers (Chrome Android 132+, with Android caveats). **Safari/WebKit (all iOS browsers)** has none of Share Target, Background Fetch, Background Sync or `showSaveFilePicker`. Installing on iOS adds Web Push and badging (iOS 16.4+, Home Screen only, Declarative Web Push 18.4+) and better storage treatment (no 7-day eviction, a likely `persist()` grant). But it also brings the broken-download bug from Q1. **Firefox** can't install from a manifest on desktop (only a Windows Labs "web apps" feature) and only adds home-screen shortcuts on Android; it has no Share Target, Background Fetch or Background Sync.

### Cited Findings

**Installability**
- MDN install criteria for Chromium browsers: a manifest with `name`/`short_name`, `icons` including 192 px and 512 px, `start_url`, `display`/`display_override`, and `prefer_related_applications` false or absent; HTTPS (or localhost). A **service worker is not required** to install. — [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- MDN platform summary:
  - Chromium desktop installs PWAs on all desktop OSes, and Chrome/Edge desktop can install any site, with or without a manifest.
  - Safari on macOS Sonoma+ offers File > Add to Dock for any site.
  - **Firefox desktop doesn't support installing from a manifest.**
  - On Android, real **WebAPK** installs come from Chrome on devices with Google Mobile Services and from **Samsung Internet on Samsung devices**. Firefox, Edge, Opera, and Chrome without GMS only add a browser-badged home-screen shortcut.
  - On iOS 16.4+, install works from the Share menu in Safari, Chrome, Edge, Firefox and Orion (before 16.4, only Safari).
  - `beforeinstallprompt` is **not supported on iOS**.
  - The manifest's `description` and `screenshots` appear in the install prompt on Android only.

  — [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- iOS 26: by default every site added to the Home Screen opens as a web app (manifest or not), and users can switch off "Open as Web App". Manifest support dates from iOS 11.4 (March 2018). — [WebKit: News from WWDC25](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
- iOS 16.4 details: third-party iOS browsers get Add to Home Screen only with Apple's managed `com.apple.developer.web-browser` entitlement. The manifest `id` lets the same web app be installed more than once under different names (e.g. "work" and "personal"). — [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- Firefox desktop "web apps" (formerly Taskbar Tabs) is an experimental **Firefox Labs** option on **Windows** only. Mozilla says it came to Release in **Firefox 142**; Neowin says **141**. It excludes MSIX/Store builds, and the app windows keep the Firefox toolbar. — [Mozilla Connect (Firefox Labs)](https://connect.mozilla.org/t5/firefox-labs/give-web-apps-in-firefox-a-try-on-labs-and-tell-us-what-you/m-p/104750) [search summary]; contradicted on version by [Neowin](https://www.neowin.net/amp/firefox-is-finally-getting-a-feature-users-have-been-begging-to-have-for-ages/) [search summary]

**Web Share Target (`share_target` manifest member)**
- BCD: Chrome Android **76**; Chrome desktop **89** (platform scope not stated in the data); Edge mirrors Chrome; Opera 76; Opera Android 63; Samsung Internet mirrors Chrome Android. **Firefox: not supported** (bug 1476515). **Firefox Android: the property parses but has no effect.** **Safari/Safari iOS: not supported** (WebKit bug 194593). **Android WebView: not supported.** — [BCD manifests/webapp/share_target.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/manifests/webapp/share_target.json)

**Web Share API (`navigator.share`, sending): useful for "Save to Photos" style handoff**
- caniuse (general `navigator.share`, files not covered): iOS Safari **12.2+**, Safari macOS **12.1+**, Samsung Internet **8.2+**. Chrome for Android and Firefox for Android are listed as supported in their current-version columns. Chrome desktop is full from **128** (partial 89–127), Edge desktop full from **95** (partial 81–94). **Firefox desktop is not supported.** — [caniuse: Web Share API](https://caniuse.com/web-share)

**Background Fetch**
- `BackgroundFetchManager` / `fetch()`: Chrome **74**, mirrored by Chrome Android, Edge and Samsung Internet. **Not supported** in Firefox, Firefox Android, Safari, Safari iOS or Android WebView. Marked experimental. — [BCD api/BackgroundFetchManager.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BackgroundFetchManager.json)

**Background Sync (one-off)**
- `SyncManager` / `register()`: Chrome **49** (full worker support from 61), mirrored by Chrome Android, Edge and Samsung Internet. **Not supported** in Firefox, Firefox Android, Safari (WebKit bug 182565), Safari iOS or Android WebView. — [BCD api/SyncManager.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SyncManager.json)

**File System Access (`showSaveFilePicker` and related)**
- web-features: Chrome **86** (2020-10-20), Edge **86**, **Chrome Android 132 (2025-01-14)**. Firefox and Firefox Android: not supported (negative standards position). Safari and Safari iOS: not supported (**opposed**, security concerns). Baseline status: limited availability, very unlikely to become Baseline in its current form. — [web-features explorer: file-system-access](https://web-platform-dx.github.io/web-features-explorer/features/file-system-access/)
- caniuse (BCD-derived) for `Window.showSaveFilePicker`: Chrome 86+, Edge 86+, Opera 72+, **Samsung Internet 29+**, Chrome for Android supported (current-version column). Firefox, Firefox for Android, Safari (through 27.3) and iOS Safari (through 27.2): not supported. — [caniuse: showSaveFilePicker](https://caniuse.com/mdn-api_window_showsavefilepicker)
- Android caveats from the Intent to Ship thread (Sep–Oct 2024):
  - Android uses Intents rather than file choosers (GET_CONTENT is read-only; OPEN_DOCUMENT allows writes but supports fewer providers).
  - Files are content URIs **without atomic writes or renames**.
  - Early testers found MIME filters ignored, **no obvious way to choose a new filename when saving**, and an InvalidStateError when saving a folder.
  - The visible thread shows no final LGTMs.

  — [blink-dev: Intent to Ship: File System Access on Android and WebView](https://groups.google.com/a/chromium.org/g/blink-dev/c/x3IcFv2jY6c)
- Safari 26 added a "File System WritableStream API" for writing directly to files. Since Safari has no pickers, this presumably applies to origin-private-file-system handles (see Inferences). — [WebKit: News from WWDC25](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
- OPFS entry point `StorageManager.getDirectory()`: Chrome 86 / Chrome Android 109, Firefox 111 (desktop and Android), Safari 15.2 (macOS and iOS). — [BCD api/StorageManager.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/StorageManager.json)

**Notifications, push and badging on iOS (Home Screen web apps)**
- **iOS/iPadOS 16.4** added Web Push for Home Screen web apps only. Requirements:
  - the site is added to the Home Screen with a manifest `display` of `standalone` or `fullscreen`;
  - the permission request comes from a **direct user gesture** (e.g. tapping "Subscribe");
  - users manage permission per web app in Notifications settings, and Focus modes apply.

  It uses the same standards-based Web Push as **Safari 16.1 on macOS**. No Apple Developer Program membership is needed; allow `*.push.apple.com` endpoints if you filter them. — [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- **Badging API on iOS 16.4+:** `setAppBadge()` / `clearAppBadge()` work in Home Screen web apps while in the foreground or while handling a push event. Badge permission comes with notification permission. — [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- **Declarative Web Push** (a push message that needs no service worker to display; it can carry a badge update) shipped in **Safari 18.4 / iOS 18.4** for Home Screen web apps. — [WebKit: Meet Declarative Web Push](https://webkit.org/?p=16535) [search summary]

**Storage quotas, eviction and persistence**
- Safari 17 / iOS 17 storage policy (WebKit, 2023-08-10):
  - Each origin may use up to **60% of total disk** in browser apps; **Home Screen web apps (iOS) and Dock web apps (macOS) get the same quotas as the browser**.
  - Other WebKit apps: 15% per origin and 20% overall. The overall cap for browser apps is 80%.
  - Cross-origin frames get 10% of the main frame's quota.
  - Eviction is whole-origin, least-recently-used, triggered by quota or storage pressure or by ITP-related disuse.
  - Origins with an active page and origins in **persistent mode** aren't evicted.
  - `persist()` is granted heuristically; WebKit's example criterion is whether the site is opened as a Home Screen web app.
  - `estimate()` returns the quota and usage, and the quota may vary to resist fingerprinting.

  — [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- **7-day cap** (Safari 13.1 / iOS 13.4, March 2020): after 7 days of Safari use without the user interacting with a site, its script-writable storage is deleted. That covers IndexedDB, LocalStorage, media keys, SessionStorage, **service worker registrations and cache**. **Home Screen web apps** keep their own day count, which resets when the app is used; WebKit says it doesn't expect their first-party data to be deleted and would treat that as a serious bug. — [WebKit: Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- Safari 26 blocks *known fingerprinting scripts* from setting long-lived script-written storage (cookies, LocalStorage). — [WebKit: News from WWDC25](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
- `navigator.storage.persist()` / `persisted()`: Chrome/Chrome Android/Edge **55**, Firefox/Firefox Android **57**, Safari/Safari iOS **15.2**; Samsung Internet mirrors Chrome. `estimate()`: Chrome 61, Firefox 57, **Safari 17**. — [BCD api/StorageManager.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/StorageManager.json)

### Inferences
- For a downloader, the one PWA feature that changes the product is **Web Share Target on Android** (Chrome 76+, and probably Samsung Internet). In practice it needs an *installed* WebAPK (MDN: WebAPK installs exist only in Chrome with GMS and Samsung Internet on Samsung devices), so Firefox Android and non-GMS devices won't see the app in the share sheet. iOS has no equivalent. A possible stand-in is a user-installed Apple Shortcut in the share sheet that opens `https://<app>/?url=<shared>` (an idea, untested).
- Share Target handling (background knowledge; verify with real apps): many Android apps put the shared link in the `text` field rather than `url`, so the share-target handler should pull the first URL out of `url`, `text` or `title`. A GET share target (`/share?url=&text=&title=`) is simplest and needs no service worker.
- Background Fetch could let Chromium run a large download under browser-managed UI, but the response lands in Cache Storage (quota-bound). It's Chromium-only, and you'd still have to export the file to user-visible storage. For >1 GB media it's strictly worse than a normal HTTP download. Not recommended.
- Background Sync / Periodic Sync add nothing here: the server already owns the job, and the client only needs to re-fetch status when it returns.
- `showSaveFilePicker` isn't worth it for mobile. iOS and Firefox will never have it, and on Android the save picker has known UX gaps and no atomic writes. On desktop Chromium it would let you stream into a user-chosen file, but a native download already does that.
- Safari 26's "File System WritableStream" most likely means `FileSystemFileHandle.createWritable()` on OPFS handles (Safari has no pickers per caniuse and web-features). It doesn't give a way to write into the user's Downloads.
- On iOS, installing makes storage *safer* (no 7-day wipe, `persist()` likely granted). But this app keeps job state on the server and needs no large client storage, so the gain is marginal.
- Push for "your file is ready" is a real but secondary benefit: on Android in-browser (background knowledge) and on iOS only after install. On iOS, installing is exactly where downloads break (Q1).

### Gaps
- Push and Notification API versions for Chrome Android, Samsung Internet and Firefox Android weren't re-verified (widely known to work in-browser on Android, but not checked against BCD here).
- Badging API support on Chromium desktop (installed PWAs) and Android wasn't verified.
- Samsung Internet's Web Share Target support rests only on BCD's "mirror" of Chrome Android (implied Samsung Internet 12.0, inferred). No Samsung documentation was found.
- The desktop platforms behind BCD's "Chrome 89" for `share_target` (ChromeOS only, or also Windows/macOS) weren't confirmed.
- No source confirms whether the Safari 7-day cap still applies unchanged in Safari 26/27. The 2023 storage-policy post doesn't mention it, and no removal was found.
- Chrome's and Firefox's exact `persist()` grant heuristics (engagement, install, bookmark, permission prompt) weren't re-verified.
- Periodic Background Sync and the File Handling and Launch Handler APIs weren't researched (low relevance).

---

## Q3. Clipboard: `navigator.clipboard.readText()` support and permission UX (iOS Safari, Android Chrome, Firefox desktop/Android), secure-context rules, and a best-practice "Paste" button

### Takeaway
`readText()` now works in every target engine, but always behind a user gesture and with engine-specific UX. **Safari 13.1+/iOS 13.4+** shows a one-item "Paste" callout the user must tap; dismissing it rejects the promise. **Chrome 66+** (and Chrome Android) asks for the `clipboard-read` permission. **Firefox 125+ (desktop and Android)** shows a "Paste" context menu unless the content came from the same origin. A "Paste" button should call `readText()` only from its click handler, catch rejections, and always fall back to a visible URL field where the OS's native long-press Paste works.

### Cited Findings
- BCD `Clipboard.readText()`: Chrome **66** (user must grant `clipboard-read`), Firefox **125**, Safari **13.1**. Chrome Android, Edge, Firefox Android, Safari iOS, Samsung Internet and WebView mirror their upstream browser, implying Safari iOS 13.4 and Samsung Internet 9.0 (inferred). `read()`: Chrome 76, Firefox 127, Safari 13.1. `writeText()`: Chrome 66 (from 107, a user gesture is enough without the `clipboard-write` permission), Firefox 63 (gesture required), Safari 13.1 (gesture required). — [BCD api/Clipboard.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Clipboard.json)
- Firefox notes in BCD: `readText` must run inside a user-gesture handler. A paste prompt appears unless the clipboard holds same-origin content. Extensions with `clipboardRead` skip the prompt. — [BCD api/Clipboard.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Clipboard.json)
- Firefox bug 1877400 turned `dom.events.asyncClipboard.readText` on by default for the **125** branch and states it **affects Firefox for Android too**. The release note: a paste context menu asks the user to confirm when the page reads clipboard data it didn't put there. Later regressions: bug 1962874 (button drawn outside the window) and CVE-2024-10465 (paste button persisting across a tab open). Bug 2001379 removes the now-default prefs. — [Bugzilla 1877400](https://bugzilla.mozilla.org/show_bug.cgi?id=1877400)
- Firefox's Intent to Ship enabled `clipboard.read()`/`write()` on all channels from Firefox **127**, with the same explicit-click paste menu. — [Mozilla dev-platform: Intent to ship read()/write()](https://groups.google.com/a/mozilla.org/g/dev-platform/c/lNXj_A-Lllk) [search summary]
- Firefox bug 1767941 (still open): the "Paste" button misbehaves when it overlaps another context menu. — [Bugzilla 1767941](https://bugzilla.mozilla.org/show_bug.cgi?id=1767941) [search summary]
- WebKit (Safari 13.1):
  - The async Clipboard API exists **only in secure contexts**; `navigator.clipboard` is absent on `http://`.
  - Reads outside a user gesture reject immediately.
  - Same-origin-written content is readable automatically.
  - Otherwise the platform shows a **callout bar with a single "Paste" option on iOS** (a context-menu item on macOS). Tapping elsewhere, switching tabs or hiding Safari **rejects** the promise.
  - WebKit recommends `readText`/`writeText` for plain text, calling them only from click or touch handlers.

  — [WebKit: Async Clipboard API](https://webkit.org/blog/10855/async-clipboard-api/)
- Safari 27 beta fixes keyboard paste into number-restricted form fields and other paste and editing bugs. These are fixes, not new clipboard capabilities. — [WebKit: News from WWDC26 (Safari 27 beta)](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/)

### Inferences
- **Recommended Paste-button pattern:**
  1. Render a visible, labelled `<input type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false">` plus a "Paste" button.
  2. In the button's click handler (never on load or focus), feature-detect `navigator.clipboard?.readText`, `await` it inside try/catch, then trim and validate the URL.
  3. On rejection (`NotAllowedError`: denied, dismissed callout, or no gesture) or when the API is missing, focus the input and show a hint such as "Long-press here and tap Paste".
  4. Also listen for the `paste` event (`event.clipboardData.getData('text')`) and the `input` event, so a native paste immediately validates and can auto-start.
- Expect three UX shapes. **iOS:** a second tap on the system "Paste" callout, so place the button where the callout won't cover key UI. **Chrome/Chrome Android:** a one-time permission prompt, which persists once granted (background knowledge). **Firefox:** a "Paste" menu on every cross-origin read. Write help text that doesn't depend on any one of them.
- `navigator.permissions.query({name: 'clipboard-read'})` isn't portable (background knowledge: Firefox and Safari don't expose this permission name). Don't build UI on it; just try `readText()` and handle failure.
- Secure context: serve HTTPS everywhere, including staging, since `navigator.clipboard` (and service workers, Web Share and install) is unavailable on plain HTTP (WebKit states this explicitly; the same holds in Chromium and Firefox from background knowledge).
- On Android, Share Target (Q2) removes the paste step for installed users; on iOS, paste remains the main input path.

### Gaps
- Samsung Internet's `readText()` permission UX isn't documented; it only mirrors Chrome in BCD.
- The exact Chrome Android prompt wording and persistence, and whether Chrome now offers a "paste once" style chip, weren't verified for 2026.
- No source checked whether iOS Home Screen web apps behave differently from Safari tabs for `readText()`.

---

## Q4. Live job progress on mobile: Server-Sent Events vs WebSocket vs polling, background-tab behavior (timer throttling, freezing, dropped connections), HTTP/1.1 six-connection limit vs HTTP/2

### Takeaway
Use **SSE (EventSource) over HTTP/2** for one-way progress, backed by a REST status snapshot and a polling fallback. Assume every mobile browser will **pause or kill the connection when the page is hidden**:
- iOS suspends the page and drops sockets.
- Chrome Android freezes background pages after 5 minutes.
- Chrome throttles hidden-tab timers to 1 s, and to 1 min after 5 minutes.

So resync on `visibilitychange`/`pageshow` instead of trusting `error`/`close` events. On HTTP/1.1, SSE shares the hard limit of 6 connections per browser per host across all tabs (Chrome and Firefox: "Won't fix"); HTTP/2 lifts this (100 streams by default). WebSocket adds nothing for one-way progress and has worse resume reports on iOS.

### Cited Findings
- MDN: without HTTP/2, SSE is limited to **6 open connections per browser + domain, shared across all tabs**. Over HTTP/2 the stream limit is negotiated (**default 100**). Chrome (crbug 275955) and Firefox (bug 906896) marked the limit "Won't fix". EventSource is **Baseline widely available since January 2020** and works in Web Workers. — [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- Chrome 88+ (January 2021) timer throttling in hidden pages:
  - **Stage 1:** effectively no throttling while visible or if audio played in the last 30 s.
  - **Stage 2:** 1-second alignment when hidden for under 5 minutes, chain count under 5, or WebRTC in use.
  - **Stage 3 (intensive):** **1-minute alignment** when hidden over 5 minutes, chain count ≥5, silent ≥30 s and no WebRTC.

  The article doesn't specify WebSocket or network behavior; there is only a test flag, `AllowAggressiveThrottlingWithWebSocket`. — [Chrome: Heavy throttling of chained JS timers (Chrome 88)](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)
- **Chrome on Android freezes pages after 5 minutes in the background (since M68).** Freezing suspends freezable task queues (timers, fetch callbacks, event handlers, promise resolution); pages get `freeze`/`resume` events. On desktop, Chrome 133 freezes only CPU-heavy hidden tabs, and only while Energy Saver is on. Chrome suggests moving background work to a service worker. A `BackgroundPageFreezeOptOut` origin trial existed (current status not verified). — [Chrome: Freezing on Energy Saver (2025-01-20)](https://developer.chrome.com/blog/freezing-on-energy-saver) [search summary]; [blink-dev: Freezing task queues in background on mobile](https://groups.google.com/a/chromium.org/g/blink-dev/c/NKtuFxLsKgo) [search summary]; [Chrome: Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) [search summary]
- iOS: developers report that since iOS 15, Safari closes WebSockets once the user switches to another app, and the server sees the client disconnect. — [Apple Developer Forums 696310](https://developer.apple.com/forums/thread/696310) [search summary]
- Apple DTS explains (for native apps) that suspension, not backgrounding as such, is what kills network connections, and iOS usually suspends an app soon after it leaves the foreground. — [Apple Developer Forums 716118](https://developer.apple.com/forums/thread/716118) [search summary; thread attribution from search snippet]
- WebKit bug 308073 (February 2026): after iOS Safari resumes from background, `new WebSocket()` can hang in `CONNECTING` forever while `fetch` still works. The reporter's workaround detects resume via `setInterval` drift. — [WebKit bug 308073](https://bugs.webkit.org/show_bug.cgi?id=308073) [search summary]
- An iOS 18 report: EventSource's `error` event doesn't fire and `readyState` stays `OPEN` (1) even though the SSE connection has closed. — [Apple Developer Forums 765183](https://developer.apple.com/forums/thread/765183) [search summary]
- Another report: iOS Safari doesn't fire WebSocket `close`/`error` when the connection drops. — [Apple Developer Forums 106028](https://developer.apple.com/forums/thread/106028) [search summary]
- Safari 27 beta: `EventSource` now closes when `window.stop()` is called (a bug fix); no WebSocket changes listed. — [WebKit: News from WWDC26 (Safari 27 beta)](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/)

### Inferences
- **Architecture:** the server owns job state (queued → fetching → processing → ready → expired/failed), and the client is a disposable view of it.
  - `GET /api/jobs/:id` returns a snapshot.
  - `GET /api/jobs/stream?ids=…` (or one stream per browser tab) multiplexes events for all of that user's jobs. Each event carries an `id:` (monotonic per job) so the server can honor `Last-Event-ID` on reconnect.
  - The server sends a `retry:` value and a heartbeat comment (`:\n\n`) every 15–20 s, which keeps proxies from idling the stream and lets the client run a watchdog.
- **Client rules:**
  - On `visibilitychange` → visible, `pageshow` (including bfcache restores), `online` and Page Lifecycle `resume`: close and reopen the EventSource, then fetch the snapshot.
  - Run a watchdog: no event or heartbeat for about 45 s means reconnect.
  - Don't treat `onerror`/`readyState` as truth on iOS.
  - If EventSource fails repeatedly (some proxies buffer `text/event-stream`), drop to polling: about every 2 s while visible, with jitter and backoff; stop while hidden.
- **Transport:** terminate TLS with **HTTP/2 (or HTTP/3)** at a reverse proxy or CDN in front of Express. That avoids the 6-connection limit, which on HTTP/1.1 would be shared by SSE streams in several tabs *and* the long-running file downloads to the same host. For SSE through nginx-style proxies, disable response buffering and compression on the stream and send `Cache-Control: no-cache` (background knowledge).
- **WebSocket** brings bidirectional complexity, extra iOS resume bugs (308073) and no benefit for one-way progress. **Polling alone** is acceptable and robust, but costs more requests and adds latency. SSE plus snapshot plus polling fallback gives the best balance.
- The file transfer itself is a browser-managed download, separate from the page's JS. Page freezing or iOS suspension of the *tab* stops progress UI, not the server job. For long jobs, consider push notifications as an "it's ready" path where available (Android browsers; iOS only when installed).
- Don't use timers to measure progress or ETA in hidden pages. Compute ETA from server timestamps so throttled timers don't skew it.

### Gaps
- No official WebKit documentation on how long iOS 26/27 Safari keeps a hidden tab's network connections alive before suspension; only developer reports.
- Background-tab policy for Firefox for Android and Samsung Internet wasn't researched; assume behavior similar to or stricter than Chrome.
- Whether Chrome's intensive throttling or freezing treats an open EventSource or WebSocket as an exemption wasn't found in the sources.

---

## Q5. Accessibility: the most relevant WCAG 2.2 AA criteria (2.5.8, 2.4.11, 2.4.13 AAA, 1.4.3, 2.2.x for expiring downloads, 4.1.3 status messages) and ARIA patterns for progress bars and live regions

### Takeaway
For this UI the binding WCAG 2.2 AA requirements are:
- 24×24 CSS px targets (2.5.8);
- focused controls never fully hidden behind sticky bars, banners or the keyboard (2.4.11);
- 4.5:1 text contrast (1.4.3) and 3:1 contrast for the progress bar and focus indicators (1.4.11);
- progress and status announced without moving focus (4.1.3, AA);
- Timing Adjustable (2.2.1, level A) for expiring download links, unless the limit is over 20 hours.

Use the native `<progress>` element (or `role="progressbar"` with `aria-valuenow`/`aria-valuetext`) plus a separate, throttled `role="status"` region for milestones, and `role="alert"` only for failures.

### Cited Findings
- WCAG 2.2 is a W3C Recommendation; the current edition is dated **12 December 2024** (REC-WCAG22-20241212). **4.1.1 Parsing is obsolete and removed.** — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **1.4.3 Contrast (Minimum), AA:** text and images of text need ≥**4.5:1**; large text (18 pt, or 14 pt bold) needs ≥**3:1**. Inactive components, decoration and logotypes are exempt. — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **1.4.11 Non-text Contrast, AA:** visual information needed to identify UI components, their states, and meaningful graphics needs ≥**3:1** against adjacent colors (inactive components and UA-controlled appearance exempt). — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **2.2.1 Timing Adjustable, Level A:** for each content-set time limit, the user can turn it off, adjust it to at least 10× the default, or extend it (warned, at least 20 s to act, at least 10 times). Exceptions: real-time events, essential limits, and **limits longer than 20 hours**. — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **2.2.6 Timeouts, AAA:** warn users of inactivity timeouts that could lose data, unless data is kept for more than 20 hours. — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **2.4.11 Focus Not Obscured (Minimum), AA:** a focused component must not be *entirely* hidden by author-created content. **2.4.12 (Enhanced), AAA:** no part of it may be hidden. — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **2.4.13 Focus Appearance, AAA:** the indicator must be at least as large as a **2 CSS px** thick perimeter of the unfocused component, with ≥**3:1** contrast between focused and unfocused states. Exceptions: the user agent controls the indicator, or the author hasn't changed it. — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **2.5.8 Target Size (Minimum), AA:** pointer targets are at least **24×24 CSS px**. Exceptions:
  - spacing: a 24 px circle centered on each undersized target touches no other target or circle;
  - an equivalent control on the same page;
  - inline links in text;
  - unmodified UA controls;
  - essential presentation.

  **2.5.5 Target Size (Enhanced)** sets **44×44 CSS px** as the stricter target (AAA, per background knowledge; the Understanding page excerpt didn't state the level). — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **4.1.3 Status Messages, AA:** status messages must be programmatically determinable through role or properties so assistive tech can present them **without receiving focus**. A status message reports the result of an action, a waiting state, **the progress of a process**, or errors. Examples:
  - a progress bar with periodic announcements;
  - a "busy" indicator;
  - a hidden "system available" message when the busy state ends.

  Techniques:
  - ARIA22 `role=status` (success and results);
  - ARIA19 `role=alert` (errors, only with no change of context);
  - ARIA23 `role=log` (sequential updates);
  - **ARIA25** (a live region for progress bar status);
  - **ARIA27** (`ariaNotify` for progress bar status).

  Failures: F103 (status not programmatically identifiable) and using `role=alert`/`aria-live=assertive` for content that isn't important or time-sensitive. W3C also warns that overused live regions make the UI noisy. — [W3C Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- MDN `progressbar` role:
  - `aria-valuenow` is required unless indeterminate (omit it when progress is unknown).
  - `aria-valuemin`/`aria-valuemax` default to 0/100.
  - Use `aria-valuetext` when a bare percentage would mislead.
  - An accessible name is required (`aria-labelledby` / `aria-label`, or a `<label>` for a native `<progress>`).
  - Descendants are presentational.
  - For loading regions, set `aria-busy="true"` and point `aria-describedby` at the bar.
  - **MDN recommends the native `<progress>` element** over the ARIA role.

  — [MDN: ARIA progressbar role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role)
- Safari 27 beta ships accessibility fixes relevant to SPAs: `aria-hidden="true"` is invalidated when focus lands inside the hidden subtree, `aria-owns` id changes update the accessibility tree, and VoiceOver reading fixes. — [WebKit: News from WWDC26 (Safari 27 beta)](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/)

### Inferences
- **Progress pattern per job card:**
  ```html
  <label id="j1-l" for="j1-p">Downloading "Video title"</label>
  <progress id="j1-p" max="100" value="45" aria-describedby="j1-s">45%</progress>
  <p id="j1-s" class="visually-hidden-or-visible">45% · 120 MB of 260 MB</p>
  ```
  Leave `value` unset (indeterminate) during "queued" and "analyzing" phases, when the server can't estimate. Expose rich text through visible text or `aria-valuetext` (for example "45 percent, about 1 minute left").
- **Announcements:** keep one page-level `<div role="status" aria-live="polite" aria-atomic="true">`, updated **only at milestones**: queued, started, 25/50/75%, ready ("Video title is ready. Save file button available."), expired. Throttle to at most one announcement every ~10 s, and never every percent tick. Put failures ("Download failed: link not supported") in a separate `role="alert"`. Don't steal focus when a job finishes (4.1.3's intent), but make the "Save file" button the next focusable element in the card.
- **Targets:** at least 24×24 CSS px for every control. Aim for **44×44** for the primary actions (Paste, Start, Save file, Cancel) on mobile: that meets 2.5.5 AAA and platform norms, and keeps the system Paste callout away from neighboring controls.
- **Focus Not Obscured (2.4.11):** sticky bottom action bars, cookie/consent banners, toasts and the on-screen keyboard are the usual offenders on mobile. Use `scroll-padding-bottom`/`scroll-margin` that matches sticky bar heights, and keep toasts from covering focused elements.
- **Focus Appearance:** although 2.4.13 is AAA, a `:focus-visible` ring ≥2 px with ≥3:1 change contrast is cheap and also covers 1.4.11 for indicators. Progress fill vs track and input borders need ≥3:1 (1.4.11). Status text needs ≥4.5:1 (1.4.3), including small "MB of MB" captions.
- **Expiring downloads (2.2.1):** either keep prepared files for **more than 20 hours** (exempt), or show the expiry time, warn before it, and offer "Keep for longer" / "Prepare again" with at least 20 s to respond. Regenerating with one tap from history is a user-friendly equivalent. Also announce expiry through the status region.
- Respect `prefers-reduced-motion` for animated or striped progress bars (WCAG 2.3.3 is AAA; background knowledge).
- `ariaNotify` (ARIA27) is a newer API. Check browser support before relying on it; a live region (ARIA25) works everywhere.

### Gaps
- Legal context wasn't researched: EU European Accessibility Act (applicable since 28 June 2025) and EN 301 549 mapping to WCAG 2.1/2.2. This matters if the service targets EU consumers.
- `ariaNotify` browser support wasn't verified.
- No screen-reader testing data (VoiceOver iOS 26/27, TalkBack) on how often `<progress>` value changes are announced without a live region.

---

## Q6. 2025–2026 changes that affect this app (iOS alternative engines in the EU and Japan, Safari 18/26/27 web-app changes, Chrome and Firefox download and PWA changes)

### Takeaway
The platform map hasn't fundamentally changed. **iOS is still WebKit-only in practice:** EU alternative engines have been allowed since iOS 17.4 and Japan's since iOS 26.2, but as of June 2026 no browser maker had shipped one. The notable WebKit changes are iOS 26 opening every Home Screen site as a web app by default, Declarative Web Push (18.4), and Safari 27's service worker static routing. None fix Home Screen downloads or add Share Target or Background Fetch. Chrome brought File System Access pickers to Android (M132) and narrowed desktop freezing (133). Firefox gained `readText()` (125), Windows "web apps" (Labs, 141/142) and download-resume fixes on Android (154). No 2025–26 change to Chrome's download bubble was found.

### Cited Findings
- **Safari 26 (WWDC25 post dated 2025-06-09; iOS/iPadOS/macOS/visionOS 26):** Home Screen sites open as web apps by default ("Open as Web App" toggle); new File System WritableStream API; known fingerprinting scripts blocked from long-lived script-written storage; Web Inspector can auto-inspect and pause new service workers. — [WebKit: News from WWDC25](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
- **Safari 18.4 (March 2025):** Declarative Web Push for iOS/iPadOS Home Screen web apps. — [WebKit: Meet Declarative Web Push](https://webkit.org/?p=16535) [search summary]
- **iOS 18.4 (April 2025):** WebKit bug 290847, Home Screen web app downloads stranding the app; still NEW at access time. — [WebKit bug 290847](https://bugs.webkit.org/show_bug.cgi?id=290847)
- **iOS 26.1 (late 2025):** user reports of Safari downloads cancelling on app switch. — [Apple Community 256211824](https://discussions-jp-prz.apple.com/en/thread/256211824) [search summary]
- **Safari 27 beta (WWDC26 post dated 2026-06-08; iOS/iPadOS/macOS 27):**
  - mostly quality work (a search summary of the post cites 58 new features and 525 fixes [search summary]);
  - Service Worker **static routing API**;
  - Cookie Store `maxAge`;
  - secure cookies on loopback HTTP;
  - `EventSource` closes on `window.stop()`;
  - many accessibility fixes;
  - customizable `<select>` and the `<model>` element [search summary];
  - **nothing on Home Screen web apps, manifest, push, badging, storage quotas, Background Fetch/Sync or Share Target** (per the fetched post).

  caniuse (Nov 2026) lists Safari through 27.3 and iOS Safari through 27.2. — [WebKit: News from WWDC26](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/); [caniuse: showSaveFilePicker](https://caniuse.com/mdn-api_window_showsavefilepicker)
- **EU:**
  - Apple's alternative-engine entitlements apply to EU users on iOS 17.4+ / iPadOS 18+.
  - With iOS 18.2 (announced Oct 2024), EU third-party browsers can create Home Screen web apps that run on **their own engine**.
  - Apple had planned to remove Home Screen web apps in the EU with iOS 17.4, then reversed that after EU scrutiny (early March 2024).

  — [Apple: Using alternative browser engines in the EU](https://developer.apple.com/support/alternative-browser-engines) [search summary]; [MacRumors 2024-10-24](https://macrumors.com/2024/10/24/ios-18-2-eu-third-party-browser-web-apps)
- **Status June 2026:** more than two years on, **no browser maker had shipped a non-WebKit engine on iOS**. Microsoft's Edge team published preliminary numbers from a Blink-on-iOS *research prototype* (BrowserEngineKit) on iOS 26.5.1: about 28.6% higher on Speedometer 3.1, measured on the author's own device. — [MacRumors 2026-06-17](https://macrumors.com/2026/06/17/webkit-rule-costs-ios-users-browser-performance)
- **Japan (iOS 26.2+):** non-WebKit engines are allowed in dedicated browser apps (Web Browser Engine Entitlement, with Default Browser entitlement) and in-app browsing by engine stewards. Requirements: **Japan-only distribution**, ≥90% Web Platform Tests and ≥80% Test262, security and privacy commitments (e.g. third-party cookies blocked by default, storage partitioned per top-level site), and engine updates shipped within 15 days for in-app browsers. The page doesn't mention web apps. — [Apple: Using alternative browser engines in Japan](https://developer.apple.com/support/alternative-browser-engines-jp)
- **Chrome:**
  - File System Access enabled on Android in **M132** (stable 2025-01-14).
  - Desktop "freezing on Energy Saver" (Chrome 133, post dated 2025-01-20).
  - The download bubble replaced the download shelf in 2023; the flag to disable it was removed after 119.0.6045.124.

  — [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/file-system-access/); [Chrome: Freezing on Energy Saver](https://developer.chrome.com/blog/freezing-on-energy-saver) [search summary]; [Winaero](https://winaero.com/restore-download-panel-google-chrome) [search summary]
- **Firefox:**
  - `readText()` on by default in **125** (desktop and Android);
  - `read()`/`write()` in **127**;
  - Windows "web apps" Labs feature in **142** (Mozilla) or **141** (Neowin);
  - Firefox Android "Downloads v2" (2025 meta-bug) with the resume fix resolved for **154**.

  — [Bugzilla 1877400](https://bugzilla.mozilla.org/show_bug.cgi?id=1877400); [Mozilla Connect](https://connect.mozilla.org/t5/firefox-labs/give-web-apps-in-firefox-a-try-on-labs-and-tell-us-what-you/m-p/104750) [search summary]; [Neowin](https://www.neowin.net/amp/firefox-is-finally-getting-a-feature-users-have-been-begging-to-have-for-ages/) [search summary]; [Bugzilla 1819001](https://bugzilla.mozilla.org/show_bug.cgi?id=1819001)

### Inferences
- For product planning, treat **all iOS browsers (EU and Japan included) as Safari 26/27-equivalent** through at least 2027. Nothing shipped as of mid-2026, and Japan's path is limited to Japan-only distribution.
- iOS 26's "every Home Screen site is a web app" default makes the Home Screen download bug *more* likely to hit users who simply bookmark the site to their Home Screen. Standalone-mode detection and guidance (Q1) is now a requirement, not an edge case.
- Safari 27's service worker static routing could let a service worker skip `/api/jobs/*/file` and SSE routes entirely, so downloads and streams never pass through the worker. That's useful if you ship a service worker for offline shell caching.

### Gaps
- No 2025–2026 Chrome release notes about download UI changes (Android or desktop) were found; I can't confirm or deny any download-bubble changes in that period.
- Safari 26.x/27.x release notes weren't checked line by line for download-manager changes. The WWDC posts list none.
- iOS 27 GA date and the then-current point release weren't verified from Apple (caniuse listing only).
- Chrome's current stable version as of 2026-11-24 wasn't verified. The caniuse "current" columns were used without confirming release dates.

---

## Q7. Overall: what can the app rely on, and does a PWA add real value? (support matrix with versions, plus recommendations)

### Takeaway
**Rely on** these in every target browser:
- same-origin HTTP downloads with `Content-Disposition: attachment` and RFC 5987 `filename*`;
- byte-range and strong-validator support on the server;
- EventSource plus a polling fallback;
- `readText()` from a click handler, with an input-field fallback;
- `navigator.share` on mobile.

**Don't rely on** download continuation in the background on iOS, or on any PWA-only API for the core flow. **A PWA adds real value on Android** (Share Target from other apps, WebAPK install, completion push). It **adds little on desktop**, and **on iOS it currently hurts the core flow**, because Home Screen web apps strand users on file downloads (WebKit 290847, open since April 2025). Ship a manifest and light PWA plumbing as progressive enhancement. Promote install on Android only, and on iOS detect standalone mode and steer users back to Safari for downloads.

### Cited Findings

**Support matrix.** ✅ = supported, ⚠️ = caveats, ❌ = not supported, "nrv" = not re-verified this session. Versions are first-supported versions.

| Capability | iOS/iPadOS Safari tab (iOS 26–27; all iOS browsers) | iOS Home Screen web app | Chrome Android | Samsung Internet | Firefox Android | Chrome / Edge desktop | Safari macOS | Firefox desktop | Sources |
|---|---|---|---|---|---|---|---|---|---|
| Same-origin `attachment` download → native download manager | ✅ to Files > Downloads (location configurable) | ❌ "Open in…" dead end; force-quit needed (WebKit 290847, NEW) | ✅ default download location; foreground-service download | ✅ (own location setting; [search summary]) | ✅ | ✅ | ✅ (Dock web app also OK) | ✅ | [WebKit 290847](https://bugs.webkit.org/show_bug.cgi?id=290847); [Apple 102440](https://support.apple.com/102440); [Chrome Help](https://support.google.com/chrome/answer/95759?hl=en&co=GENIE.Platform%3DAndroid); [CR 2735073002](https://codereview.chromium.org/2735073002) |
| `<a download>` | ✅ iOS 13 | ❌ (same bug) | ✅ (mirror of Chrome 14); cross-origin ignored (65+) | ✅ mirror | ⚠️ 20; name used only for blob:/data: | ✅ Chrome 14 / Edge 18; cross-origin ignored (Chrome 65+, Edge 79+) | ✅ 10.1 | ✅ 20 (82+: overrides `inline` same-origin) | [BCD a.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/a.json); [BCD Content-Disposition](https://raw.githubusercontent.com/mdn/browser-compat-data/main/http/headers/Content-Disposition.json) |
| `filename*=UTF-8''…` (RFC 5987) | ✅ (Safari doesn't decode %-escapes in plain `filename`) | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | [MDN Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition) |
| Auto-resume of interrupted download | ⚠️ undocumented; relies on Range; anecdotal | n/a | ✅ needs strong ETag, or Last-Modified ≥60 s before Date; If-Range | ⚠️ Chromium-based, unverified | ⚠️ resume fixed for 154 (restarts if Range ignored); drop-outs reported | ✅ same as Chrome Android | ⚠️ unverified | ⚠️ same bug as Android reproduced | [CR 1444253003](https://codereview.chromium.org/1444253003); [CR 1481143002](https://codereview.chromium.org/1481143002); [Bugzilla 1819001](https://bugzilla.mozilla.org/show_bug.cgi?id=1819001); [Cloudflare](https://developers.cloudflare.com/cache/troubleshooting/mp4-videos-on-ios-and-safari/) |
| Download continues when app backgrounded or screen locked | ⚠️ conflicting reports (iOS 26.1 cancels on app switch vs. 2 GB finished while locked) | n/a | ✅ foreground service | ⚠️ unverified | ⚠️ notification can vanish if app killed | ✅ | ✅ | ✅ | [Apple Community 256211824](https://discussions-jp-prz.apple.com/en/thread/256211824); [MacRumors forum](https://forums.macrumors.com/threads/downloading-files-continuously-in-the-background.2461737); [Bugzilla 1833297](https://bugzilla.mozilla.org/show_bug.cgi?id=1833297) |
| Blob-based download of >1 GB | ⚠️ memory-bound, limits undocumented | ⚠️ | ❌ in-memory RAM/100; disk 6% of storage | ❌ (Chromium) | ⚠️ unverified | ⚠️ 2 GB in memory; disk/10 | ⚠️ unverified | ⚠️ unverified | [Chromium blob README](https://chromium.googlesource.com/chromium/src/+/main/storage/browser/blob/README.md); [StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js) |
| Install as app | Share > Add to Home Screen (Safari, Chrome, Edge, Firefox, Orion; 16.4+); iOS 26 opens it as a web app by default; no `beforeinstallprompt` | — | ✅ WebAPK (GMS); can install any site | ✅ WebAPK on Samsung devices | ⚠️ home-screen shortcut only | ✅ (any site) | ✅ Add to Dock (Sonoma+) | ❌ manifest install; Windows Labs "web apps" (141/142) | [MDN installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable); [WebKit WWDC25](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/) |
| Web Share Target (receive shared URL) | ❌ | ❌ | ✅ 76 | ⚠️ mirror (12.0, inferred; unverified) | ❌ parses, no effect | ✅ Chrome 89 (platform scope unclear); Edge mirror | ❌ | ❌ | [BCD share_target](https://raw.githubusercontent.com/mdn/browser-compat-data/main/manifests/webapp/share_target.json) |
| Web Share (`navigator.share`, send) | ✅ 12.2 | ✅ (nrv) | ✅ | ✅ 8.2 | ✅ | ✅ Chrome 128 (partial 89–127); Edge 95 (partial 81–94) | ✅ 12.1 | ❌ | [caniuse web-share](https://caniuse.com/web-share) |
| Background Fetch | ❌ | ❌ | ✅ 74 | ✅ mirror (11.0, inferred) | ❌ | ✅ 74 | ❌ | ❌ | [BCD BackgroundFetchManager](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BackgroundFetchManager.json) |
| Background Sync (one-off) | ❌ | ❌ | ✅ 49 | ✅ mirror (5.0, inferred) | ❌ | ✅ 49 | ❌ | ❌ | [BCD SyncManager](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SyncManager.json) |
| `showSaveFilePicker` (File System Access) | ❌ (WebKit opposed) | ❌ | ⚠️ 132 (Android intents; no atomic writes; save-name UX issues) | ⚠️ 29 | ❌ | ✅ 86 | ❌ | ❌ (negative position) | [web-features](https://web-platform-dx.github.io/web-features-explorer/features/file-system-access/); [caniuse](https://caniuse.com/mdn-api_window_showsavefilepicker); [blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/x3IcFv2jY6c) |
| OPFS `storage.getDirectory()` | ✅ 15.2 | ✅ | ✅ 109 | ✅ mirror | ✅ 111 | ✅ 86 | ✅ 15.2 | ✅ 111 | [BCD StorageManager](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/StorageManager.json) |
| Web Push notifications | ❌ in a Safari tab | ✅ 16.4+ (permission from user gesture; manifest standalone/fullscreen); Declarative Web Push 18.4 | ✅ (nrv) | ✅ (nrv) | ✅ (nrv) | ✅ (nrv) | ✅ Safari 16.1+ | ✅ (nrv) | [WebKit Web Push 2023](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/); [WebKit DWP](https://webkit.org/?p=16535) [search summary] |
| Badging API | ❌ | ✅ 16.4+ (with notification permission) | nrv | nrv | nrv | nrv (installed PWAs) | nrv | nrv | [WebKit Web Push 2023](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |
| Storage eviction risk | ⚠️ 7-day cap on script-writable storage without interaction; LRU eviction | ✅ own day count; first-party data not expected to be deleted | (Chromium heuristics, nrv) | (nrv) | (nrv) | (nrv) | ⚠️ 7-day cap | (nrv) | [WebKit 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/); [WebKit 2023](https://webkit.org/blog/14403/updates-to-storage-policy/) |
| `storage.persist()` / `estimate()` | ✅ 15.2 / 17 (heuristic; Home Screen web app is WebKit's example) | ✅ (likely granted) | ✅ 55 / 61 | ✅ mirror | ✅ 57 / 57 | ✅ 55 / 61 | ✅ 15.2 / 17 | ✅ 57 / 57 | [BCD StorageManager](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/StorageManager.json); [WebKit 2023](https://webkit.org/blog/14403/updates-to-storage-policy/) |
| `clipboard.readText()` | ✅ 13.4 (gesture plus "Paste" callout; same-origin content automatic; secure context only) | ✅ presumably same (nrv) | ✅ 66 (`clipboard-read` permission) | ✅ mirror (9.0, inferred) | ✅ 125 (paste menu) | ✅ Chrome 66 / Edge 79 | ✅ 13.1 | ✅ 125 (paste menu) | [BCD Clipboard](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Clipboard.json); [WebKit Async Clipboard](https://webkit.org/blog/10855/async-clipboard-api/); [Bugzilla 1877400](https://bugzilla.mozilla.org/show_bug.cgi?id=1877400) |
| EventSource (SSE) | ✅ (resync on resume; `error` may not fire on iOS 18) | ✅ (nrv) | ✅ (frozen after 5 min hidden) | ✅ | ✅ | ✅ (1 s / 1 min timer throttling when hidden) | ✅ | ✅ | [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource); [Chrome 88 throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88); [Apple forums 765183](https://developer.apple.com/forums/thread/765183) [search summary] |

- SSE connection cap: 6 per browser + host across tabs on HTTP/1.1; 100 streams by default over HTTP/2. — [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

### Inferences (recommendations)
1. **Download delivery:**
   - Same-origin `GET` with `Content-Disposition: attachment` plus both `filename` and `filename*`, real `Content-Type`, `Content-Length`, `Accept-Ranges: bytes`, a strong `ETag` (not Express/send's default weak one) and `Last-Modified`; honor `Range`/`If-Range`.
   - No compression on media.
   - Trigger from a user-tapped `<a>` "Save file" button.
   - Never fetch-to-blob.
   - Keep files and validators stable for a long window (ideally >20 h).
2. **iOS handling:**
   - Treat iOS Safari tabs as fully supported for downloads, but tell users where files land (Files > Downloads) and how to move a video to Photos.
   - Advise keeping Safari open for large files.
   - In iOS standalone mode, show a persistent notice ("Downloads don't work in the Home Screen app on iOS; open in Safari") instead of offering the download link, until WebKit 290847 is fixed. Re-test on each iOS release.
   - Optionally offer `navigator.share({ files })` for *small* files only (it needs an in-memory Blob) as a "Save to Photos" shortcut. File-share support wasn't verified this session.
3. **PWA posture:**
   - Ship a manifest (`name`, icons 192/512, `start_url`, `display: standalone`, `id`, `share_target` with GET `/share?url&text&title`) and optionally a minimal service worker that **never intercepts** `/api/jobs/*/file` or SSE routes (Safari 27 static routing helps).
   - Show a custom install button via `beforeinstallprompt` on Android Chromium only.
   - Don't promote install on iOS.
   - Use Web Push "your file is ready" on Android, and on desktop for long jobs. On iOS it's only available after install, which conflicts with the download bug, so don't rely on it there.
4. **Live progress:**
   - SSE over HTTP/2 (TLS + h2 at the reverse proxy or CDN), one stream per tab multiplexing jobs, with `id:`, `retry:`, heartbeats and `Last-Event-ID` support.
   - The client reconnects and fetches a snapshot on `visibilitychange`, `pageshow`, `online` and `resume`.
   - Watchdog-based reconnect; polling fallback; no WebSocket.
5. **Paste UX:** visible URL input plus "Paste" button calling `readText()` in the click handler, with try/catch fallback to focusing the input and a long-press hint. Also listen to `paste`/`input` events. HTTPS everywhere.
6. **Accessibility:**
   - Native `<progress>` with label and `aria-valuetext`/describedby; indeterminate while queued.
   - One throttled `role="status"` region for milestones, and `role="alert"` for failures.
   - 44×44 primary targets (≥24×24 minimum).
   - Sticky UI must never fully cover focused controls.
   - ≥4.5:1 text and ≥3:1 progress/focus contrast.
   - Expiry over 20 h, or warn-and-extend.
7. **Testing matrix:**
   - iOS 26.x and 27.x (Safari tab and Home Screen web app);
   - Chrome Android current (installed WebAPK and tab);
   - Samsung Internet current on a Samsung device;
   - Firefox Android ≥154;
   - desktop Chrome/Edge, Safari 26/27 and Firefox.

   For each: a >1 GB download, a mid-download network drop (airplane-mode toggle), backgrounding for more than 5 minutes, and a resume.

### Gaps
- Several matrix cells are "nrv" (Android push and badging, Samsung specifics, Safari macOS resume) and should be confirmed against current BCD or MDN before publication.
- No hands-on device verification was possible; the iOS background-download and resume behavior especially needs real-device testing.
- Desktop Chrome/Edge download-bubble behavior changes in 2025–26 couldn't be sourced.
- Web Share file-sharing (`navigator.canShare({files})`) versions weren't captured (caniuse's general page doesn't cover files).

### Source register (all accessed 2026-11-24)
Fetched and read directly:
- https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/ (2026-06-08)
- https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/ (2025-06-09)
- https://webkit.org/blog/14403/updates-to-storage-policy/ (2023-08-10)
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (2023-02-16)
- https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ (2020-03-24)
- https://webkit.org/blog/10855/async-clipboard-api/ (2020-06-23)
- https://bugs.webkit.org/show_bug.cgi?id=290847
- https://developer.apple.com/support/alternative-browser-engines-jp
- https://macrumors.com/2024/10/24/ios-18-2-eu-third-party-browser-web-apps (2024-10-24)
- https://macrumors.com/2026/06/17/webkit-rule-costs-ios-users-browser-performance (2026-06-17)
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Clipboard.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/manifests/webapp/share_target.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BackgroundFetchManager.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SyncManager.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/StorageManager.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/a.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/http/headers/Content-Disposition.json
- https://caniuse.com/mdn-api_window_showsavefilepicker
- https://caniuse.com/web-share
- https://web-platform-dx.github.io/web-features-explorer/features/file-system-access/
- https://groups.google.com/a/chromium.org/g/blink-dev/c/x3IcFv2jY6c
- https://developer.chrome.com/blog/timer-throttling-in-chrome-88
- https://chromium.googlesource.com/chromium/src/+/main/storage/browser/blob/README.md
- https://support.google.com/chrome/answer/95759?hl=en&co=GENIE.Platform%3DAndroid
- https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role
- https://bugzilla.mozilla.org/show_bug.cgi?id=1877400
- https://bugzilla.mozilla.org/show_bug.cgi?id=1819001
- https://www.w3.org/TR/WCAG22/ (first 100k characters read)
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- https://github.com/jimmywarting/StreamSaver.js
- https://github.com/jshttp/etag

Search-result summaries only (page not fetched; lower confidence):
- https://chromium.googlesource.com/chromium/src.git/+/33df9d4f09e56fd37e48ab00c5e925b7ad2941c6/content/browser/download/download_utils.cc
- https://codereview.chromium.org/1444253003
- https://codereview.chromium.org/67883007
- https://codereview.chromium.org/1481143002
- https://codereview.chromium.org/2735073002
- https://auto-bugs.webkit.org/show_bug.cgi?id=249134
- https://auto-bugs.webkit.org/show_bug.cgi?id=209407
- https://auto-bugs.webkit.org/show_bug.cgi?id=236943
- https://bugs.webkit.org/show_bug.cgi?id=308073
- https://developer.apple.com/forums/thread/685138
- https://developer.apple.com/forums/thread/696310
- https://developer.apple.com/forums/thread/716118
- https://developer.apple.com/forums/thread/765183
- https://developer.apple.com/forums/thread/106028
- https://developer.apple.com/documentation/foundation/downloading-files-in-the-background
- https://developer.apple.com/support/alternative-browser-engines
- https://support.apple.com/102440
- https://discussions.apple.com/thread/256063732
- https://discussions-jp-prz.apple.com/en/thread/256211824 (direct fetch returned HTTP 502)
- https://discussions-jp-prz.apple.com/thread/256160022
- https://www.macrumors.com/how-to/change-where-safari-files-download-in-ios/
- https://www.slashgear.com/2215121/where-you-can-find-downloads-on-iphone/
- https://forums.macrumors.com/threads/downloading-files-continuously-in-the-background.2461737
- https://forums.macrumors.com/threads/background-downloading.2187558
- https://developers.cloudflare.com/cache/troubleshooting/mp4-videos-on-ios-and-safari/
- https://webkit.org/?p=16535 (Meet Declarative Web Push)
- https://developer.chrome.com/blog/freezing-on-energy-saver
- https://groups.google.com/a/chromium.org/g/blink-dev/c/NKtuFxLsKgo
- https://developer.chrome.com/docs/web-platform/page-lifecycle-api
- https://winaero.com/restore-download-panel-google-chrome
- https://chrome.google.com/webstore/detail/auto-resume-downloads/pifbhionjpacnpjoaomhdpbekkdphdgd
- https://bugzilla.mozilla.org/show_bug.cgi?id=1912455
- https://bugzilla.mozilla.org/show_bug.cgi?id=1833297
- https://bugzilla.mozilla.org/show_bug.cgi?id=1767941
- https://groups.google.com/a/mozilla.org/g/dev-platform/c/lNXj_A-Lllk
- https://connect.mozilla.org/t5/firefox-labs/give-web-apps-in-firefox-a-try-on-labs-and-tell-us-what-you/m-p/104750
- https://www.neowin.net/amp/firefox-is-finally-getting-a-feature-users-have-been-begging-to-have-for-ages/
- https://geekchamp.com/?p=565612
- https://androidexperto.com/?p=319723
