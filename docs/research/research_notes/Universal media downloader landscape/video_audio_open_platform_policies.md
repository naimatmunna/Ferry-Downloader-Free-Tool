# Video, audio, education and open-content platforms: what downloading is actually permitted, and the official routes (research notes, current to 2026-11-24)

Method and conventions. All URLs were accessed on 2026-11-24. "(search summary)" means the fact was seen only in a web-search result summary and the page itself was not opened. Treat those as lower confidence. Everything is paraphrased. The only verbatim quote is one phrase from YouTube Developer Policies III.E.1. This is not legal advice. The web-search budget ran out partway through the work (a shared limit of 200 searches), so some items stayed unverified. They are listed under Gaps.

Classification rule for field (7). Each platform, or each route the brief lists separately, gets exactly one category, chosen by what a compliance-first downloader may do:
- **1 Officially supported downloads.** The platform itself offers a download action to viewers. It may be gated by a purchase, by the platform's license, or by a per-item opt-in from the rights holder. The tool may use or hand off to that route only.
- **2 Authorized user-owned content exports.** The only authorized file route is an account owner exporting their own uploads.
- **3 Public media with permitted downloading.** A repository whose content is public domain or openly licensed, so the license itself permits copying. Attribution, NC and ND terms and access etiquette still apply.
- **4 Technically supported but permission-restricted.** Ordinary streams are technically retrievable (no DRM), but the ToS or licensing give viewers no right to download.
- **5 Unsupported/protected.** DRM-protected or app-bound offline only, or the terms or operator cannot be verified.

## Q1. Per platform: ToS position, download features, official route, API, default license, login, and category

### Takeaway
Only open-content repositories are broadly downloadable by license. These are Wikimedia Commons, NASA, MIT OCW, Openverse sources, Freesound, Jamendo, FMA, LibriVox and the Blender films. A second group has official download actions gated by a purchase, the platform's license or a rights-holder opt-in: Vimeo, PeerTube, SoundCloud, Bandcamp, Internet Archive, Pexels, Pixabay, Unsplash, and podcast RSS enclosures.

The major streaming platforms forbid downloading except through their own features: YouTube, Dailymotion, Twitch, Kick, Rumble, Bilibili, Mixcloud and TED. Their only file routes are owner exports (YouTube Studio and Takeout, Twitch Video Producer, the Kick dashboard) or app-bound offline modes. Spotify, YouTube Premium offline, Udemy, LinkedIn Learning and Apple's paid content are protected or app-bound.

### Cited Findings

#### Summary table (details and sources below)
| Platform / route | Cat. | Gate or signal the tool must honor |
|---|---|---|
| YouTube: videos by others | 4 | No viewer download right. The ToS allows only features expressly authorized by the Service. |
| YouTube Studio download (own videos) | 2 | Owner sign-in. 720p/360p MP4. Max 5 downloads per video per 24h. |
| Google Takeout: YouTube (own uploads) | 2 | Owner sign-in. Original format or MP4. |
| YouTube Premium offline | 5 | In-app or in-browser only. Valid 29 days (48h in some regions). |
| Creative Commons videos on YouTube | 4 | The CC BY license is rights-holder permission, not YouTube permission to download. |
| Vimeo | 1 | Per-video owner toggle (paid plans). Viewer must be logged in for source files. |
| Dailymotion | 4 | License is streaming-only. Automated access banned. |
| Twitch: others' VODs and clips | 4 | Personal-use license. Scraping banned. |
| Twitch Video Producer (own VODs) | 2 | Creator sign-in. Retention window applies. |
| Kick: others' VODs | 4 | Copying, scraping and access by unauthorized means banned. |
| Kick Creator Dashboard (own VODs) | 2 | Own channel only. Web only. |
| Rumble | 4 | Systematic retrieval and automated software banned. |
| Bilibili | 4 | Use confined to the platform. Crawlers and bots banned. |
| DTube | 5 | Operator and terms unverifiable after the reported relaunch. |
| Odysee/LBRY | 4 | ToS unretrievable. Built-in download is not consistently available. |
| PeerTube | 1 | `downloadEnabled` per video. Instance terms vary. |
| TED | 4 | CC BY-NC-ND 4.0, but scraping is banned. Current download control unverified. |
| Internet Archive | 1 | DOWNLOAD OPTIONS panel. Rights in `licenseurl`/`rights`. Access-restricted items excluded. |
| SoundCloud | 1 | Uploader-enabled downloads only, signed in. API apps may not file-save at all. |
| Bandcamp | 1 | Purchase or free download. Personal, non-commercial license. |
| Mixcloud | 4 | Listener license is streaming-only. Downloading and scraping banned. |
| Spotify | 5 | Protected in-app offline (Premium). Ripping banned. |
| Apple Podcasts (free shows) | 1 | Use the publisher's public RSS enclosure, not Apple's service. |
| Apple Podcasts Subscriptions and purchases | 5 | Apple software only. DRM rules apply. |
| Generic podcast RSS | 1 | `<enclosure>` is by definition an attached downloadable media object. |
| Coursera | 4 | Scraping and bots banned. Offline only in the app. |
| Udemy | 5 | Encrypted in-app offline. The "Downloadable" toggle is off by default. |
| edX | 4 | Course-team "Video Download Allowed" link only (Open edX). |
| Khan Academy | 4 | Mixed or contested licensing. ToS unretrievable. |
| MIT OpenCourseWare | 3 | CC BY-NC-SA 4.0. Official course ZIP. Videos on archive.org. |
| LinkedIn Learning | 5 | Mobile-app-only offline. No desktop downloads. |
| Wikimedia Commons | 3 | Per-file free license. Robot policy limits apply. |
| NASA Image and Video Library | 3 | Generally not copyrighted in the US. Logo and third-party exceptions. |
| Pexels | 1 | Pexels License. API attribution and rate limits. |
| Pixabay | 1 | Content License. API: download rather than hotlink. 24h cache. |
| Unsplash | 1 | Unsplash License. API: hotlink plus a `download_location` call. |
| Openverse | 3 | Index only. Verify the license at the source and download from the source. |
| Freesound | 3 | CC0, CC BY or CC BY-NC per sound. Login or OAuth2 to download. |
| Jamendo | 3 | CC license per track. `audiodownload_allowed` flag. |
| Free Music Archive | 3 | CC, US public domain, or a custom license per track. |
| LibriVox | 3 | Public domain in the US. Check local law. |
| Blender open movies | 3 | CC BY (version varies per film). Trademarks excluded. |

