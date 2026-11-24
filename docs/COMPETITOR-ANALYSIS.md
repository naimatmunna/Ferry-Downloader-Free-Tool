# Competitor Analysis — Ferry

> **Sources.** Ferry research notes in
> `docs/research/research_notes/Universal media downloader landscape/`
> (`competitors.md` primary; `legal_landscape.md`, `engines.md`,
> `web_platform_mobile_ux.md`, `social_platform_policies.md`,
> `video_audio_open_platform_policies.md` supporting). **Every linked source was
> accessed 2026-11-24.**
>
> **Evidence markers.** ⚠️ **competitor-authored** = written by a vendor that
> sells a competing tool. 🔎 **search summary** = seen only in a search-engine
> summary; the page itself was not read. **3P listing** = price from a
> third-party site, not confirmed on the vendor's own page. "—" in a table means
> *not documented in the sources reviewed*, not "absent".
>
> Not legal advice. Companion document: `FEATURE-GAP-ANALYSIS.md`.

---

## 1. Executive summary

* **Three segments, one empty position.** Paid desktop wrappers, free
  open-source tools built on yt-dlp, and ad-funded web rippers. No product
  combines *no ads or trackers*, *a polished mobile web flow* and *a sustainable
  model*. cobalt came closest, but its repository has been dormant since
  2026-04-06 and an open issue (2026-11-17) asks to archive it
  ([GitHub commits API](https://api.github.com/repos/imputnet/cobalt/commits?per_page=12)).
* **Reliability is not a moat.** YouTube changes broke SnapDownloader (Aug 2026),
  4K Video Downloader Plus (Nov 2026), NewPipe (June, 360p only) and cobalt's
  main instance (mid-2025). Users meet opaque error codes and wait days for
  support ([Trustpilot: SnapDownloader](https://www.trustpilot.com/review/snapdownloader.com);
  [Trustpilot: 4K](https://www.trustpilot.com/review/www.4kdownload.com)).
* **The category's trust deficit is structural.** Push-notification traps, fake
  download buttons, clone domains, bundled installers and even compromised
  official channels: JDownloader's site served a RAT on May 6–7, 2026; 130K+
  users installed data-stealing "TikTok downloader" extensions (Apr 2026)
  ([Malwarebytes](https://www.malwarebytes.com/blog/news/2026/05/attackers-replaced-jdownloader-installer-downloads-with-malware);
  [Akamai](https://www.akamai.com/blog/security-research/stealtok-130k-users-compromised-by-data-stealing-tiktok-video-downloaders)).
* **Paid tools break their own promises.** 4K's classic licences stopped
  carrying over, Video DownloadHelper lifetime licences went inactive, VidJuice
  caps reinstalls ([4K FAQ](https://www.4kdownload.com/blog/2023/07/26/4k-video-downloader-faq);
  [VDH forum](https://groups.google.com/g/video-downloadhelper-q-and-a/c/UNm9ctxLIU0);
  [Trustpilot: VidJuice](https://www.trustpilot.com/review/vidjuice.com?page=2)).
* **Enforcement is escalating against YouTube-to-MP3 rippers**: Denmark blocks
  (2023), Y2Mate shut down via Vietnam (Oct 2025), Canada's first dynamic
  blocking order (June 2026), and IFPI asking for yt-dlp on the EU piracy watch
  list (Sept 2026). Courts in the US (*Yout v. RIAA*, D. Conn. 2022) and Germany
  (OLG Hamburg 2024, *Uberspace*) treated YouTube's signature cipher as an
  effective technical protection measure.
* **Mobile is the least-served surface.** The best Android tools are
  sideloaded; iOS users are sent to file-manager apps or weekly-subscription
  copycats. Web Share Target works only on Chromium for Android, and iOS
  Home-Screen web apps strand downloads (WebKit bug 290847).
* **Ferry's opening:** compete on *trust and craft*, not site counts — zero dark
  patterns, honest labels, explained failures, visible platform rules, and a
  mobile flow that respects each OS's limits. Ferry deliberately does less on
  YouTube and logged-in content and must say so plainly (see
  `FEATURE-GAP-ANALYSIS.md` §3).

---

## 2. Market map

| Segment | Representative products | How they make money | What they do well | Structural weakness |
|---|---|---|---|---|
| **A. Paid desktop wrappers** (plus one freemium extension) | SnapDownloader, 4K Video Downloader Plus, VidJuice UniTube, Video DownloadHelper | Trials, daily caps, subscriptions, "lifetime" licences | Speed, presets, playlist and subscription automation, subtitles | Desktop-bound; break together when YouTube changes; licence changes; telemetry undocumented |
| **B. Free open-source and donationware** | yt-dlp; GUIs Stacher, Parabolic, Open Video Downloader (OVD), Seal; NewPipe; cobalt; ClipGrab; JDownloader 2 | Donations, GitHub Sponsors, hosting sponsors | Breadth, no ads, power features, strong privacy (NewPipe, cobalt) | Technical UX; sideloading; one upstream (yt-dlp); volunteer maintenance; installer bundling (ClipGrab, JDownloader) |
| **C. Ad-funded web rippers** | SaveFrom.net, Y2Mate + clones, SnapSave, ssstik.io / SnapTik | Display and push-notification ads | Zero install; paste-and-go; reachable from any phone browser | Dark patterns, clones and phishing lookalikes; primary target of blocking orders and shutdowns |

**Where Ferry sits:** delivered on the web like segment C, clean like the best of
segment B, and — unlike any segment — explicit about what each platform allows.
Its structural risk is the inverse of C's: it will refuse requests that rippers
accept.

---

## 3. Product comparison

The research scoped 16 products or families; they are listed as 17 rows because
the yt-dlp front-ends differ in platform and licence. Legend: ✅ documented ·
🟡 partial, paywalled or caveated · ❌ documented as missing · — not documented.

### 3a. Capabilities

| Product | Type | Sites: claimed → realistic | Max quality | Audio extraction | Playlists / batch | Subtitles | Trim | Key sources |
|---|---|---|---|---|---|---|---|---|
| SnapDownloader | Desktop (Win/macOS) | 900+ → unverifiable; wave of "error 3037" failures, Aug 2026 | 8K (claimed) | ✅ MP3/AAC/WMA | ✅ playlists, channels, batch queue, scheduler | ❌ not listed on homepage | ✅ | [site](https://snapdownloader.com/), [Trustpilot](https://www.trustpilot.com/review/snapdownloader.com) |
| 4K Video Downloader Plus | Desktop (Win/macOS/Ubuntu) + Android app | 8 named sources → YouTube failures and 360p-file complaints, Nov 2026 | 4K/8K | ✅ MP3/M4A/OGG | 🟡 one click, but item caps on free tier; private playlists paid | ✅ SRT, 50+ languages | — | [product](https://www.4kdownload.com/products/videodownloader-42), [Trustpilot](https://www.trustpilot.com/review/www.4kdownload.com) |
| yt-dlp | CLI | "thousands" → 1,751 extractors, 136 (7.9%) marked broken; ≈850–1,250 working integrations (Ferry's local count of 2026.11.23) | Source max; full YouTube needs a JS runtime since 2025.11.12 | ✅ | ✅ + download archive | ✅ | ✅ time ranges | [README](https://github.com/yt-dlp/yt-dlp), [issue #15012](https://github.com/yt-dlp/yt-dlp/issues/15012) |
| Stacher | Desktop GUI | Inherits yt-dlp (can point at any fork) | — | — | — | — | — | [VideoHelp](https://www.videohelp.com/software/Stacher/version-history) |
| Parabolic | Desktop GUI (+ browser extensions) | Inherits yt-dlp | — | ✅ mp3/opus/flac/wav | 🟡 concurrent downloads | ✅ | — | [GitHub](https://github.com/NickvisionApps/Parabolic) |
| Open Video Downloader | Desktop GUI | Inherits yt-dlp | Resolution and fps choice | ✅ audio-only mode | ✅ playlists, balanced queue | ✅ | — | [GitHub](https://github.com/jely2002/youtube-dl-gui) |
| Seal | Android app (yt-dlp) | Inherits yt-dlp | — | ✅ with embedded tags and art | ✅ one-click playlists | ✅ embedded | 🟡 via custom yt-dlp commands | [GitHub](https://github.com/JunkFood02/Seal) |
| cobalt | Web app + self-hostable API | 21 services → YouTube off the main instance since mid-2025; repo dormant since 2026-04-06 | 8K/HDR in API docs; 1080p cap reported on main instance | ✅ audio and mute modes | — (unconfirmed) | ✅ since v11.2, 7 services | — | [API README](https://raw.githubusercontent.com/imputnet/cobalt/main/api/README.md), [11.2 changelog](https://github.com/imputnet/cobalt/blob/main/web/changelogs/11.2.md) |
| SaveFrom.net | Web + helper extension | — → left the US in 2020, blocks Canada; YouTube capped at 360p in 2024 (🔎) | 360p on YouTube (2024, 🔎) | — | — | — | — | [TorrentFreak](https://torrentfreak.com/music-labels-win-canadian-site-blocking-order-against-y2mate-ytmp3-and-savefrom/), [Habr](https://habr.com/en/news/841122) |
| SnapSave | Web (+ Android "SnapX") | Facebook-first, sister pages for IG/TikTok/X/Threads → HQ needs a slow server "render" | 4K advertised; its FAQ admits audio loss on render | — | — | — | — | [snapsave.app](https://snapsave.app/) |
| Y2Mate + clones | Web | Operator shut down Oct 2025 → traffic now flows to clones and typosquats | — | ✅ (named as a YouTube-to-MP3 ripper in enforcement) | — | — | — | [CMU](https://completemusicupdate.com/legal-action-in-vietnam-takes-stream-ripper-y2mate-offline/) |
| ClipGrab | Desktop (Win/macOS/Linux) | 4 official sites + heuristic → runs on yt-dlp | — | ✅ MP3/OGG | — | — | — | [clipgrab.org](https://clipgrab.org/) |
| JDownloader 2 | Desktop download manager (Java) | Hundreds of file hosts | n/a | — | ✅ queue manager, RAR extraction | — | — | [Wikipedia](https://en.wikipedia.org/wiki/JDownloader) |
| VidJuice UniTube | Desktop (+ web; phones via cloud sync) | 10,000+ → built-in browser fails on some sites | 8K (claimed) | ✅ | ✅ | — | 🟡 YouTube only | [vidjuice.com](https://www.vidjuice.com/), [G2](https://g2.com/products/vidjuice-unitube/reviews) |
| Video DownloadHelper | Browser extension + companion app | 1,000+ → Chrome build excludes YouTube | — | — | — | 🟡 premium only | — | [site](https://www.downloadhelper.net/), [Chrome Web Store](https://chromewebstore.google.com/detail/video-downloadhelper/lmjnegcaeklhafolokijcfjliaokphfk) |
| ssstik.io / SnapTik | Web (+ Android apps) | TikTok (+ X/IG sister sites); public accounts only | "HD" | ✅ MP3 | — | — | — | [ssstik.io](https://ssstik.io/) |
| NewPipe | Android client | YouTube, PeerTube, SoundCloud, Bandcamp, media.ccc.de → breaks with YouTube changes; 360p only until v0.28.8 (June; year inferred as 2026) | Format and resolution choice | ✅ | 🟡 per item | ✅ captions | — | [newpipe.net](https://newpipe.net/), [releases](https://github.com/TeamNewPipe/NewPipe/releases) |

### 3b. Business model, trust and mobile

| Product | Pricing / limits | Ads / trackers | Security & privacy incidents | Mobile UX |
|---|---|---|---|---|
| SnapDownloader | 48-hour trial, then paid; 3P listing ≈$7.99/mo, $29.99/yr, $39.99 lifetime ([MSPowerUser](https://mspoweruser.com/snapdownloader-review/)) | None reported; no telemetry statement | None found | ❌ desktop only |
| 4K Video Downloader Plus | Free tier capped (10/day per [TidBITS](https://tidbits.com/watchlist/4k-video-downloader-plus-26-2/), not on 4K's pages); $15/yr; $25 or $45 lifetime | Vendor says ad-free; website uses analytics and marketing cookies | None found; classic→Plus licence break | 🟡 separate Android app |
| yt-dlp | Free (Unlicense) | None | 13 GitHub advisories, 6 in 2026, all fixed by 2026.07.04; mostly in optional features ([advisories](https://github.com/yt-dlp/yt-dlp/security/advisories)) | ❌ no official app |
| Stacher | Freeware | Unconfirmed | None found (developer and licence unconfirmed) | ❌ |
| Parabolic | Free (MIT), sponsors | None found; no privacy statement | None found | ❌ |
| Open Video Downloader | Free (AGPL-3.0), sponsors | None found; no privacy statement | None found; Store builds lag on yt-dlp updates | ❌ |
| Seal | Free (GPL-3.0) | None; F-Droid flags its GitHub update check ([F-Droid](https://f-droid.org/packages/com.junkfood.seal/)) | None found | 🟡 native Android, outside Google Play |
| cobalt | Free; donations and hosting sponsor; web UI licence is non-commercial | No ads; anonymous analytics that users can switch off ([11.0](https://github.com/imputnet/cobalt/blob/main/web/changelogs/11.0.md)) | XSS CVE-2024-51498 (fixed 10.2.1); ships an optional PO-token session server and per-download IPv6 rotation ([env docs](https://raw.githubusercontent.com/imputnet/cobalt/main/docs/api-env-variables.md)) | ✅ best mobile web: on-device processing (iOS 15+), large files on iOS 18+ |
| SaveFrom.net | Free, ad-funded | Push-notification ads, redirects, fake virus alerts ([PCRisk](https://pcrisk.com/removal-guides/14858-savefrom-net-virus)) | "Adware.SaveFrom" family ([Malwarebytes](https://www.malwarebytes.com/blog/detections/adware-savefrom)); helper pulled by Opera/Chrome (undated reports) | 🟡 mobile web only |
| SnapSave | Free, ad-funded | Ad blocks | Lookalike snapsave.io classed as phishing ([Gridinsoft](https://gridinsoft.com/online-virus-scanner/url/snapsave-io)) | 🟡 sends iOS users to a third-party file manager |
| Y2Mate + clones | Free, ad-funded | Notification-permission spam, even with the browser closed ([MalwareTips](https://malwaretips.com/blogs/?p=163606)) | Dangerous clones and typosquats ([y2mate.lt scan](https://tools.malwaretips.com/url-scan/y2mate.lt)) | 🟡 mobile web only |
| ClipGrab | Free (GPLv3), donations | Installer offers ([Chocolatey](https://community.chocolatey.org/packages/clipgrab)) | Adware detections on the 3.9.10 installer ([Gridinsoft](https://gridinsoft.com/online-virus-scanner/id/e92c5cf7509dd9792fac8202fb08295dfc9e5f18663db81bf07990de1bc85893)); bundled-AV claim, June 2026 (⚠️ [StreamFab](https://streamfab.com/clipgrab-review), unverified) | ❌ |
| JDownloader 2 | Donationware | Adware installer history (2012, 2014) | Official site compromised May 6–7, 2026; installers swapped for a RAT | ❌ |
| VidJuice UniTube | 3P listing (Sept 2026): $29.95/mo, $49.95/yr, $69.95 lifetime, no trial ([iTechGuides](https://www.itechguides.com/products/vidjuice-unitube/)) | None reported; telemetry undocumented | None found; 5-reinstall cap on lifetime licence (user report) | 🟡 phones via cloud sync |
| Video DownloadHelper | Freemium, one-time premium (current price unconfirmed) | Claims no tracking | None for VDH; the extension channel itself is compromised (StealTok, GhostPoster, §5) | ❌ desktop browsers |
| ssstik.io / SnapTik | Free, ad-funded; copycat iOS apps at $4.99/week ([App Store](https://apps.apple.com/us/app/snaptik/id1572161935)) | Ads imitate download buttons (VPN-vendor blog, [UFO VPN](https://ufovpn.io/blog/is-snaptik-safe-or-not)) | Impersonator sites; an automated scan rates ssstik "suspicious" (low weight) | 🟡 Safari on iOS (≤ iOS 12 unsupported); Android app |
| NewPipe | Free, donations | None; data stays on device | None found | 🟡 native Android 6+, outside Google Play |

---

## 4. Segment deep dives

### 4.1 Segment A — paid desktop wrappers

**What they do well.** Speed and simplicity are the most praised traits
(SnapDownloader reviews, Aug 2026). 4K's saved "Smart Mode" presets, 50+
subtitle languages and automatic downloads from subscribed playlists earn loyal
users. SnapDownloader adds a trimmer and a scheduler. 4K's vendor even
debunked the "320 kbps YouTube audio" myth publicly in 2020
([4K blog](https://4kdownload.com/blog/2020/06/17/youtube-myth-debunked-320kbps-audio-streaming)).

| Complaint | Dated evidence |
|---|---|
| Failures after source changes | SnapDownloader "error 3037" wave, Aug 2026, fixed in v1.15.42 ([Trustpilot](https://www.trustpilot.com/review/snapdownloader.com)). 4K review titled *Unable to download YouTube videos*, Nov 20, 2026 ([Trustpilot](https://www.trustpilot.com/review/www.4kdownload.com)). 4K, yt-dlp and others failing in late Jan 2026 (🔎 [PiunikaWeb](https://piunikaweb.com/2026/01/30/youtube-blocking-video-downloaders-premium-crackdown/)). 4K v26.2 (Aug 2, 2026) slowed subscription polling to avoid YouTube IP restrictions ([TidBITS](https://tidbits.com/watchlist/4k-video-downloader-plus-26-2/)). |
| Slow support | SnapDownloader replies take days to a week; a lifetime buyer says it works about three times in four and moved to free tools ([Trustpilot](https://www.trustpilot.com/review/snapdownloader.com)). |
| Format and quality limits | 4K users report files limited to 360p and stuttering playback (Nov 2026, [Trustpilot](https://www.trustpilot.com/review/www.4kdownload.com)). |
| Premium restrictions | 4K: daily cap, playlist-item caps, private videos and playlists paid ([product page](https://www.4kdownload.com/products/videodownloader-42)). SnapDownloader: everything locks after 48 hours. VDH: unlimited downloads, faster processing and subtitles are premium ([site](https://www.downloadhelper.net/)); older reviews describe a QR watermark on free conversions (dates unverified, [AMO](https://addons.mozilla.org/en-US/firefox/addon/video-downloadhelper/reviews/2071077)). |
| Licence instability | 4K told a user on Nov 23, 2026 that the classic app was discontinued on Feb 1, 2025 ([Trustpilot](https://www.trustpilot.com/review/www.4kdownload.com)); ⚠️ competitor-authored pages give Feb 1, 2026 ([Wondershare](https://videoconverter.wondershare.com/video-extractor-tips/4k-video-downloader-plus-review.html)). VDH lifetime licences went inactive after a licensing change ([forum](https://groups.google.com/g/video-downloadhelper-q-and-a/c/UNm9ctxLIU0)). VidJuice: refund called a "hoax" and a reinstall cap ([Trustpilot](https://ca.trustpilot.com/review/vidjuice.com)). |
| Privacy opacity | No telemetry statement on SnapDownloader's homepage; 4K's site sets analytics and marketing cookies; VidJuice telemetry undocumented. |
| Mobile usability | Desktop-first. 4K has a separate Android app; VidJuice reaches phones only through cloud sync ([vidjuice.com](https://www.vidjuice.com/)). |

### 4.2 Segment B — free open-source and donationware

**What they do well.** Breadth (yt-dlp), real power features (format selection,
time-range downloads, metadata embedding, filename templates, download
archives), no ads, and the strongest privacy models: NewPipe keeps data on the
device and avoids Google APIs ([newpipe.net](https://newpipe.net/)); cobalt runs
a zero-log policy with on-device processing
([about](https://cobalt.tools/about/general)). Community GUIs (Parabolic,
Stacher) are the r/youtubedl picks (🔎 secondary summary,
[tilnote](https://tilnote.io/en/pages/68c3a0cdf8854f8ac9416df1)).

| Complaint | Dated evidence |
|---|---|
| Fragility under YouTube's arms race | yt-dlp needs an external JS runtime since 2025.11.12 ([issue #15012](https://github.com/yt-dlp/yt-dlp/issues/15012)); PO tokens it cannot mint; guest limit of roughly 300 videos per hour ([wiki](https://github.com/yt-dlp/yt-dlp/wiki/Extractors)). NewPipe users stuck at 360p until v0.28.8 (June) and F-Droid's pipeline delays fixes ([forum](https://forum.f-droid.org/t/solved-newpipe-liberatube-skytube-all-stopped-working/23286)). cobalt's changelog: "youtube is unavailable on the main instance again" (2025, [11.2](https://github.com/imputnet/cobalt/blob/main/web/changelogs/11.2.md)). |
| Maintenance risk | cobalt: last commits 2026-04-06; archive request 2026-11-17 citing 230+ issues ([commits](https://api.github.com/repos/imputnet/cobalt/commits?per_page=12)). Seal lists one sponsor ([GitHub](https://github.com/JunkFood02/Seal)). |
| Misleading errors | yt-dlp's "content isn't available, try again later" actually means rate-limited ([wiki](https://github.com/yt-dlp/yt-dlp/wiki/Extractors)). |
| Technical UX and sideloading | CLI-first; Seal and NewPipe ship outside Google Play; OVD's Store builds lag ([GitHub](https://github.com/jely2002/youtube-dl-gui)). |
| Security | Installer bundling (ClipGrab, JDownloader) and the JDownloader site compromise (§5); yt-dlp's 2026 advisories sit in optional features. |
| Compliance flags | yt-dlp supports browser cookies and impersonation, and its wiki suggests a throwaway account to avoid bans ([wiki](https://github.com/yt-dlp/yt-dlp/wiki/Extractors)); cobalt offers PO-token generation and IP rotation ([env docs](https://raw.githubusercontent.com/imputnet/cobalt/main/docs/api-env-variables.md)). |

### 4.3 Segment C — ad-funded web rippers

**What they do well.** Nothing to install, paste-and-go, reachable from any
phone browser, watermark-free TikTok saves ([ssstik.io](https://ssstik.io/)).
Y2Mate drew more than 620M visits in the year before its shutdown
([CMU](https://completemusicupdate.com/legal-action-in-vietnam-takes-stream-ripper-y2mate-offline/)) —
proof of demand for the zero-install model.

| Complaint | Dated evidence |
|---|---|
| Dark patterns | Push-notification traps, redirects and fake virus alerts ([PCRisk](https://pcrisk.com/removal-guides/14858-savefrom-net-virus)); spam that keeps arriving with the browser closed ([MalwareTips](https://malwaretips.com/blogs/?p=163606)); ads that mimic the download button ([UFO VPN](https://ufovpn.io/blog/is-snaptik-safe-or-not)). |
| Slow processing and false quality claims | SnapSave's HQ files need a slow server render, and its FAQ admits audio loss despite "with sound" claims ([snapsave.app](https://snapsave.app/)). YouTube's best audio is about 160 kbps Opus, so "320 kbps MP3" only inflates the file ([Appuals](https://appuals.com/why-converting-youtube-to-320kbps-mp3-is-a-waste-of-time); [FFmpeg wiki](https://trac.ffmpeg.org/wiki/Encode/HighQualityAudio?version=78)). |
| Domain confusion | y2mate.lt, v26.www-y2mate.com, y2mate.guru and snapsave.io flagged as dangerous or phishing ([MalwareTips](https://tools.malwaretips.com/url-scan/v26.www-y2mate.com); [Gridinsoft](https://gridinsoft.com/online-virus-scanner/url/snapsave-io)). |
| Mobile usability | iOS users sent to a third-party file manager ([snapsave.app](https://snapsave.app/)); copycat "SnapTik" iOS apps with weekly subscriptions and partner-app pushes ([App Store](https://apps.apple.com/us/app/snaptik/id1572161935)). |
| Services vanish | US exit (SaveFrom, 2020), shutdown (Y2Mate, 2025), ISP blocks (§6). |

---

## 5. Trust and safety findings

| Date | Incident | Who | Source |
|---|---|---|---|
| 2012, 2014 | Installer adds adware; the clean build is linked only from a forum post | JDownloader | [Wikipedia](https://en.wikipedia.org/wiki/JDownloader) |
| ≈2020 | Site keeps prompting installs of Ummy Video Downloader (classed as adware/PUP) | SaveFrom.net | [Mozilla support](https://support.mozilla.org/fi/questions/1288902); [PCRisk](https://www.pcrisk.com/removal-guides/13088-ummi-video-downloader-adware) |
| Undated | Opera and Chrome pull the SaveFrom helper extension | SaveFrom.net | [Opera forums](https://forums.opera.com/post/154267) |
| Historic | Windows installer carries OpenCandy / InstallCore offers | ClipGrab | [Chocolatey](https://community.chocolatey.org/packages/clipgrab) |
| 2024 | XSS via a malicious instance's picker item (CVE-2024-51498, fixed 10.2.1) | cobalt | [advisories API](https://api.github.com/repos/imputnet/cobalt/security-advisories?per_page=50) |
| Aug 25, 2025 | Fake YouTube-downloader sites deliver proxyware via a fake "memory cleaner" | Category lure | [Cyber Security News / ASEC](https://cybersecuritynews.com/proxyware-malware-mimic-as-youtube/) |
| 2025 | ~3,000 YouTube videos promoting fake software with infostealers removed | Category lure | [Check Point](https://research.checkpoint.com/2025/youtube-ghost-network/) |
| Jan 19, 2026 | GhostPoster: ~34 extensions (840K+ downloads), incl. "Instagram Downloader" and "Youtube Download", hide code in images and plant a backdoor | Extensions | [Malwarebytes](https://www.malwarebytes.com/blog/news/2026/01/firefox-joins-chrome-and-edge-as-sleeper-extensions-spy-on-users) |
| Apr 20, 2026 | StealTok: ≥12 "TikTok downloader" extensions (130K+ users) fingerprint users; malice added 6–12 months after publishing, several with "Featured" badges | Extensions | [Akamai / LayerX](https://www.akamai.com/blog/security-research/stealtok-130k-users-compromised-by-data-stealing-tiktok-video-downloaders) |
| May 6–7, 2026 | Official installer links swapped for a Python RAT through an unpatched CMS | JDownloader | [Malwarebytes](https://www.malwarebytes.com/blog/news/2026/05/attackers-replaced-jdownloader-installer-downloads-with-malware); [WinFuture](https://winfuture.de/news,158591.html) |
| June 2026 | Standard installer said to bundle an antivirus product (⚠️ unverified) | ClipGrab | [StreamFab](https://streamfab.com/clipgrab-review) |
| Ongoing | Clones, typosquats and phishing lookalikes | Y2Mate, SnapSave, SnapTik | §3b sources |
| 2023 → 2026 | Licence breakage: classic licences don't carry over; lifetime licences go inactive; reinstall caps | 4K, VDH, VidJuice | §4.1 sources |

**What this means.** Badges, store listings and even official download pages
cannot be trusted by default, and browser extensions are the riskiest channel.
Users have learned to expect deception, so a newcomer must make good behaviour
*verifiable* rather than claim it. Ferry ships no installer and no extension,
makes no third-party requests, writes every output through FFmpeg, and needs no
account that a licence change could strand.

---

## 6. Legal and enforcement pressure on competitors

Enforcement targets *purpose and profile* — music-focused YouTube-to-MP3
services, ad funding, anonymous operators, ignored takedowns — more than any
single technique. 🔎 = search summary only.

| Date | Action | Target | Source |
|---|---|---|---|
| Feb–Aug 2019 | Italy's AGCOM blocks Yout.com; a court upholds it (Aug 2, 2019) | Yout | [IFPI](https://www.ifpi.org/italian-court-confirms-stream-ripping-is-illegal/) |
| May 2019 | Australia's first ISP blocks of stream rippers (🔎) | 2conv, Flvto and others | [TorrentFreak](https://torrentfreak.com/aussie-music-industry-wins-first-ever-stream-ripping-site-blocks-190516/) |
| Apr 28, 2020 | US service ends after rights-holder pressure (forum reposts; original notice unretrievable) | SaveFrom.net | [Opera forum](https://forums.opera.com/post/252992) |
| Oct 23 → Nov 16, 2020 | RIAA §1201 notice gets youtube-dl removed from GitHub; reinstated Nov 16 | youtube-dl | [GitHub Blog](https://github.blog/2020-11-16-standing-up-for-developers-youtube-dl-is-back/) |
| Feb 2021 | UK High Court orders ISP blocks (🔎) | Flvto, 2Conv and others | [TorrentFreak](https://torrentfreak.com/high-court-orders-uk-isps-to-block-stream-ripping-cyberlocker-sites-210225/) |
| Oct 2021 | Free Download Manager drops YouTube after a Google complaint (🔎) | FDM | [TorrentFreak](https://torrentfreak.com/free-download-manager-removes-youtube-support-after-google-complaint-211025/) |
| 2022 → Aug 2023 | ≈$83M default judgment stands after the operator walks away | FLVTO / 2conv (*Kurbanov*) | [TorrentFreak](https://torrentfreak.com/?p=215056) |
| Sept 30, 2022 | *Yout v. RIAA* dismissed: YouTube's anti-download measures treated as an effective TPM; appeal argued Feb 2024, **no decision found as of 2026-11-24** | Yout | [CMU](https://completemusicupdate.com/stream-ripper-yout-circumvents-youtubes-technical-protection-measures-court-concludes/); [TorrentFreak, Apr 2026](https://torrentfreak.com/yout-com-hopes-supreme-courts-cox-ruling-helps-its-case-riaa-disagrees/) |
| Jan 12, 2023 | Delhi High Court orders ISP blocks of ~20 ripper sites | YT1S and others | [TorrentFreak](https://torrentfreak.com/major-labels-obtain-stream-ripping-site-blocking-order-in-india-230120/) |
| Mar 16, 2023 | Danish court blocks 8 YouTube rippers | y2mate.com, savefrom.net, others | [TorrentFreak](https://torrentfreak.com/?p=232360) |
| Mar 2023 → Nov 21, 2024 | LG then OLG Hamburg: the host of youtube-dl.org is liable; the rolling cipher is an effective TPM | Uberspace (youtube-dl) | [heise](https://heise.de/-10181247); [TorrentFreak](https://torrentfreak.com/court-rejects-appeal-of-youtube-dl-hosting-provider-uberspace-241127/) |
| Jul 2024 → Feb 19, 2026 | Rolling AGCOM blocks in Italy (11 domains in 2024; ytmp3.gg in 2026, 🔎) | y2meta, x2mate, ytmp3 | [CMU](https://completemusicupdate.com/french-and-italian-record-industries-secure-new-web-blocks/); [Digital Policy Alert](https://digitalpolicyalert.org/event/38833-communications-regulatory-authority-issued-order-blocking-ytmp3-over-copyright-infringement-no-5626dda) |
| Oct 14, 2025 | Operator agrees to a permanent shutdown after enforcement in Vietnam; IFPI holds most domains | Y2Mate | [CMU](https://completemusicupdate.com/legal-action-in-vietnam-takes-stream-ripper-y2mate-offline/) |
| Mar 3, 2026 | USTR Notorious Markets coverage lists Y2Mate and SaveFrom (🔎) | Y2Mate, SaveFrom | [USTR](https://ustr.gov/about/policy-offices/press-office/press-releases/2026/march/ustr-releases-2025-review-notorious-markets-counterfeiting-and-piracy) |
| June 2026 | Canada's first stream-ripper blocking order: 9 ISPs, 2 years, new domains added by affidavit | y2mate.ws, ytmp3.lat, savefrom.space, spowload.cc | [TorrentFreak](https://torrentfreak.com/music-labels-win-canadian-site-blocking-order-against-y2mate-ytmp3-and-savefrom/) |
| Sept 2026 | IFPI asks for yt-dlp on the 2027 EU piracy watch list, naming its maintainers | yt-dlp | [TorrentFreak](https://torrentfreak.com/ifpi-wants-open-source-youtube-downloader-yt-dlp-on-eu-piracy-watch-list/) |

No legal actions were found against SnapSave, ssstik/SnapTik, SnapDownloader,
4K, VidJuice, NewPipe or cobalt. Chrome Web Store policy also keeps video
downloaders from being featured
([policy](https://developer.chrome.google.cn/docs/webstore/program-policies/featured-products)).

**Implications for Ferry** (design lessons, not legal advice):

* YouTube is the riskiest source on both axes — its ToS forbid downloads the
  Service does not offer, its API policies forbid download and offline use
  (Developer Policies III.E.1), and two courts treated solving its cipher as
  circumvention ([ToS](https://www.youtube.com/static?template=terms&hl=en&gl=US);
  [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)).
  Ferry first defaulted YouTube to **official export only**. On 2026-11-24 the
  owner moved it to **your own or with permission** (attestation): people confirm
  they uploaded the video, it carries a Creative Commons licence, or the rights
  holder allowed it. Ferry still never solves the signature cipher (no JS
  runtime), so formats behind it stay unavailable, and the official routes
  (Studio, Takeout, Premium offline) stay listed.
* Ferry ships no PO-token, cookie, impersonation, IP-rotation or DRM capability,
  avoids music-ripping marketing, and uses only self-made or openly licensed
  test media — the exact signals rights holders cite.
* Dynamic blocking means anything that *looks* like a ripper can be added to a
  blocklist within days. Operators of public Ferry instances should publish
  terms and a rights-holder contact (see `SECURITY-AUDIT.md` §6).

---

## 7. Opportunities for Ferry (ranked)

Ranked by user impact × evidence strength. Each item names an **outcome**; none
asks Ferry to copy a competitor's interface. Targets marked *proposed* are new
and need product sign-off; the rest come from `PRODUCT-REQUIREMENTS.md` §8.

### 1. Clean by design, provably
* **User problem:** people expect a downloader to trick them.
* **Evidence:** push traps and fake alerts ([PCRisk](https://pcrisk.com/removal-guides/14858-savefrom-net-virus)), button-mimicking ads ([UFO VPN](https://ufovpn.io/blog/is-snaptik-safe-or-not)), weaponized extensions and installers (§5).
* **Ferry's response:** no ads, trackers, pop-ups, notification prompts, installer or extension; no third-party requests from the client; strict CSP; one canonical domain with guidance on spotting impersonators.
* **Measure:** third-party requests in a CI network audit = 0 (*proposed*); permission prompts = 0 (*proposed*); support tickets mentioning "fake button" or "ads" = 0; Lighthouse Best Practices 100.

### 2. Failures that explain themselves
* **User problem:** opaque failures ("error 3037"), misleading messages and week-long support waits.
* **Evidence:** [Trustpilot: SnapDownloader](https://www.trustpilot.com/review/snapdownloader.com); [yt-dlp wiki](https://github.com/yt-dlp/yt-dlp/wiki/Extractors); cobalt announced its YouTube outage only in a changelog ([11.2](https://github.com/imputnet/cobalt/blob/main/web/changelogs/11.2.md)).
* **Ferry's response:** every failure maps to a coded, plain-language state with a next step (rate-limited, sign-in required, protected, export-only, expired, too large); the Sites page and the Home logo wall show each site's policy, reliability and any operator override with its reason, so users learn *before* pasting.
* **Measure:** failures ending in the catch-all `EXTRACTION_FAILED` < 10% of failures (*proposed*); retry offered only on retryable codes (tested); override visible to clients without a redeploy (ETag refresh).

### 3. Honest media labels
* **User problem:** inflated bitrates, "4K with sound" that isn't, surprise 360p files.
* **Evidence:** [Appuals](https://appuals.com/why-converting-youtube-to-320kbps-mp3-is-a-waste-of-time); [snapsave.app](https://snapsave.app/); [Trustpilot: 4K](https://www.trustpilot.com/review/www.4kdownload.com).
* **Ferry's response:** offer only qualities the source has (no upscaling); show source → output ("Opus ~130 kbps → MP3 192 kbps") and warn when a bitrate adds size but not quality; show sizes only when reported or computed (marked ≈); state when a choice re-encodes.
* **Measure:** fabricated sizes or progress values = 0 (tests); output resolution and codec match the label in 100% of ffprobe checks (*proposed*); "wrong quality" tickets = 0.

### 4. A mobile flow that respects each OS
* **User problem:** Android users must sideload; iOS users get file-manager workarounds or $4.99/week copycats; Home-Screen web apps on iOS strand downloads.
* **Evidence:** [Seal](https://github.com/JunkFood02/Seal), [newpipe.net](https://newpipe.net/), [App Store](https://apps.apple.com/us/app/snaptik/id1572161935), [WebKit bug 290847](https://bugs.webkit.org/show_bug.cgi?id=290847), Web Share Target only on Chromium Android ([BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/manifests/webapp/share_target.json)).
* **Ferry's response:** Android share-to-Ferry (PWA share target); in iOS standalone mode, an "Open in Safari" route instead of a broken download link, plus Files > Downloads guidance; resumable delivery (Range + strong ETag); batched status polling (1 s while active, slower when hidden, immediate refresh on return) that survives backgrounding; 44×44 px touch targets.
* **Measure:** median paste-to-download-start ≤ 8 s; share-target → ready success on Chrome Android (*proposed* ≥ 95% for `allowed` sources); download links shown in iOS standalone mode = 0; interrupted downloads resume without restarting on the test matrix.

### 5. Rules you can see before you paste
* **User problem:** users cannot tell what is allowed, and tools that ignore rules vanish or get blocked.
* **Evidence:** §6 enforcement timeline; platform terms that ban automated extraction (e.g. [TikTok ToS §3.4](https://www.tiktok.com/legal/page/us/terms-of-service/en)); official owner exports exist ([YouTube Studio help](https://support.google.com/youtube/answer/56100?hl=en)).
* **Ferry's response:** a policy registry with five categories (allowed, own/licensed content with attestation, export-only, protected, disabled), runtime overrides with a stated reason, official routes on every restricted platform, and protected platforms never probed.
* **Measure:** 100% of registry entries carry category, reason, official route (where one exists) and last-checked date; jobs created on `export_only`/`blocked` platforms = 0 (audited counter, *proposed*).

### 6. Power features without a paywall or a desktop
* **User problem:** presets, subtitle languages, trimming and playlists are desktop-only or premium; an audio-language picker is still an open request.
* **Evidence:** [4K product page](https://www.4kdownload.com/products/videodownloader-42); [VDH](https://www.downloadhelper.net/); [cobalt issues](https://www.Github.com/imputnet/cobalt/issues); [NewPipe releases](https://github.com/TeamNewPipe/NewPipe/releases).
* **Ferry's response:** three modes, subtitle languages (auto captions labelled), trim, compression, playlists and batch with ZIP, saved defaults and naming templates — all on a phone-width layout, none behind a paywall.
* **Measure:** every MVP flow passes E2E at 390×844; share of jobs using at least one advanced option (on-device only, never sent to a server).

### 7. Privacy that can be checked
* **User problem:** telemetry is undocumented; "downloader" extensions fingerprint users.
* **Evidence:** [Akamai](https://www.akamai.com/blog/security-research/stealtok-130k-users-compromised-by-data-stealing-tiktok-video-downloaders); §3b ads/trackers column.
* **Ferry's response:** no accounts or analytics; history only on the device; IPs not logged by default; files deleted within the TTL, immediately on request, or kept longer only when the user taps **Keep longer** (WCAG 2.2.1); self-hostable single container.
* **Measure:** published data-flow diagram and log-field inventory (*proposed*); retention enforced by tests; analytics endpoints = 0.

### 8. Value that does not get pulled
* **User problem:** paid licences stop working after a "new generation" release.
* **Evidence:** [4K FAQ](https://www.4kdownload.com/blog/2023/07/26/4k-video-downloader-faq); [VDH forum](https://groups.google.com/g/video-downloadhelper-q-and-a/c/UNm9ctxLIU0).
* **Ferry's response:** no licence keys or accounts to strand; self-hosting is the continuity guarantee; any future paid tier should sell capacity and convenience, not lifted caps.
* **Measure:** no MVP feature moved behind a paywall (*proposed* public commitment); self-host upgrades ship with migration notes.