#### YouTube: videos uploaded by others (category 4)
- **(1) ToS.** The "Permissions and Restrictions" list has three relevant items, numbered as in the ToS:
  - **Item 1:** no accessing, reproducing, downloading, distributing or similar use of the Service or Content, unless expressly authorized by the Service or with prior written permission from YouTube and, where applicable, the rights holders.
  - **Item 2:** no circumventing or disabling features that prevent or restrict copying.
  - **Item 3:** no access by automated means such as robots, botnets or scrapers. The exceptions are public search engines following robots.txt, YouTube's written permission, or applicable law.
  - The US/English render was dated and effective December 15, 2023 — [YouTube ToS, US/en](https://www.youtube.com/static?template=terms&hl=en&gl=US).
  - The English render for gl=FR is dated and effective January 9, 2026. It keeps the same restrictions, with the exception worded slightly differently (permitted specifically by the Service rather than expressly authorized), and refers to limited offline viewing functionality in its Duration of Licence section — [YouTube ToS, gl=FR/en](https://www.youtube.com/static?gl=FR&template=terms&hl=en).
  - The default geolocated (Arabic) render was dated January 5, 2022 — [YouTube ToS, default render](https://www.youtube.com/static?template=terms).
- **(2) Download features.** There is no viewer file download. The features are Premium offline (app or browser bound), Studio download (owner), and Takeout (owner); see the routes below.
- **(3) Official route for others' videos.** None beyond Premium offline.
- **(4) API.** The Data API is governed by the YouTube API Services Terms and the Developer Policies. III.E.1 bans downloading, caching and offline playback; see Q2.
- **(5) Default license.** The Standard YouTube License is the default. Creators can opt into CC Attribution — [YouTube Help: License types](https://support.google.com/youtube/answer/2797468?hl=en).
- **(6) Login.** Not needed to watch public videos. Premium downloads require a Premium sign-in ([YouTube Help: Watch offline](https://support.google.com/youtube/answer/11977233?hl=en)).
- **(7) Category 4.** The streams are technically extractable, but the ToS reserve downloading to features the Service itself expressly provides, and no such viewer file feature exists for third-party videos.

#### YouTube Studio download of a creator's own videos (category 2)
- **Path.** Sign in to YouTube Studio → Content → select the video → Menu → Download. The file is MP4 at 720p or 360p depending on video size — [YouTube Help: Download videos you've uploaded](https://support.google.com/youtube/answer/56100?hl=en).
- **Unavailable when:** the video was removed; it has a copyright or Community Guidelines strike; it uses a preapproved audio track; or it was already downloaded 5 times in the last 24 hours. The page points to Google Takeout for all uploads (same source).
- **ToS.** The ToS acknowledge that users may make a copy of their Content before removing it — [YouTube ToS, US/en](https://www.youtube.com/static?template=terms&hl=en&gl=US).
- **Category 2.** The authorized file route is limited to the signed-in owner's own uploads, at reduced resolution.

#### Google Takeout for YouTube (category 2)
- **ToS.** The ToS promise an opportunity to export content from your Google Account using Google Takeout — [YouTube ToS, US/en](https://www.youtube.com/static?template=terms&hl=en&gl=US).
- **Path.** takeout.google.com → "YouTube and YouTube Music" → "All YouTube data included" → keep "Videos" → .zip or .tgz — [Maketecheasier (search summary)](https://maketecheasier.com/download-your-own-youtube-videos/). It covers only videos you uploaded (same, search summary).
- **Format.** Google's Data Portability schema lists uploaded videos as original format or MP4 — [Data Portability: YouTube schema (search summary)](https://developers.google.com/data-portability/schema-reference/youtube?hl=en). General Takeout help — [Google Account Help (search summary)](https://support.google.com/accounts/answer/3024190?hl=en-419).
- **Category 2.** This is a full-quality export, but only of the account holder's own uploads.

#### YouTube Premium offline (category 5)
- **Who and where.** Premium members, signed in, on mobile and on desktop browsers (Chrome, Edge, Firefox, Opera). Use the Download button below the video; downloads appear under "Downloads" in the left menu.
- **Duration.** Videos play offline for up to 29 days, or 48 hours in some regions, before a reconnect is needed. A video is removed at the next sync if it is no longer available offline. Playback works only while signed in to the same account — [YouTube Help: Watch videos offline](https://support.google.com/youtube/answer/11977233?hl=en).
- **Other benefits.** Premium also includes offline videos and playlists and Smart Downloads — [YouTube Help: Premium benefits](https://support.google.com/youtube/answer/6308116?hl=en).
- **Category 5.** It is an account- and app-bound offline cache, not an exportable file that a downloader could use.

#### Creative Commons on YouTube (category 4)
- **How it is set.** Creators choose either the Standard YouTube License (the default) or CC Attribution, in Studio under Details → Show more → License. Videos with a Content ID claim cannot be marked CC. Reusers must credit the creator. The license link on the help page points to CC BY 4.0 (as observed). The page says nothing about downloading — [YouTube Help: License types](https://support.google.com/youtube/answer/2797468?hl=en).
- **Category 4.** CC BY gives copyright permission. The ToS download restriction, however, requires authorization by the Service or YouTube's written permission, so acquiring the file through YouTube is still restricted (inference from the ToS text above).

#### Vimeo (category 1)
- **(1) ToS.** Last updated July 8, 2024; for accounts created before that date it took effect August 15, 2024 — [Vimeo Terms](https://vimeo.com/terms).
  - **§5.4 Prohibited Technical Measures:**
    - No accessing, downloading, reproducing, redistributing, framing or mirroring unless expressly authorized by the Service or with written permission.
    - No automated means (robots, botnets, scrapers), except APIs used under the API License Addendum and public search engines following robots.txt.
    - No circumventing security, rate-limiting, filtering or DRM measures.
  - **§6.1:** when an uploader enables access, viewers may stream the video, and also download or embed it where those options apply. If the uploader disabled downloading, Vimeo limits distribution accordingly.
  - **§2:** users may stream videos they have the right to view.
- **(2) Features.** A per-video "Allow downloads" toggle in the privacy menu (or Share → Viewer permissions), plus an account-level upload default — [Vimeo Help (search summary)](https://help.vimeo.com/hc/en-us/articles/15059498665745); [Vimeo Help: disable downloads (search summary)](https://help.vimeo.com/hc/en-us/articles/16332478147217-How-to-disable-the-ability-to-download-your-videos).
  - Only paid members can enable viewer downloads. Basic and Free accounts cannot (search summary of Vimeo Help).
  - Viewers cannot download from the embedded player (search summary) — [Vimeo Help: no download button (search summary)](https://help.vimeo.com/hc/en-us/articles/29641627072017-Troubleshooting-I-don-t-see-a-download-button-on-a-video).
- **(3) Route.** On the vimeo.com video page, use the Download button below the player when it is enabled. Viewers must be logged in to download source files of public videos. Originals are kept only on paid plans with source-file retention turned on — [Vimeo Help: How to download a video](https://help.vimeo.com/hc/en-us/articles/12426502581265-How-to-download-a-video-on-Vimeo).
- **(4) API.** Video responses can contain `play`, `files` and `download` fields. Direct file links need a token with the public, private and video_files scopes. `download` links last about 24h, carry attachment headers, and resolve by 302 redirect to the CDN — [Vimeo Help: file and download links from the API](https://help.vimeo.com/hc/en-us/articles/12427806914577-Get-video-file-and-download-links-from-the-API). The API can toggle privacy settings but cannot bypass them — [Vimeo Help: API privacy settings](https://help.vimeo.com/hc/en-us/articles/12427776819089-How-to-use-the-API-to-customize-video-privacy-settings).
- **(5) License.** The uploader keeps rights. There is no open default (inference from ToS §6.1).
- **(6) Login.** Required for source-file downloads. The owner needs a paid plan to enable downloads.
- **(7) Category 1.** Vimeo serves downloads itself, but only for videos whose owner enabled them. Absent that toggle, §5.4 prohibits downloading.

#### Dailymotion (category 4)
- **(1) ToS.** Last update June 30, 2026, effective July 7, 2026 — [Dailymotion Terms of Use](https://legal.dailymotion.com/en/terms-of-use/).
  - **§6.9:** access is for personal, non-commercial use, solely for streaming. Streaming is defined as data not meant for permanent download, copying, storage or redistribution.
  - **§2.6:** automated access is prohibited without prior written approval.
  - **§6.1(ix):** no scraping, extracting or downloading content in unauthorized ways, and no AI/ML training without express authorization.
  - **§6.7:** no circumventing security or copy-prevention features.
  - **§6.6:** no modifying or blocking the player.
  - **§4.3:** Dailymotion's own material may not be downloaded or copied.
  - **§3.1:** the license users grant over their content mentions offline display without permanent download.
- **(2)/(3) Download features and route.** No viewer download or owner-export feature was found.
- **(4) API.** The ToS mention data feeds. The API terms were not retrieved.
- **(5) License.** Owned by the uploader.
- **(6) Login.** Not applicable.
- **(7) Category 4.** The viewer license is streaming-only and automated access is banned.

#### Twitch: others' content (category 4); creator's own VODs via Video Producer (category 2)
- **(1) ToS.** The live page at legal.twitch.com rendered only navigation and could not be read.
  - A third-party capture (Conduct Atlas, captured September 11, 2026) shows a limited, non-sublicensable, non-transferable license for personal or internal business use — [Conduct Atlas: license provision](https://conductatlas.com/platform/twitch/twitch-terms-of-service/provision/CA-P-024924/limited-personal-use-license-granted-to-user/).
  - The same capture shows a ban on accessing Twitch resources by robot, spider, scraper, crawler or other automated means — [Conduct Atlas: scraping provision](https://conductatlas.com/platform/twitch/twitch-terms-of-service/provision/CA-P-024988/prohibition-on-automated-scraping-of-twitch-resources/).
  - Older versions bar resale and commercial use of the Services or Materials — [Twitch ToS es-MX 2022 (search summary)](https://legal.twitch.com/es-mx/legal/terms-of-service/20220911).
  - A New York Attorney General filing reports an August 12, 2026 Terms update that clarifies Twitch's license to User Content — [NY AG Twitch policy report (search summary)](https://ag.ny.gov/sites/default/files/social-media-policy-report/2026-q1q2-amazon.com-inc-policy-1-twitch.pdf).
- **(2)/(3) Creator route.** All from secondary guides; the official Help page [Video on Demand](https://help.twitch.tv/s/article/video-on-demand?language=en_US) returned a CSS error and could not be read — [Android Authority (search summary)](https://www.androidauthority.com/save-vods-twitch-3188608); [Esports.gg (search summary)](https://esports.gg/guides/streamers/how-to-save-and-download-twitch-streams).
  - Turn on stored past broadcasts before streaming: Creator Dashboard → Settings → Stream → VOD settings.
  - Download from Creator Dashboard → Content → Video Producer → ⋮ → Download, before the VOD expires.
  - Highlights are kept indefinitely.
  - Retention is 7, 14 or 60 days depending on status; the secondary sources disagree.
- **(4) API.** Governed by the Twitch Developer Services Agreement, which was not retrieved — [legal.twitch.com developer agreement](https://legal.twitch.com/legal/developer-agreement).
- **(5) License.** Owned by the creator.
- **(6) Login.** The creator must be signed in.
- **(7) Category, others' content: 4.** The license is personal-use only and automated access is banned.
- **(7) Category, Video Producer: 2.** It is the only file route, and it is limited to the channel owner.

#### Kick: others' VODs (category 4); creator's own VODs (category 2)
- **(1) ToS.** Modified March 23, 2026 — [Kick Terms of Service](https://kick.com/terms-of-service).
  - **§1.2:** a revocable, limited license.
  - **§1.4:** no copying or distributing any part of the Service in any medium, including by scraping.
  - **§1.4(b):** no automated systems (robots, spiders, offline readers). Public search engines get a revocable exception.
  - **§1.4(k):** no accessing content by means not provided or authorized.
  - **§1.4(l) and (n):** no bypassing access restrictions or content filtering.
  - **§1.4(m):** no reverse engineering.
- **(2)/(3) Creator route.** Creator Dashboard → Studio → VODs (dashboard.kick.com/studio/vods) → Download, then choose a quality. It works only for your own channel and is not yet in the mobile app. Kick says no third-party tools are needed — [Kick Help: How to download your Kick VOD](https://help.kick.com/en/articles/7832538-how-to-download-your-kick-vod). A vendor blog dates the button to September 25, 2026 — [Upstream (search summary)](https://upstream.so/blog/how-to-download-kick-vods/).
- **(4) API.** Not covered in the ToS. A Kick developer API was not verified.
- **(5) License.** Owned by the creator.
- **(6) Login.** The creator must be signed in.
- **(7) Category, others' VODs: 4.** The ToS ban copying and access by unauthorized means.
- **(7) Category, dashboard: 2.** The official download is restricted to the owner's own channel.

#### Rumble (category 4)
- **(1) ToS.** Last modified September 1, 2026 — [Rumble Terms](https://rumble.com/s/terms).
  - No reproducing, copying or transmitting content without authorization.
  - No systematic retrieval of data or content without written permission.
  - No automated software to access the site without prior written permission.
  - The Rumble Player license restricts copying (backup only) and reverse engineering.
  - Viewers get no right to publish or disseminate content.
  - Uploading grants Rumble the right to use content to train AI/ML models.
- **(2)–(4) Features, route, API.** The ToS mention no download feature, uploader download toggle or public API.
- **(5)/(6) License and login.** Owned by the creator. Login is not applicable.
- **(7) Category 4.** There is no download right and systematic or automated retrieval is expressly prohibited.

#### Bilibili (category 4)
- **(1) User agreement.** 哔哩哔哩弹幕网用户使用协议, updated April 30, 2025 and effective May 7, 2025, read via a third-party mirror — [elawcn mirror](https://www.elawcn.com/agreement/2025/1120/1648.html). The official page rendered only its title — [bilibili.com licence](https://www.bilibili.com/protocal/licence.html).
  - **1.2:** the services are for non-commercial use and confined to Bilibili's own platforms.
  - **1.3:** services obtained through unofficial channels are treated as unlawfully obtained.
  - **5.6(3):** no bots, spiders, crawlers or other automated programs or scripts to obtain services, content or data without prior written permission.
  - **8.2:** no reverse engineering.
  - **8.5:** no unauthorized reposting of Bilibili's self-produced or exclusively licensed content.
  - An older international agreement (April 2020) names official channels as the only lawful route — [bilibili international agreement (search summary)](https://www.bilibili.com/protocal/international.html).
- **(2)–(6) Features, route, API, license, login.** The in-app offline cache, any creator export and any API were not verified.
- **(7) Category 4.** Use is confined to the platform and automated acquisition is banned.

#### DTube (category 5)
- **Status (Wikipedia).** Listed as active at d.tube, with a legacy version at dtube.app. It launched in 2017 on Steem and IPFS. Wikipedia says it relaunched in December 2025 as a conventional ad-supported platform with light peer-to-peer delivery, but that claim is tagged citation needed — [Wikipedia: DTube](https://en.wikipedia.org/wiki/DTube).
- **Homepage.** d.tube shows working video listings and a login link, but no ToS link and no named operator — [d.tube](https://d.tube/).
- **Category 5.** It appears to be operating, but its operator and terms cannot be verified, so there is no basis for authorization.

#### Odysee / LBRY (category 4)
- **(1) ToS.** The official ToS was unretrievable (connection reset twice) — [odysee.com/$/tos](https://odysee.com/$/tos).
- **(2) Features.** Secondary guides describe a built-in download control under the player for some videos. They say it is sometimes disabled platform-side, and that paid content cannot be downloaded free — [Cisdem (search summary)](https://www.cisdem.com/resource/download-odysee-videos.html); [VideoConverterFactory (search summary)](https://www.videoconverterfactory.com/tips/odysee-video-download.html).
- **Tipping.** LBC tipping was reportedly retired in July 2025; single source — [Reclaim The Net (search summary)](https://reclaimthenet.org/odysee-overview/).
- **(7) Category 4.** Content is technically retrievable and a download control sometimes exists, but the governing ToS could not be verified.

#### PeerTube (category 1)
- **(1) Owner control.** The upload and edit form has an "Enable download" option under Customization and Advanced settings, set per video by the owner — [PeerTube docs: create/upload](https://docs.joinpeertube.org/use/create-upload-video).
- **Instance policies.** Each instance publishes its own terms; these were not retrieved.
- **(2)/(3) Features and route.** A download popup on the watch page; the formats offered vary by instance — [PeerTube docs: watch video (search summary)](https://docs.joinpeertube.org/use/watch-video). The original file is downloadable only by the owner (PeerTube 8.1.4) — [Framacolibri forum (search summary)](https://framacolibri.org/t/original-file-not-showing-in-download-options-despite-keptoriginalfilename-being-set-8-1-4/32199).
- **(4) API.**
  - `VideoDetails.downloadEnabled` is a boolean, undescribed in the reference.
  - Each item in `files[]` and in `streamingPlaylists[].files[]` carries `fileUrl`, `fileDownloadUrl` (served as an attachment), `torrentUrl` and `torrentDownloadUrl`. The model also includes `licence` (id, label) and `privacy` — [PeerTube API: VideoDetails](https://docs.joinpeertube.org/api-rest-reference/api/models/videodetails.html).
  - `GET /download/videos/generate/{videoIdOrUUID}?videoFileIds=…` muxes at most one video and one audio stream into an MP4. An optional `videoFileToken` avoids the need for an OAuth header — [PeerTube API: Video Download](https://docs.joinpeertube.org/api-rest-reference/api/video-download.html).
  - The ActivityPub Video object also carries `downloadEnabled` — [PeerTube ActivityPub docs (search summary)](https://docs.joinpeertube.org/api/activitypub).
- **(5) License.** Chosen per video from 7 options: six CC BY variants (BY, BY-SA, BY-ND, BY-NC, BY-NC-SA, BY-NC-ND) plus a Public Domain Dedication — [PeerTube docs: create/upload](https://docs.joinpeertube.org/use/create-upload-video).
- **(6) Login.** Not needed for public videos (inference). Private files need OAuth or a video file token.
- **(7) Category 1.** The platform exposes a per-video, owner-set download permission and dedicated download URLs. Instance terms still apply.

#### TED (category 4)
- **(1) Usage policy.** No update date shown — [TED Talks Usage Policy](https://www.ted.com/about/our-organization/our-policies-terms/ted-talks-usage-policy).
  - Talks are licensed CC BY-NC-ND 4.0 International.
  - Non-commercial sharing is allowed with attribution and a link.
  - Embedding must use TED's player with a visible link.
  - No edits, clips, dubbing or re-uploading to other YouTube channels.
  - Scraping video from TED.com is explicitly not permitted.
  - Commercial use, and use in an LMS/LXP outside TED.com or TED's YouTube channel, needs a license.
  - Educators should stream from TED.com or TED's YouTube channel.
- **(2)/(3) Historical download route.** A June 8, 2015 TED blog post described a Download button on every talk page (MP4, about 480p, with subtitle options) and Quick List downloads at low, medium and high size — [TED Blog](https://blog.ted.com/two-ways-to-download-a-ted-talk-from-the-website-updated/). Archive Team records a historical Share → Download path — [Archive Team wiki (search summary)](https://wiki.archiveteam.org/index.php/TED). Whether a download control exists on ted.com today was not verified.
- **(4) API.** None verified.
- **(5) License.** CC BY-NC-ND 4.0.
- **(6) Login.** Unverified.
- **(7) Category 4.** The license allows non-commercial sharing, but TED bans scraping and a current official download control was not confirmed. Upgrade to category 1 per talk if ted.com shows one.

#### Internet Archive (category 1)
- **(1) ToS.** The ToS page rendered only its site title (JavaScript-only page) — [archive.org/about/terms.php](https://archive.org/about/terms.php).
  - The help center says the ToS require users to use the Collections at their own risk and to ensure the use is non-infringing and lawful. IA gives no guarantee of copyright status. Uploaders state rights or choose a CC license, shown as a CC logo on the details page. Many items are non-commercial with attribution — [IA Help: Rights](https://help.archive.org/help/rights/).
  - A 2014 blog post on the ToS update describes earlier text (dating from 2001) that required non-commercial, fair use and barred copying any part of the Collections offsite without written permission. The 2014 update dropped the non-commercial wording (search summary) — [IA Blog, Dec 30, 2014](https://blog.archive.org/2014/12/30/update-to-terms-of-use/).
- **(2)/(3) Features and route.** From [IA Help: Downloading – A Basic Guide](https://help.archive.org/help/downloading-a-basic-guide/):
  - The item page's DOWNLOAD OPTIONS panel offers per-format downloads, zipped when there are several files.
  - It also offers zips of all originals or all files, and SHOW ALL for single files.
  - Bulk downloading is via wget or the IA Python CLI.
  - Lending-program books and some collections are access-restricted. No DOWNLOAD OPTIONS panel means the item is likely not downloadable.
- **(4) API.** The Metadata API (archive.org/metadata/{identifier}) returns item metadata as JSON; demonstrated with [archive.org/metadata/librivoxaudio](https://archive.org/metadata/librivoxaudio). The schema defines `licenseurl`, `rights`, `access-restricted-item`, `public-format` and `geo_restricted` — [IA Metadata Schema](https://archive.org/developers/metadata-schema/index.html).
- **(5) License.** Set per item.
- **(6) Login.** The guide describes no login for ordinary downloads. Restricted items need lending eligibility (inference).
- **(7) Category 1.** IA offers first-party downloads, but rights vary per item and responsibility is placed on the user.

#### SoundCloud (category 1, hand-off only)
- **(1) Consumer ToS.** The page served an error, so it could not be read. A dated version URL (08-2026) is indexed — [SoundCloud ToS 08-2026 (search summary)](https://soundcloud.com/terms-of-use/08-2026).
  - SoundCloud Help says stream-ripping sites exploit its streaming technology in violation of the ToS, and that uploaders can disable downloads (search summary; the page returned 403) — [SoundCloud Help](https://help.soundcloud.com/hc/en-us/articles/115003563268).
- **(2) Features.** All from SoundCloud Help search summaries:
  - Uploaders control an enable-downloads toggle in track Permissions or Advanced settings, including bulk editing.
  - Listeners receive the original uploaded file and must be signed in.
  - Downloads per track are capped: Free 100, Artist 1,000, Artist Pro unlimited.
  - Playlists cannot be downloaded.
  - Sources: [Manage track permissions](https://help.soundcloud.com/hc/en-us/articles/31423603670043); [Downloading tracks](https://help.soundcloud.com/hc/en-us/articles/115003448787).
  - Paid downloads are also offered — [Sell tracks as paid downloads (search summary)](https://help.soundcloud.com/hc/en-us/articles/54679273940507).
- **(3) Route.** The track page's download control, signed in, and only where the uploader enabled it.
- **(4) API.** API Terms effective March 30, 2024 — [SoundCloud API Terms of Use](https://developers.soundcloud.com/docs/api/terms-of-use):
  - **§03:** respect uploader restrictions; no ripping, capturing or copying User Content; no AI training, and no use as AI input (for example source separation).
  - **§05 Caching and Downloading:** no file-save functionality and no offline access, even for content the uploader allowed to be downloaded on SoundCloud. Only session caching is allowed.
  - **§08:** credit the uploader and SoundCloud, with backlinks.
  - **§10 item 13:** no stream ripping.
  - The API guide documents an `access` field (playable, preview or blocked). Requests to `/tracks/:id/streams` for blocked tracks return an error. Private tracks need a `secret_token` — [SoundCloud API Guide](https://developers.soundcloud.com/docs/api/guide).
- **(5) License.** The uploader's (CC options not verified).
- **(6) Login.** Required.
- **(7) Category 1.** SoundCloud serves uploader-enabled downloads itself. Its API Terms forbid third-party apps from saving files even for those tracks, so the tool may only hand the user off to SoundCloud's own control.

#### Bandcamp (category 1)
- **(1) ToS.** Effective May 7, 2026 — [Bandcamp Terms of Use](https://bandcamp.com/terms_of_use).
  - Purchased content is licensed solely for personal, non-commercial use, including reproduction on devices the user owns or controls.
  - Fans are encouraged to download purchases promptly, and re-downloading previous purchases is permitted.
  - A free download option exists, tied to the fan giving an email address.
  - Use or storage beyond personal use is prohibited.
  - Bandcamp will not use artists' music to train models, or let others do so.
  - Stream ripping and scraping are not explicitly addressed in the text fetched.
- **(2)/(3) Features and route.** Purchase downloads, re-downloads, and free downloads with an email address (same source). Name-your-price mechanics and streaming caps were not verified.
- **(4) API.** Not mentioned in the ToS.
- **(5) License.** Proprietary to the artist; the purchase license above applies.
- **(6) Login.** Purchase or email (inference).
- **(7) Category 1.** Downloads are Bandcamp's core sanctioned product, gated by purchase or the artist's free-download choice.

#### Mixcloud (category 4)
- **(1) ToS.** No date shown — [Mixcloud Terms](https://www.mixcloud.com/terms/).
  - **§3:** downloading, side-loading, exchanging and derivative works are prohibited unless expressly granted. The listener license is limited, personal and non-commercial, and covers listening to audio streamed from the website.
  - **§4:** links and widgets may not extract, copy or retransmit content.
  - **§5.1.5 and §8.2.2:** no circumventing security or technological measures.
  - **§5.1.8:** no robots, spiders or scrapers.
  - **§5.1.16:** no scraping, text/data mining or AI training.
  - **§6.4:** upload caps, such as at most 3 songs from one album, which reflect its music-licensing constraints.
  - The defined Services include the Mixcloud API.
- **(2) Offline.** A Premium feature for downloading shows to listen offline was referenced alongside the terms but not verified.
- **(7) Category 4.** The license is streaming-only and downloading is barred, but ordinary streams were not verified as DRM-protected.

#### Spotify (category 5)
- **(1) Terms of Use.** Last updated September 4, 2026. Content is licensed, not sold; users get limited, revocable permission for personal, non-commercial use; no redistribution or transfer — [Spotify Terms of Use](https://www.spotify.com/us/legal/end-user-agreement/).
- **User Guidelines** — [Spotify User Guidelines](https://www.spotify.com/us/legal/user-guidelines/). They prohibit:
  - copying, redistributing, ripping or recording content;
  - transferring cached copies off an authorized device;
  - circumventing Spotify's or its licensors' technology;
  - crawling or scraping;
  - ingesting content into ML/AI models.
- **(4) Developer Terms.** Version 10, effective May 15, 2025 — [Spotify Developer Terms](https://developer.spotify.com/terms):
  - **IV.2.1(a):** no training or ingesting into ML/AI models.
  - **IV.2.2(c):** no facilitating stream ripping or permanent copies.
  - **IV.3.1(a):** no storing or compiling Spotify Content.
  - **IV.3.2:** caching only where strictly necessary. Time-limited Conditional Downloads (a defined term) are allowed only for Premium subscribers.
  - **IV.2.5:** no transfer to third parties.
  - **VI.5:** the capture prohibition.
- **(2)/(3) Official offline.** Premium users can download albums, playlists and podcasts; Free users can download podcasts only. Limits are 10,000 tracks on each of up to 5 devices, and the device must go online at least every 30 days — [Spotify Support: Listen offline](https://support.spotify.com/us/article/listen-offline/).
- **(7) Category 5.** Offline copies are protected and app-bound, and every terms layer forbids ripping.

#### Apple Podcasts (category 1 for free shows via the publisher's RSS); Apple Podcasts Subscriptions and purchases (category 5)
- **(1) Apple Media Services Terms.** Last updated September 14, 2026 — [Apple Media Services Terms](https://www.apple.com/legal/internet-services/itunes/us/terms.html).
  - **§F:** personal, non-commercial use only; no tampering with or circumventing security technology; no automated or manual scraping, copying or monitoring of Content or Services; no AI training; the Services may be accessed only with Apple's software.
  - **§F:** DRM-protected content has device-limit usage rules.
  - **§P:** covers Apple Podcasts, including Apple Podcasts Subscriptions; third-party providers are responsible for their content.
- **(4) iTunes Search API** — [Apple Search API](https://performance-partners.apple.com/search-api):
  - roughly 20 calls per minute;
  - promotional content may be used only to promote store content;
  - previews must be streamed, never downloaded, saved or cached;
  - store badges and attribution are required;
  - podcasts are listed as a media type, but a `feedUrl` field is not described on that page.
- **(2)/(3) Publisher requirements** — [Apple Podcasts requirements](https://podcasters.apple.com/support/823-podcast-requirements):
  - feeds must be publicly addressable and not password-protected;
  - each episode needs a unique `<enclosure>` with URL, length and type;
  - the host must support HTTP HEAD and byte-range requests;
  - GUIDs must be stable.
  - The Apple app also auto-downloads new episodes of followed shows for offline listening (search summary) — [Apple: Automatic downloads (search summary)](https://podcasters.apple.com/support/1662-automatic-downloads-on-apple-podcasts).
- **(7) Category, free shows: 1.** Episodes are published as downloadable enclosures on the publisher's public feed. Apple's own service must not be scraped.
- **(7) Category, Subscriptions and purchases: 5.** Apple-software-only access under DRM usage rules.

#### Generic podcast RSS feeds (category 1)
- **Spec.** RSS 2.0 defines `<enclosure>` as a media object attached to the item. It has three required attributes (url, length, type), and the url must be http — [RSS 2.0 Specification](https://www.rssboard.org/rss-specification).
- **Practice.** Apple requires publicly reachable feeds and byte-range support — [Apple Podcasts requirements](https://podcasters.apple.com/support/823-podcast-requirements).
- **(7) Category 1.** Enclosures are the publisher's intended distribution of the file for download. Copyright stays with the publisher and redistribution is not implied.

#### Coursera (category 4)
- **(1) ToS.** Effective January 1, 2026 — [Coursera Terms](https://www.coursera.org/about/terms).
  - The license is for personal, non-commercial use, and commercial use is prohibited.
  - Acceptable Use Policy §2: no reproducing, transferring or selling content, and no breaking or circumventing authentication or security.
  - AUP §3: no scraping, including by bots; no text or data mining; no training models.
  - The ToS do not describe offline lecture downloads.
- **(2)/(3) Official offline.** The mobile apps download videos and readings for offline use (2017) — [Coursera Blog (search summary)](https://blog.coursera.org/mobile-offline-features). A web download control was not verified.
- **(7) Category 4.** Scraping and bots are banned and offline access is app-based. No verified viewer file route exists.

#### Udemy (category 5)
- **(1) ToS.** Returned HTTP 403 — [Udemy Terms](https://www.udemy.com/terms/).
- **(2)/(3) Features.** From Udemy Help search summaries:
  - Instructors can toggle a lecture "Downloadable." It is off by default, citing piracy concerns — [Udemy Help: instructors enable downloads](https://support.udemy.com/hc/en-us/articles/360052936774-How-Instructors-Can-Enable-Course-Videos-For-Downloading-on-a-Computer).
  - Instructors can download their own lecture videos — [Udemy Help: instructors download](https://support.udemy.com/hc/articles/14056144267671-Instructors-Download-your-Course-Lecture-Videos).
  - Learners can download in the mobile apps — [Udemy Help: iOS downloads](https://support.udemy.com/hc/articles/229603928-Downloading-Courses-on-iOS). App downloads are encrypted and playable only in the app — [Udemy Help: download to computer](https://support.udemy.com/hc/articles/229231167).
- **(7) Category 5.** By default lectures are not downloadable and offline copies are encrypted in the app. The exceptions are instructor-enabled lectures (an official route) and instructors' own videos (a category-2 route).

#### edX (category 4)
- **(1) ToS.** Last updated November 3, 2025, from edX LLC, which the ToS describe as a 2U company — [edX Terms of Service](https://www.edx.org/edx-terms-service).
  - **§6.1:** a personal, non-commercial license.
  - **§7.1:** Materials belong to edX, 2U or their licensors.
  - **§6.2:** no reproduction or distribution, and no circumventing features.
  - **§11.6:** no spiders, robots, crawlers or data-mining tools unless edX provides them.
  - **§11.10:** no selling or transferring access or Materials.
  - The ToS make no mention of Creative Commons.
- **(2)/(3) Features.** In Open edX, the course team's "Video Download Allowed" setting lets learners download a video; it requires a non-YouTube .mp4, .mpeg, .webm or .ogg URL. A separate setting controls transcript downloads — [Open edX docs (Maple)](https://edx.readthedocs.io/projects/open-edx-building-and-running-a-course/en/open-release-maple.master/video/additional_video_options.html). The edX app downloads only on Wi-Fi by default (search summary) — [edX Help](https://support.edx.org/hc/en-us/articles/360000484567).
- **(7) Category 4.** Downloads exist only where the course team enables them; this is documented for Open edX but not verified on edx.org in 2026. Otherwise the ToS ban reproduction and robots.

#### Khan Academy (category 4)
- **(1) ToS.** The ToS page did not load (a required part of the page failed) — [Khan Academy ToS](https://www.khanacademy.org/about/tos).
  - The July 23, 2020 ToS update clarified which content is Creative Commons-licensed (Khan Academy's own videos, but not partner videos) and explained what non-commercial use means — [Khan Academy Blog](https://blog.khanacademy.org/terms-of-service-update).
  - The support center cites CC BY-NC-SA with attribution and no implied endorsement (search summary; the page returned 403) — [Khan Academy Support](https://support.khanacademy.org/hc/en-us/articles/202262954-Can-I-use-Khan-Academy-s-videos-name-materials-links-).
  - This is contradicted by a college library guide stating that Khan Academy videos are no longer openly licensed (search summary) — [HCC Library guide](https://hcc.edu/library/build-your-oer-course/find-oer/oer-videos/khan-academy).
- **(7) Category 4.** The licensing is mixed and contested, the ToS could not be read, and no official download route was verified.

#### MIT OpenCourseWare (category 3)
- **(1) Terms.** Last updated 08/11/2026 — [MIT OCW Privacy and Terms of Use](https://ocw.mit.edu/pages/privacy-and-terms-of-use/).
  - Materials are CC BY-NC-SA 4.0.
  - No selling, profiting from or commercializing materials.
  - Attribution is required.
  - AI training is allowed under the same license terms: non-commercial, with derivatives shared under CC BY-NC-SA.
- **(2)/(3) Route.** Each course has a "Download course" page offering a ZIP with the same content as the website except audio and video. Videos are linked individually and hosted on archive.org. Open index.html after unzipping — [OCW 18.06 download page](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/download/).
- **(6) Login.** None observed.
- **(7) Category 3.** The materials are openly licensed and MIT ships official download packages.

#### LinkedIn Learning (category 5)
- **(2)/(3) Offline.** Offline viewing is available only in the mobile app, and videos cannot be downloaded on desktop or laptop. It needs an active subscription; individually purchased courses can also be downloaded on mobile. Use the Download icon below the course title; downloads appear under My Courses → Downloaded (search summary) — [LinkedIn Help 71907](https://www.linkedin.com/help/learning/answer/71907).
- **(1) User Agreement.** Not retrieved.
- **(7) Category 5.** The only sanctioned offline mode is inside the mobile app.

#### Wikimedia Commons (category 3)
- **(1)/(5) Licensing** — [Commons: Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia):
  - Nearly all media is under a free license (CC BY, CC BY-SA, GFDL) or in the public domain.
  - Each file's license is on its description page.
  - Reusers must provide attribution and a license notice, and share-alike where required.
  - The Wikimedia Foundation gives no guarantee of copyright status, and non-copyright restrictions (personality rights, trademarks) may apply.
- **(2)/(3) Route.** File pages link to the full-resolution file. Hotlinking works but is discouraged (same source).
- **(4) Automated access.**
  - The User-Agent policy requires an informative User-Agent with contact details. Generic agents may be blocked or receive HTTP 403 — [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy).
  - The Robot policy (last edited March 16, 2026) caps media downloads from upload.wikimedia.org at a total concurrency of 2 and 25 Mbps, measured over 10-second windows, and asks for thumbnails where possible. Unauthenticated REST clients are capped at concurrency 3 and under 5 requests/s; unauthenticated Action API clients at concurrency 1 and under 5 requests/s. Clients must honor robots.txt and 429 Retry-After, should consider dumps, and high-volume commercial users should go to Wikimedia Enterprise — [Wikimedia Robot policy](https://wikitech.wikimedia.org/wiki/Robot_policy).
- **(6) Login.** Not needed. Authenticated clients get higher API limits (same source).
- **(7) Category 3.** Content is openly licensed per file and downloading is permitted within the robot and User-Agent limits.

#### NASA Image and Video Library (category 3)
- **(1)/(5) Guidelines.** Last updated October 27, 2026 — [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
  - NASA content is generally not subject to US copyright.
  - The NASA insignia, logotype and identifiers are not public domain.
  - Third-party copyrighted material is marked and needs the holder's permission.
  - Use must not imply NASA endorsement, and there are limits on identifiable people and current astronauts.
  - NASA should be credited as the source.
  - No use in NFTs, and the insignia may not appear with super-intelligence (SI) generated imagery or be used to train SI tools.
  - images.nasa.gov is listed as an official library.
- **(4) API.** The API documentation PDF covers search, asset manifest, metadata, captions and albums — [images.nasa.gov API docs (PDF)](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf). Key requirements and rate limits could not be extracted.
- **(7) Category 3.** The material is mostly public domain in the US, subject to logo, third-party and endorsement exceptions.

#### Pexels (category 1)
- **(5) License** — [Pexels License](https://www.pexels.com/license/):
  - Use is free, attribution is optional, and edits are allowed.
  - Prohibited: showing identifiable people in an offensive light; selling unaltered copies; implying endorsement; redistributing on other stock or wallpaper platforms; trademark use.
- **(4) API** — [Pexels API documentation](https://www.pexels.com/api/documentation/):
  - a prominent Pexels link and photographer credit are required;
  - default limits are 200 requests per hour and 20,000 per month;
  - no replicating Pexels' core functionality, such as wallpaper apps;
  - no working around rate limits.
- **(7) Category 1.** Downloading is Pexels' sanctioned core function under its own (non-CC) license and API rules.

#### Pixabay (category 1)
- **(5) License** — [Pixabay License summary](https://pixabay.com/service/license-summary/); the full terms are at pixabay.com/service/terms (not fetched).
  - Free use, no attribution required, modifications allowed.
  - No standalone sale or distribution of unaltered content.
  - Restrictions on trademarks and logos, immoral or misleading uses, and use as a trademark.
- **(4) API** — [Pixabay API docs](https://pixabay.com/api/docs/):
  - 100 requests per 60 seconds, counted per key;
  - results must be cached for 24 hours;
  - no permanent hotlinking: download images to your own server (videos may be embedded);
  - show users where the content came from;
  - no systematic mass downloads.
- **(7) Category 1.** Pixabay sanctions downloading under its Content License with API etiquette.

#### Unsplash (category 1)
- **(5) License** — [Unsplash License](https://unsplash.com/license):
  - Free download and use, commercial or not, with no permission needed. Attribution is appreciated.
  - No selling photos without significant modification.
  - No compiling photos to replicate a competing service.
  - Unsplash+ has a separate license.
- **(4) API guidelines** — [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines):
  - apps must hotlink the returned `photo.urls`;
  - apps must call `photo.links.download_location` whenever a user does something download-like;
  - credit Unsplash and the photographer with UTM links;
  - no replicating Unsplash's core experience, and no "Unsplash" in the app name;
  - excessive requests lose access.
- **(7) Category 1.** Downloading is sanctioned, but API clients must use Unsplash's hotlink-and-track flow.

#### Openverse (category 3)
- **(1) ToS.** Effective May 5, 2022 — [Openverse Terms of Service](https://docs.openverse.org/terms_of_service.html).
  - Openverse aggregates metadata about openly licensed works hosted by third parties.
  - It does not verify license accuracy, and users must confirm their rights at the source.
  - No scraping of the catalog.
  - Clients must follow rate limits and registration rules, and may not spread requests across machines to evade them.
  - Attribution is required.
- **(7) Category 3.** It indexes openly licensed media, but the file and the license check belong at the source site.

#### Freesound (category 3)
- **(1) ToS.** Introduced April 4, 2022. Sounds carry a CC license chosen by the uploader, and API users have separate terms — [Freesound Terms of Use](https://freesound.org/help/tos_web/).
- **FAQ** — [Freesound FAQ](https://freesound.org/help/faq/):
  - users must be logged in to download;
  - licenses are CC0, CC BY 4.0 and CC BY-NC 4.0, plus legacy Sampling+;
  - bulk users should go to the Data Packs Portal, not the API;
  - AI training is allowed if each sound's license is respected;
  - uploaders can set Generative AI preferences, including a no-generative-AI option, which API users can filter on.
- **(4) API.** `/apiv2/sounds/<id>/download/` requires OAuth2. Previews are available as mp3 and ogg. The `license` field takes the values Attribution, Attribution NonCommercial or Creative Commons 0 — [Freesound API resources](https://freesound.org/docs/api/resources_apiv2.html).
- **(7) Category 3.** All sounds are CC-licensed and downloading is the intended use, gated by login or OAuth2.

#### Jamendo (category 3)
- **(4) API: `/v3.0/tracks/file`** — [Jamendo API: tracks/file](https://developer.jamendo.com/v3.0/tracks/file):
  - redirects to the audio file;
  - `action` takes download or stream;
  - `client_id` is required;
  - formats are mp31, mp32, ogg and flac;
  - `audiodownload_allowed` tells clients whether a download may be offered, and from April 2022 the endpoint returns 404 when it is false (stated in future tense).
- **API terms.** Last modified September 17, 2013; acceptance required; Jamendo monitors use (search summary) — [Jamendo API terms](https://devportal.jamendo.com/api_terms_of_use).
- **General terms.** Updated April 17, 2025 (search summary) — [Jamendo terms](https://licensing.jamendo.com/en/legal/termsofuse). Sample API responses show CC BY-NC-ND 3.0 license URLs (search summary, same result set).
- **(7) Category 3.** The catalog is CC-licensed, with an explicit per-track flag for whether downloading is allowed.

#### Free Music Archive (category 3)
- **(1) Terms.** No date shown — [FMA Terms of Use](https://freemusicarchive.org/Terms_of_Use).
  - Operated by Tribe of Noise BV, which acquired FMA in 2019 (§2a).
  - Listening, downloading and streaming are free (§3a), and registration is optional.
  - Users must comply with the license of what they download (§7b).
  - Each track carries a CC, US public domain or custom license, shown on its page (§11a).
  - No automated requests and no data mining (§6e).
  - Site content is CC BY-NC-SA 4.0 (§10b).
- **Upload Policy.** Last updated July 20, 2023 (search summary) — [FMA Upload Policy](https://freemusicarchive.org/Upload_Policy).
- **(7) Category 3.** It is an open-license music repository with sanctioned free downloads, but some tracks carry custom licenses.

#### LibriVox (category 3)
- **Sources.** librivox.org and its wiki returned HTTP 522 (twice) — [LibriVox public-domain page](https://librivox.org/pages/public-domain/). As a fallback, LibriVox's Internet Archive collection metadata says LibriVox volunteers record public-domain texts, that all recordings are in the US public domain and free to download, and that users should check their country's law — [IA metadata: librivoxaudio](https://archive.org/metadata/librivoxaudio).
- **(7) Category 3.** The recordings are public domain in the US and distributed as free downloads.

#### Blender open movies (category 3)
- **Sprite Fright.** The page states a CC Attribution 1.0 license, an unusual version that needs verification. Credit goes to the Blender Foundation with a link to studio.blender.org. Logos and trademarks are excluded — [Blender Studio: Sprite Fright](https://studio.blender.org/films/sprite-fright/pages/about).
- **Other films (Wikipedia list).** Elephants Dream: CC BY 2.5. Big Buck Bunny: CC BY 3.0. Sintel and Tears of Steel: CC BY 3.0. Spring: CC BY 4.0 — [Wikipedia: List of open-source films](https://en.wikipedia.org/wiki/List_of_open-source_films).
- **Production archives.** Subscription-gated (search summary) — [Blender Studio Vault](https://studio.blender.org/vault/).
- **(7) Category 3.** The films are CC BY. Verify the license version per film and exclude the trademarks.

### Inferences
- **License versus contract.** An open license and platform permission are different things.
  - For CC videos on YouTube, Khan Academy-made videos on YouTube, or TED talks, the license may permit copying. The platform's ToS still govern how the file may be obtained: YouTube allows only methods expressly authorized by the Service, and TED bans scraping.
  - The tool should therefore never treat a CC label on a restrictive platform as download authorization. It should send users to the rights holder's own copy or an official download.
- **Default to deny.** Rights-holder download flags express permission; they are not technical barriers. Examples are Vimeo's Allow downloads toggle, PeerTube's `downloadEnabled`, SoundCloud's enable-downloads setting, Jamendo's `audiodownload_allowed`, and Open edX's Video Download Allowed. When the flag is absent or false, the tool should treat the item as category 4.
- **Owner exports suit "my own content" flows.** YouTube Studio and Takeout, Twitch Video Producer and the Kick dashboard all require the owner's own sign-in on the platform. A downloader can deep-link users there, but should not impersonate the flow.
- **Region-dependent YouTube ToS.** The ToS served vary by country and language: January 9, 2026 for gl=FR, December 15, 2023 for gl=US, and January 5, 2022 for the Arabic default. A compliance record should store the version applicable to the user's region.

### Gaps
- **Pages that could not be fetched, and the fallback used:**
  - legal.twitch.com ToS: page rendered only navigation (Conduct Atlas fallback).
  - help.twitch.tv: CSS error page (secondary guides used).
  - odysee.com/$/tos: connection reset (no fallback).
  - archive.org/about/terms.php: title-only render; web.archive.org cannot be fetched (help pages and 2014 blog used).
  - soundcloud.com/terms-of-use: error page (API terms and help-center summaries used).
  - udemy.com/terms: HTTP 403.
  - khanacademy.org/about/tos: page failed to load; support pages returned 403.
  - bilibili.com licence page: title only (elawcn mirror used).
  - librivox.org and wiki.librivox.org: HTTP 522 (IA metadata used).
  - openverse.org/terms: HTTP 403 (docs.openverse.org ToS used).
  - api.unsplash.com/documentation: HTTP 404 (help-center guidelines used).
  - developer.jamendo.com/v3.0/terms: HTTP 404.
  - developer.vimeo.com: rendered only the word "Vimeo."
  - images.nasa.gov API PDF: compressed, unparsed.
  - api.nasa.gov: only the signup page loaded.
- **Not verified because the search budget ran out:**
  - Mixcloud's offline and licensing help.
  - Bandcamp name-your-price and free-download mechanics and streaming caps.
  - Coursera web download controls.
  - The Dailymotion, Kick, Twitch and Odysee APIs.
  - The LinkedIn User Agreement.
  - Current TED download controls.
  - Bilibili's in-app cache rules and creator export.
  - Vimeo's CC license selector and its API License Addendum (whether third-party apps may fetch download links for others' videos).
  - PeerTube instance-level policies.
  - Whether LBRY Inc. has wound down, and who now owns Odysee.
  - Whether Vimeo changed owner in 2025 and updated its ToS after July 2024.

## Q2. YouTube: what exactly do the ToS, API Services Terms and Developer Policies say about downloading, and why does API access not grant download permission?

### Takeaway
YouTube allows downloading only through features the Service expressly provides or with YouTube's written permission, and it bans automated access. The API Developer Policies separately forbid API clients to download, cache, store or offer offline playback of audiovisual content (III.E.1), to scrape (III.E.6), to separate audio from video or play in the background (III.I.7–9), and to retrieve data by any technology other than the API (III.I.14). The API Services Terms grant no rights in audiovisual content (§16.3). API access is a limited, display-only license and never a download right.

### Cited Findings
- **YouTube ToS, "Permissions and Restrictions"** (US/en, December 15, 2023) — [YouTube ToS, US/en](https://www.youtube.com/static?template=terms&hl=en&gl=US):
  - **Item 1:** no downloading or reproducing unless expressly authorized by the Service, or with prior written permission from YouTube and, where applicable, the rights holders.
  - **Item 2:** no circumventing features that prevent or restrict copying.
  - **Item 3:** no automated means (robots, botnets, scrapers), except public search engines following robots.txt or with permission.
  - The gl=FR version (January 9, 2026) has equivalent items and a reference to limited offline viewing functionality — [YouTube ToS, gl=FR/en](https://www.youtube.com/static?gl=FR&template=terms&hl=en).
- **Developer Policies, Section III "General Developer Policies," III.E "Handling YouTube Data and Content," III.E.1 "Audiovisual Content"** — [YouTube API Developer Policies](https://developers.google.com/youtube/terms/developer-policies):
  - **III.E.1(a):** API clients must not "download, import, backup, cache, or store copies of YouTube audiovisual content" without YouTube's prior written approval.
  - **III.E.1(b):** clients must not make content available for offline playback.
- **Developer Policies, other provisions** (same source):
  - **III.E.4:** retention limits for API Data. Authorized and non-authorized data may be kept at most 30 days unless refreshed. Analytics data must be re-authorized every 30 days. Deletion requests must be honored within 7 days.
  - **III.E.6 Scraping:** no direct or indirect scraping of YouTube or Google applications, and no obtaining scraped YouTube data or content. Public search engines may scrape only per robots.txt or with permission.
  - **III.I "Additional Prohibitions":**
    - **III.I.6:** no modifying, building on or blocking the YouTube player.
    - **III.I.7:** no separating, isolating or modifying the audio or video components.
    - **III.I.8:** no promoting those components separately.
    - **III.I.9:** no background playback from a player not displayed on screen.
    - **III.I.14:** no technology other than YouTube API Services to access or retrieve API Data, including audiovisual content.
- **YouTube API Services Terms of Service** (no last-updated date on the page) — [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service):
  - **§16.1:** YouTube and its licensors keep all rights in the API Services and API Data.
  - **§16.2:** no rights or licenses beyond those expressly granted.
  - **§16.3:** no rights or licenses to reproduce or distribute audiovisual content; audiovisual content is available only through the API Services.
  - **§3.1:** access is only for developing and operating API clients.
  - **§10.1:** the only license grant is to display YouTube brand features.
  - **§15:** no circumventing quotas.
  - **§24.3:** all API Data must be deleted on termination.
  - **§12:** no infringing third-party IP.
- **Revision history.** The most recent revisions concern derived metrics and data storage (May 4 and June 1, 2026), API client identity (July 7, 2025) and removal of Android Player API references (January 23, 2025). None of them loosened the download or offline rules — [YouTube API revision history](https://developers.google.com/youtube/terms/revision-history).
- **Sanctioned routes.** All are first-party:
  - Studio download for owners (720p/360p) — [YouTube Help 56100](https://support.google.com/youtube/answer/56100?hl=en);
  - Takeout export for owners, promised in the ToS — [YouTube ToS, US/en](https://www.youtube.com/static?template=terms&hl=en&gl=US);
  - Premium offline (29 days or 48 hours; signed-in, same account) — [YouTube Help 11977233](https://support.google.com/youtube/answer/11977233?hl=en).

### Inferences
- **Why the API does not grant download rights.**
  - The API contract licenses metadata access and embedded playback through YouTube's player, and §16.3 withholds content rights.
  - The Developer Policies forbid download, caching and offline use outright (III.E.1), as well as fetching media by any non-API technology (III.I.14). Combining API metadata with stream extraction therefore breaches the API terms twice and the ToS once.
  - Creators' copyrights also sit outside YouTube's license to developers (§12, §16).
- **Implication for the tool.** For YouTube, the compliant feature set is metadata and embed through the official API or player, plus deep links to Studio download, Takeout and Premium offline.

### Gaps
- **ToS dates.** Third-party tracker entries report YouTube ToS text revisions in April and May 2026 (age wording, languages, operational clarifications) — [Conduct Atlas, April 19, 2026 (search summary)](https://conductatlas.com/change/2026-04-19-youtube-youtube-terms-of-service-523/); [Conduct Atlas, May 5, 2026 (search summary)](https://conductatlas.com/change/2026-05-05-youtube-ads-youtube-terms-of-service-1659/). This conflicts with the January 9, 2026 "Dated" line on the gl=FR render, and the conflict is unresolved.
- **Paid Service Terms.** Reportedly effective February 11, 2026 (search summary) — [YouTube Paid Service Terms](https://www.youtube.com/premium/restrictions). Not opened.
- **Data API license field.** Whether the YouTube Data API exposes the video license (`status.license`) was not verified this session. It would not confer download rights anyway.

## Q3. Which platforms expose machine-readable "download allowed" signals?

### Takeaway
Signals come in three kinds:
- **Explicit per-item permission flags:** PeerTube `downloadEnabled`, Jamendo `audiodownload_allowed`, Vimeo's API `download` links tied to the owner's Allow downloads toggle, Open edX Video Download Allowed, and SoundCloud's uploader download toggle.
- **Rights metadata:** Internet Archive `licenseurl`, `rights` and `access-restricted-item`; Freesound and PeerTube license fields; Wikimedia Commons per-file licenses; RSS `<enclosure>`.
- **Usage-tracking hooks that are not permissions:** Unsplash `download_location`.

The Flickr `can_download` signal could not be verified.

### Cited Findings
- **PeerTube.**
  - `downloadEnabled` (boolean) on Video and VideoDetails. Per-file `fileDownloadUrl` and `torrentDownloadUrl`, served as attachments. `licence` (id, label) and `privacy` — [PeerTube VideoDetails](https://docs.joinpeertube.org/api-rest-reference/api/models/videodetails.html).
  - The muxing endpoint `/download/videos/generate/{id}` — [PeerTube Video Download](https://docs.joinpeertube.org/api-rest-reference/api/video-download.html).
  - The flag also travels over ActivityPub (search summary) — [PeerTube ActivityPub](https://docs.joinpeertube.org/api/activitypub).
  - It is the owner's "Enable download" checkbox in the UI — [PeerTube create/upload](https://docs.joinpeertube.org/use/create-upload-video).
- **Vimeo.** The API's `download` field holds 24-hour attachment links. It needs the public, private and video_files scopes — [Vimeo Help: API download links](https://help.vimeo.com/hc/en-us/articles/12427806914577-Get-video-file-and-download-links-from-the-API). The UI toggle is per video (search summary) — [Vimeo Help](https://help.vimeo.com/hc/en-us/articles/15059498665745). The exact privacy field name (often cited as `privacy.download`) could not be confirmed on an official page that was fetched.
- **SoundCloud.**
  - The uploader's download toggle is in the UI (search summary) — [SoundCloud Help](https://help.soundcloud.com/hc/en-us/articles/31423603670043).
  - The API documents `access` (playable, preview, blocked) — [SoundCloud API Guide](https://developers.soundcloud.com/docs/api/guide).
  - The API Terms §05 make uploader download permission irrelevant to third-party apps, since file-save and offline access are banned regardless — [SoundCloud API Terms](https://developers.soundcloud.com/docs/api/terms-of-use).
  - A `downloadable` track field was not found on the guide page that was fetched.
- **Internet Archive.** Rights signals are `licenseurl` (a recognized license URL), `rights` (a free-text statement), `access-restricted-item`, `public-format` and `geo_restricted` — [IA Metadata Schema](https://archive.org/developers/metadata-schema/index.html). In the UI, an item with no DOWNLOAD OPTIONS panel is likely not downloadable — [IA Downloading guide](https://help.archive.org/help/downloading-a-basic-guide/).
- **Jamendo.** `audiodownload_allowed`; `/tracks/file` returns 404 when it is false (April 2022 onward) — [Jamendo tracks/file](https://developer.jamendo.com/v3.0/tracks/file).
- **Freesound.** The `license` field is Attribution, Attribution NonCommercial or Creative Commons 0. Downloads require OAuth2 — [Freesound API](https://freesound.org/docs/api/resources_apiv2.html). An uploader no-generative-AI preference can be filtered on — [Freesound FAQ](https://freesound.org/help/faq/).
- **Open edX.** The course-team setting Video Download Allowed is true or false and requires a non-YouTube file URL — [Open edX docs](https://edx.readthedocs.io/projects/open-edx-building-and-running-a-course/en/open-release-maple.master/video/additional_video_options.html).
- **Udemy.** A per-lecture "Downloadable" toggle, off by default. Only a UI signal was found (search summary) — [Udemy Help](https://support.udemy.com/hc/en-us/articles/360052936774-How-Instructors-Can-Enable-Course-Videos-For-Downloading-on-a-Computer).
- **Wikimedia Commons.** The license appears on each file description page — [Commons reuse](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia).
- **Podcasts.** `<enclosure url length type>` marks an attached media object — [RSS 2.0](https://www.rssboard.org/rss-specification).
- **Unsplash.** `photo.links.download_location` must be called on download-like actions. It is attribution and statistics tracking, not a permission check — [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines).
- **Openverse.** It returns license metadata, but its ToS say the license information is unverified and must be checked at the source — [Openverse ToS](https://docs.openverse.org/terms_of_service.html).
- **Flickr.** The official flickr.photos.getInfo example response shows a `license` attribute, but no usage or `candownload` element — [Flickr API: photos.getInfo](https://www.flickr.com/services/api/flickr.photos.getInfo.html).

### Inferences
- **Precedence of signals.** The tool should rank them: explicit owner flag > item license metadata > platform default. A missing flag defaults to "not permitted."
- **Flags do not stop technical access.** PeerTube files stay fetchable for playback whatever `downloadEnabled` says. The docs describe the flag only as enabling or disabling download, so the flag is a permission record, not DRM.
- **SoundCloud is the cautionary case.** An uploader's download permission does not transfer to API-based apps.

### Gaps
- Flickr's `candownload` usage element (and the user-level download preference) was not verified, because the documentation example lacks it and the search budget ran out.
- Openverse field names (`license`, `license_version`, `license_url`, `foreign_landing_url`) were not verified on the fetched pages.
- Vimeo's privacy download field name and the visibility of `download` for non-owners are unverified.
- SoundCloud `downloadable` and `download_url` fields are unverified.

## Q4. Which platforms are DRM-protected or app-bound (unsupported), and what official offline routes do they offer instead?

### Takeaway
The protected or app-bound platforms are:
- Spotify (Premium in-app offline with a 30-day check-in);
- YouTube Premium offline (29 days, or 48 hours in some regions; same signed-in account);
- Apple's DRM-protected purchases and Apple Podcasts Subscriptions (Apple software only);
- Udemy (encrypted in-app offline);
- LinkedIn Learning (mobile-app-only offline).

Coursera, Dailymotion, Mixcloud and Bilibili offer or imply app-bound offline viewing on top of restrictive ToS. The official alternative is always the platform's own offline mode, never an exportable file.

### Cited Findings
- **Spotify.**
  - Premium downloads cover albums, playlists and podcasts; Free covers podcasts only. Limits are 10,000 tracks on each of 5 devices, with a reconnect at least every 30 days — [Spotify Support](https://support.spotify.com/us/article/listen-offline/).
  - Moving cached copies off an authorized device, circumventing technology and ripping are prohibited — [Spotify User Guidelines](https://www.spotify.com/us/legal/user-guidelines/).
  - SDK apps may offer only time-limited Conditional Downloads for Premium users (IV.3.2(b)) — [Spotify Developer Terms](https://developer.spotify.com/terms).
- **YouTube Premium.** The Download button and Downloads page work on mobile and desktop browsers. Offline playback lasts 29 days, or 48 hours in some regions. Copies are removed at sync if no longer available, and play only on the same signed-in account — [YouTube Help 11977233](https://support.google.com/youtube/answer/11977233?hl=en).
- **Apple.**
  - DRM-protected content is limited to 5 computers plus synced devices. Security technology must not be circumvented. Services may be accessed only through Apple's software, and Apple Podcasts Subscriptions are covered in Section P — [Apple Media Services Terms](https://www.apple.com/legal/internet-services/itunes/us/terms.html).
  - iTunes previews must be streamed, never downloaded or cached — [Apple Search API](https://performance-partners.apple.com/search-api).
- **Udemy.** Mobile downloads are encrypted and playable only in the app (search summary) — [Udemy Help](https://support.udemy.com/hc/articles/229231167). Desktop file downloads exist only for lectures the instructor marks Downloadable (search summary) — [Udemy Help](https://support.udemy.com/hc/en-us/articles/360052936774-How-Instructors-Can-Enable-Course-Videos-For-Downloading-on-a-Computer).
- **LinkedIn Learning.** Offline works only in the mobile app with an active subscription; there are no desktop downloads (search summary) — [LinkedIn Help 71907](https://www.linkedin.com/help/learning/answer/71907).
- **Coursera.** Offline downloads in the mobile app (search summary) — [Coursera Blog](https://blog.coursera.org/mobile-offline-features).
- **Dailymotion.** Its license wording mentions offline display without permanent download (§3.1), and the streaming definition excludes permanent copies (§6.9) — [Dailymotion ToS](https://legal.dailymotion.com/en/terms-of-use/).
- **Internet Archive.** Lending-program books and some collections are access-restricted and not downloadable — [IA Downloading guide](https://help.archive.org/help/downloading-a-basic-guide/).

### Inferences
- **Not all are formal DRM.** For several entries (YouTube Premium, LinkedIn Learning, Coursera, Mixcloud, Bilibili), the official pages fetched describe in-app or same-account restrictions rather than naming DRM. Category 5 is used where offline copies are app-bound and not exportable. Explicit DRM language was found only in Apple's terms; Spotify's terms use circumvention and caching language instead.

### Gaps
- No official page that was fetched explicitly states the encryption scheme used by Spotify, YouTube Premium, LinkedIn Learning, Coursera, Mixcloud or Bilibili offline storage. Mixcloud Premium offline and the Bilibili cache were not verified.

## Q5. Any 2025–2026 changes (enforcement against downloaders, new official download features, ToS updates)?

### Takeaway
There was no loosening of download rules. YouTube's anti-downloader technical measures intensified through 2025–2026 (PO tokens, SABR, a JavaScript runtime requirement, and breakages in January 2026), though YouTube made no official statement. New owner-export features appeared (Kick's VOD download). Many ToS were refreshed in 2025–2026 with explicit AI-training and scraping bans.

### Cited Findings
- **YouTube: technical enforcement (secondary sources).**
  - yt-dlp's wiki describes PO tokens generated by attestation providers and bound to the video ID. Some GVS PO tokens are not needed for Premium subscribers (search summary) — [yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide).
  - A JavaScript engine such as Deno became required in September 2025 (search summary) — [PiunikaWeb, Sept 25, 2025](https://piunikaweb.com/2025/09/25/youtube-token-checks-third-party-issues/).
  - SABR-only formats are forced for some clients (search summary) — [VideoHelp forum](https://forum.videohelp.com/threads/419212-YouTube-SABR-Protection).
  - In late January 2026, users reported failures in 4K Video Downloader Plus, yt-dlp (HTTP 403, fixed in a new release), Downlodr and downr.org. There was no official YouTube statement, and the cause was partly speculative — [PiunikaWeb, Jan 30, 2026](https://piunikaweb.com/2026/01/30/youtube-blocking-video-downloaders-premium-crackdown/).
- **YouTube: terms.**
  - The ToS dated January 9, 2026 was observed on the gl=FR render — [YouTube ToS, gl=FR/en](https://www.youtube.com/static?gl=FR&template=terms&hl=en).
  - API policy revisions on January 23 and July 7, 2025 and May 4 and June 1, 2026 concerned the Android Player API, client identity, and derived metrics and storage — [YouTube API revision history](https://developers.google.com/youtube/terms/revision-history).
- **Kick.** Native download of your own VODs in the Creator Dashboard — [Kick Help](https://help.kick.com/en/articles/7832538-how-to-download-your-kick-vod), dated September 25, 2026 by a vendor blog (search summary) — [Upstream](https://upstream.so/blog/how-to-download-kick-vods/). ToS modified March 23, 2026 — [Kick ToS](https://kick.com/terms-of-service).
- **Dailymotion.** New ToS (June 30, 2026, effective July 7, 2026) with explicit bans on scraping and AI/ML training — [Dailymotion ToS](https://legal.dailymotion.com/en/terms-of-use/).
- **Rumble.** ToS of September 1, 2026, including an AI-training license over uploads — [Rumble Terms](https://rumble.com/s/terms).
- **Twitch.** Terms update of August 12, 2026, per a New York Attorney General filing (search summary) — [NY AG report](https://ag.ny.gov/sites/default/files/social-media-policy-report/2026-q1q2-amazon.com-inc-policy-1-twitch.pdf).
- **Spotify.** Developer Terms v10 (May 15, 2025) with ML/AI and stream-ripping bans — [Spotify Developer Terms](https://developer.spotify.com/terms). Terms of Use updated September 4, 2026 — [Spotify ToS](https://www.spotify.com/us/legal/end-user-agreement/).
- **Apple.** Media Services Terms updated September 14, 2026 (AI training and scraping bans) — [Apple Media Services Terms](https://www.apple.com/legal/internet-services/itunes/us/terms.html).
- **Bandcamp.** ToS effective May 7, 2026 (no AI training on artists' music) — [Bandcamp ToS](https://bandcamp.com/terms_of_use).
- **Education.**
  - Coursera ToS effective January 1, 2026 (text/data mining and model-training ban) — [Coursera Terms](https://www.coursera.org/about/terms).
  - edX ToS updated November 3, 2025 — [edX ToS](https://www.edx.org/edx-terms-service).
  - MIT OCW terms updated 08/11/2026, allowing AI training under CC BY-NC-SA — [MIT OCW terms](https://ocw.mit.edu/pages/privacy-and-terms-of-use/).
- **Open content.**
  - NASA guidelines updated October 27, 2026 (NFT and super-intelligence clauses) — [NASA guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
  - Wikimedia Robot policy edited March 16, 2026, with media-download caps — [Robot policy](https://wikitech.wikimedia.org/wiki/Robot_policy). Commons multimedia download bandwidth rose about 50%, attributed largely to AI crawlers (reported April 2025; search summary) — [TechCrunch](https://techcrunch.com/2025/04/02/ai-crawlers-cause-wikimedia-commons-bandwidth-demands-to-surge-50). Global API rate limits were announced (search summary) — [Phabricator T418997](https://phabricator.wikimedia.org/T418997).
  - Freesound added uploader Generative AI preferences (date not stated) — [Freesound FAQ](https://freesound.org/help/faq/).
- **Other platforms.**
  - Bilibili user agreement updated April 30, 2025, effective May 7, 2025 (mirror) — [elawcn](https://www.elawcn.com/agreement/2025/1120/1648.html).
  - DTube reportedly relaunched in December 2025 (citation needed on Wikipedia) — [Wikipedia: DTube](https://en.wikipedia.org/wiki/DTube).
  - PeerTube is on the 8.x line, with ownership and management features from 8.1.0 (search summary) — [PeerTube docs: library](https://docs.joinpeertube.org/use/library).

### Inferences
- **Technical extractability is unstable.** YouTube's measures make extraction a moving target and raise ToS risk (item 2 bans circumventing copy-restriction features).
- **More downloaders mean more AI-training bans.** The 2025–2026 ToS wave (Dailymotion, Spotify, Apple, Coursera, Mixcloud, SoundCloud API) adds AI-training and scraping prohibitions. Any downloader that also feeds ML pipelines needs a separate gate.

### Gaps
- Legal actions in 2025–2026 against stream-ripping or downloader services (for example by RIAA or Google) were not researched, because the search budget ran out.
- No official YouTube or Google statement on downloader blocking was found.
- The exact contents of the reported April–May 2026 YouTube ToS revisions and the August 2026 Twitch update were not verified.
