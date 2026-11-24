# Universal media downloader landscape: platform catalog (breadth seed for a hostname-based capability registry)

All sources accessed 2026-11-24. Local evidence comes from a read-only inspection of the installed yt-dlp 2026.11.23 (`--list-extractors`, plus reading extractor class attributes `_VALID_URL`, `_TESTS`, `working()`, `_NETRC_MACHINE`, `IE_DESC`, `age_limit` filtering). Nothing was downloaded.

## 1. Catalog: which distinct platforms (at least 110) should seed the registry, with detection hostnames, content types, engine support, auth, API and caveats?

### Takeaway
The table below lists **214 distinct platforms** (counted rows; aliases, sub-extractors and URL patterns are folded into one row, and a few rows that group sibling sites count once), plus 4 uncounted helper rows: direct media URLs, generic RSS feeds, YouTube Premium-only content, and the rest of yt-dlp's DRM deny-list. About **178–179 of the 214** have at least one working engine path (yt-dlp, gallery-dl or Streamlink); ITVX is borderline because its regex matches only legacy URLs. The remaining ~35 are DRM-protected, unsupported by policy, defunct (Trovo live, Gfycat), have every extractor broken (Kuwo, Teachable), or simply have no extractor in any of the three engines (Threads, Kuaishou, Coursera, edX, Skillshare, GIPHY, Pixabay, Openverse, MEGA and others).

### Cited Findings

**Method and source keys** (used throughout the table)
- **Y** = yt-dlp 2026.11.23 extractor `IE_NAME`s. "**Currently broken**" is copied from the extractor's `working()` flag, which is the flag supportedsites.md renders as "Currently broken" — [yt-dlp supportedsites.md][ytss]; release notes [2026.11.23][ytrel]. yt-dlp hostnames come from each extractor's `_VALID_URL` regex and `_TESTS` URLs (local read-only introspection of the same code that generates supportedsites.md).
- **G** = gallery-dl category ids and the auth column (Cookies / OAuth / API Key / Supported) from [gallery-dl supportedsites.md][gdlss] (release v1.32.21).
- **S** = Streamlink plugin module names from [the Streamlink plugins directory on master][slsrc] (the same set that is rendered at [streamlink.github.io/plugins.html][slp]; release 8.6.3).
- yt-dlp refuses DRM-only sites through a hidden `DRM` extractor (`KnownDRMIE`), refuses piracy sites through `Piracy`, and refuses "liability" sites through `Liability` — [unsupported.py][ytdrm].
- yt-dlp's `generic` extractor follows HTTP redirects to the final URL (`report_following_redirect`), matches direct media by Content-Type, sniffs `#EXTM3U`, and parses RSS, SMIL, XSPF, DASH MPD, F4M and ISM documents — [generic.py][ytgen]. gallery-dl's `directlink` matches file extensions — [directlink.py][gdldl].
- **Hostname convention:** plain hostnames are verified, either in an engine's own URL regex or tests, in gallery-dl's site URL column, or in the source cited in that row. *Italic* hostnames are extra common variants from general knowledge (shorteners, CDNs, legacy or brand domains); validate them before relying on them. "(redir)" means no engine regex matches the host, so resolve the redirect first (yt-dlp's generic extractor does this automatically). "(normalize)" means the host should be rewritten to the canonical host before dispatch, because the extractor regex does not accept it.
- **Auth** = judgment for typical *public* content. **Official API** names are general knowledge of vendor developer programs and were not re-verified in this pass (see Gaps). **(GK)** marks a note that comes from general knowledge and was not verified here.

| Platform | Category | Hostnames for detection | Content types | Engine support | Auth for typical public content | Official API | Notes |
|---|---|---|---|---|---|---|---|
| 1. TikTok | social | tiktok.com, www.tiktok.com, m.tiktok.com, vm.tiktok.com, vt.tiktok.com, tiktok.com/t/… short path, www.tiktokv.com; *tiktokcdn.com (CDN)* | video, image slideshows, audio, live, playlist (user/collection) | Y: `TikTok`, `vm.tiktok`, `tiktok:user`, `tiktok:collection`, `tiktok:live`; `tiktok:effect`, `tiktok:sound`, `tiktok:tag` **Currently broken** · G: `tiktok` (Cookies) · S: `tiktok` | none (sometimes: age/region gates) | TikTok Display API / Research API (gated) | Extractor uses curl_cffi impersonation. Aug-2026 breakage was fixed in 2026.08.19 ([downstream PR][ttfix]; [#17403][tt17403]). `tiktok:user` secondary-ID failures: [#17500][tt17500] |
| 2. X / Twitter | social | x.com, twitter.com, www./m./mobile. variants, t.co, amp.twimg.com, twitter3e4tixl4xyajtrzo62zg5vztmjuricljdp2c5kshju4avyoid.onion; *video.twimg.com, pbs.twimg.com (CDN)* | video, gif (served as MP4), image, audio (Spaces), live (Broadcasts), playlist (timelines via G) | Y: `twitter`, `twitter:shortener`, `twitter:broadcast`, `twitter:spaces`, `twitter:card`, `twitter:amplify`, `twitter:event` · G: `twitter` (Cookies), "Twitter t.co" links, Nitter instances · S: — | sometimes (NSFW and protected accounts need cookies) | X API v2 (paid tiers) | 2026.11.23 reworked broadcast extraction and fixed Spaces ([rel][ytrel]). Failures from invalidated cookies and protected accounts: [#17950][tw17950], [#17243][tw17243] |
| 3. Reddit | social | reddit.com and any *.reddit.com (www, old, new, nm…), redditmedia.com; *redd.it, v.redd.it, i.redd.it, preview.redd.it, external-preview.redd.it, /r/<sub>/s/<code> share links (redir)* | video (DASH/HLS, separate audio), image, gif, gallery/playlist (G) | Y: `Reddit` · G: `reddit` (OAuth) · S: — | sometimes, trending to always | Reddit Data API (OAuth) | Open issue (opened 2026-10-31): "403 Blocked", then "Your IP address is unable to access the Reddit API"; contributors say cookies plus `--impersonate chrome` are needed ([#17965][rd17965]). Private and quarantined subreddits raise login-required (reddit.py) |
| 4. Facebook | social | facebook.com and any *.facebook.com (www, m, web, es-la, zh-hk…), facebookwkhpilnemxj7asaniu7vnjjbiltxjqhye3mhbshg7kx5tfyd.onion; *fb.watch, fb.com, fb.me (redir); fbcdn.net (CDN)* | video, reels, live, image/albums (G) | Y: `facebook`, `facebook:reel`, `facebook:ads`, `FacebookPluginsVideo` (+ hidden `FacebookRedirectURL`) · G: `facebook` (Cookies) · S: `facebook` | sometimes (login walls, 18+) | Meta Graph API (own Pages/videos) | Recurring "Cannot parse data" errors through 2026 ([#15161][fb15161], [#17906][fb17906]). [#18016][fb18016] was closed 2026-11-22 by improving the error messages. 2026.11.23 adds age-restriction detection ([rel][ytrel]) |
| 5. Instagram | social | instagram.com, www.instagram.com; *instagr.am (redir), cdninstagram.com (CDN)* | video (reels/IGTV), image, carousel/album, stories, playlist (profiles via G) | Y: `Instagram`, `instagram:story`, `instagram:tag`, `InstagramIOS`; `instagram:user` **Currently broken** · G: `instagram` (Cookies) · S: — | sometimes to often (rate-limit or login wall); always for stories | Instagram Graph API (Business/Creator own content) | Story downloads failed even with cookies in Sep–Oct 2026 ([#17755][ig17755]). Long-standing "rate-limit reached or login required" error ([#11166][ig11166]). Audience-restricted posts need cookies ([downstream PR][igpr]) |
| 6. Threads | social | threads.com, www.threads.com, threads.net (redirects since Apr 2025) | video, image, text | none of Y/G/S | n/a | Threads API (Meta) | Unsupported by all three engines. Domain move: [Meta][threads] |
| 7. Bluesky | social | bsky.app, main.bsky.dev, at:// URIs; *video.bsky.app, cdn.bsky.app (CDN)* | video (HLS), image, gif | Y: `Bluesky` · G: `bluesky` (login supported) · S: — | none | AT Protocol (public AppView XRPC) | Some profiles are visible only to logged-in users (GK) |
| 8. Mastodon / fediverse | social | instance-defined: mastodon.social (G), *mastodon.online, mstdn.social and thousands more*; detect via `/@user/<id>` path plus `/api/v1/instance` probe | video, image, gif, audio | Y: — (no extractor) · G: `mastodon` instances (mastodon.social: OAuth) and `misskey` instances · S: — | none | Mastodon REST API (per instance) | Federated: the full host list cannot be enumerated |
| 9. Snapchat | social | snapchat.com, www.snapchat.com (`/spotlight/<id>`); *story.snapchat.com, t.snapchat.com* | video (Spotlight) | Y: `SnapchatSpotlight` | none | Snap Kit (no media export) | Only Spotlight URLs are matched |
| 10. LinkedIn (incl. Learning) | social | linkedin.com, www.linkedin.com; *lnkd.in (redir), media.licdn.com, dms.licdn.com (CDN)* | video (posts), live (events), courses | Y: `LinkedIn`, `linkedin:events`, `linkedin:learning`, `linkedin:learning:course` | none for public posts; always for Learning | LinkedIn Marketing / Community Mgmt APIs (partner) | `/learning/` paths are paid content |
| 11. Telegram | social | t.me; *telegram.me* | video, image (public channel posts) | Y: `telegram:embed` | none (public channels only) | Bot API / MTProto (TDLib) | Private chats unsupported |
| 12. Truth Social | social | truthsocial.com | video, image | Y: `Truth` | none | none official | — |
| 13. 9GAG | social | 9gag.com; *img-9gag-fun.9cache.com (CDN)* | video, gif (MP4), image | Y: `9gag` | none | none | — |
| 14. Likee | social | likee.video, www.likee.video | video, playlist (user) | Y: `likee`, `likee:user` | none | none | — |
| 15. Patreon | social | patreon.com, www.patreon.com; *patreonusercontent.com (CDN)* | video, audio, image, playlist (campaign) | Y: `patreon`, `patreon:campaign` · G: `patreon` (Cookies) | sometimes (patron-only posts need cookies) | Patreon API v2 (creator OAuth) | — |
| 16. Substack | social | `<pub>.substack.com/p/<slug>`; *substack.com, open.substack.com, custom publication domains* | video, audio (podcast posts) | Y: `Substack` | sometimes (paid posts) | none public | Regex only matches *.substack.com; custom domains need page-marker detection |
| 17. Discord | social | discord.com (G); *discord.gg (invites), cdn.discordapp.com, media.discordapp.net (attachments)* | image, video, audio attachments | G: `discord` · Y/S: — | always (server membership) | Discord API (bot/user token) | Attachment URLs are signed and expire (GK) |
| 18. YouTube (incl. Shorts, Live, Music, Kids) | video | youtube.com and any subdomain (www., m., music.…), youtube-nocookie.com, youtubekids.com, youtu.be, hooktube.com, deturl.com, dozens of Invidious mirror hosts; *googlevideo.com (CDN), i.ytimg.com* | video, audio, live, playlist/channel, subtitles (incl. auto-captions), Shorts | Y: `youtube` plus 19 more (`youtube:tab`, `youtube:playlist`, `YoutubeYtBe`, `youtube:clip`, `youtube:search`, `youtube:music:search_url`, `YoutubeLivestreamEmbed`…; netrc `youtube`) · G: — · S: `youtube` | sometimes (bot check, age gate); always for members-only/Premium | YouTube Data API v3 (metadata only) | Several clients need PO tokens; without them requests can get 403 and accounts/IPs can be blocked ([PO Token Guide][pot]). 2026.11.23 temporarily removed `web` from the default clients and added `ios_producer` ([rel][ytrel]). 403 waves in 2026: [#17395][yt17395], [#17682][yt17682] |
| 19. Vimeo | video | vimeo.com, player.vimeo.com, vimeopro.com; *livestream.com (Vimeo Livestream)* | video, live (events), subtitles, playlist (album/showcase/channel/group/user) | Y: `vimeo` plus `vimeo:album`, `:channel`, `:event`, `:group`, `:likes`, `:ondemand`, `:pro`, `:review`, `:user`, `:watchlater` (netrc) · S: `vimeo`, `livestream` | sometimes (private, password, unlisted hash) | Vimeo API | On Demand purchases need login |
| 20. Dailymotion | video | dailymotion.com (regex also accepts other 2–3-letter TLDs), www./touch./geo.dailymotion.com, dai.ly, lequipe.fr (partner) | video, live, playlist, subtitles | Y: `dailymotion`, `dailymotion:playlist`, `dailymotion:user`, `dailymotion:search` (netrc) · S: `dailymotion` | none | Dailymotion Platform API | Some videos geo-blocked |
| 21. Rumble | video | rumble.com, www.rumble.com (`/v…`, `/embed/`, `/c/`) | video, live, playlist (channel) | Y: `Rumble`, `RumbleEmbed`, `RumbleChannel` | none | none public | Unavailable in some countries (GK) |
| 22. Odysee / LBRY | video | odysee.com, lbry.tv (legacy), lbry:// URIs; *player.odycdn.com (CDN)* | video, audio, playlist/channel | Y: `lbry`, `lbry:channel`, `lbry:playlist` | none | LBRY protocol API (unofficial for Odysee) | — |
| 23. PeerTube (federated) | video | ~1,000 instance hosts hard-coded in the yt-dlp regex (list taken from instances.joinpeertube.org), plus a `peertube:<host>:<id>` scheme; detect unknown instances via `/w/<id>`, `/videos/watch/<uuid>`, `/api/v1/videos` | video, live, playlist, subtitles | Y: `PeerTube`, `PeerTube:Playlist` | none | PeerTube REST API (per instance) | Unknown instances need an API probe |
| 24. Bilibili | video | bilibili.com, www./space./t./live./player.bilibili.com, bilibili.tv, www.bilibili.tv, biliintl.com; *m.bilibili.com (normalize), b23.tv (redir)* | video, audio, live, subtitles, playlist (collections/favorites/series), bangumi, courses | Y: 22 extractors incl. `BiliBili`, `BiliBiliBangumi`, `BilibiliCheese`, `BiliLive`, `BiliIntl` (netrc biliintl), `BilibiliSpaceVideo` · G: `bilibili` (articles/images) · S: `bilibili` | sometimes (1080p+ and members need login; bangumi geo-locked) | partner-only open platform | — |
| 25. Niconico | video | nicovideo.jp, www./sp./embed./live./ch.nicovideo.jp, nico.ms, nicochannel.jp (Channel Plus) | video, live, playlist/series, comments | Y: 14 incl. `niconico` (netrc), `niconico:live`, `niconico:playlist`, `niconico:series`, `NiconicoChannelPlus` · S: `nicolive` | sometimes (premium/paid channels) | Snapshot Search API (metadata) | Some content JP-only (GK) |
| 26. BitChute | video | bitchute.com, www./old.bitchute.com | video, playlist (channel) | Y: `BitChute`, `BitChuteChannel` | none | none | — |
| 27. Streamable | video | streamable.com (`/e/`, `/s/`) | video | Y: `Streamable` | none | none current | — |
| 28. Loom | video | loom.com, www.loom.com | video | Y: `loom`; `loom:folder` **Currently broken** | sometimes (workspace-restricted) | Loom SDK (record/embed only) | — |
| 29. Wistia | video (embed host) | fast.wistia.com, fast.wistia.net; *`<account>.wistia.com`* | video, playlist/channel | Y: `Wistia`, `WistiaPlaylist`, `WistiaChannel` (+ generic embed detection) | none | Wistia Data API | Mostly embedded in third-party pages |
| 30. JW Player | video (embed host) | cdn.jwplayer.com, content.jwplatform.com | video, subtitles | Y: `JWPlatform` (+ generic embed detection) | none | JW Platform Management API | Some customers apply DRM |
| 31. Brightcove | video (embed host) | players.brightcove.net, link.brightcove.com, c.brightcove.com, brightcove.com | video, subtitles | Y: `brightcove:new`, `brightcove:legacy` | none | Brightcove CMS / Playback API | Widely used by broadcasters; some DRM |
| 32. Kaltura | video (embed host) | kaltura.com, www./cdnapisec.kaltura.com; *`<org>.mediaspace.kaltura.com`* | video, subtitles | Y: `Kaltura` | sometimes (institutional SSO) | Kaltura API | Common at universities |
| 33. Nebula | video | nebula.tv, beta.nebula.tv, nebula.app, watchnebula.com | video, playlist (channel/season) | Y: `nebula:video`, `nebula:media`, `nebula:channel`, `nebula:season`, `nebula:subscriptions` (netrc watchnebula) | always (subscription) | none | — |
| 34. Floatplane | video | floatplane.com, www./beta.floatplane.com | video, playlist (channel) | Y: `Floatplane`, `FloatplaneChannel` | always (subscription cookies) | none public | — |
| 35. Newgrounds | video | newgrounds.com, www.newgrounds.com, `<user>`.newgrounds.com | video, audio, image, playlist | Y: `Newgrounds` (netrc), `Newgrounds:playlist`, `Newgrounds:user` · G: `newgrounds` (login supported) | sometimes (adult-rated needs login) | none (Newgrounds.io is a game API) | — |
| 36. IMDb | video | imdb.com, www.imdb.com | video (trailers), playlist (lists) | Y: `imdb`, `imdb:list` | none | IMDb data via AWS Data Exchange (paid; GK) | — |
| 37. Tubi | video | tubitv.com (`/movies/`, `/tv-shows/`, `/video/`); *tubi.tv* | video, subtitles, series | Y: `tubitv`, `tubitv:series` | none | none | Available only in select countries (GK) |
| 38. Steam | video | store.steampowered.com (`/app/<id>`), steamcommunity.com (`/broadcast/watch/<id>`) | video (trailers), live (broadcasts) | Y: `Steam`, `SteamCommunity`, `SteamCommunityBroadcast` · S: `steam` | none (age check for mature titles) | Steam Web API (no media) | — |
| 39. Twitch | live-streaming | twitch.tv, www./m./go.twitch.tv, player.twitch.tv, clips.twitch.tv | live, video (VOD), clips, chat replay | Y: `twitch:stream`, `twitch:vod`, `twitch:clips`, `twitch:videos`, `twitch:videos:clips`, `twitch:videos:collections`, `twitch:collection` (netrc) · S: `twitch` | none (sub-only VODs need cookies) | Twitch Helix API | — |
| 40. Kick | live-streaming | kick.com, www.kick.com | live, video (VOD), clips | Y: `kick:live`, `kick:vod`, `kick:clip`, `kick:clips`, `kick:videos` · S: `kick` | none | Kick Public API (GK) | Extractor uses impersonation (kick.py) |
| 41. SOOP (formerly AfreecaTV) | live-streaming | sooplive.com, www./play./vod.sooplive.com; *sooplive.co.kr variants, afreecatv.com (legacy)* | live, video (VOD), catch clips, playlist | Y: `soop`, `soop:live`, `soop:user`, `soop:catchstory` (netrc afreecatv) · S: `soop` | sometimes (19+ and subscriber streams) | SOOP open API (unverified) | Korea-centric |
| 42. Trovo (defunct live) | live-streaming | *trovo.live, www.trovo.live* | (formerly live, VOD, clips) | none (no yt-dlp extractor and no Streamlink plugin in current lists) | n/a | — | Tencent ended Trovo live streaming on 2026-06-30 ([Streams Charts][trovo]). Mark dead |
| 43. DLive | live-streaming | dlive.tv | live, video | Y: `dlive:stream`, `dlive:vod` · S: `dlive` | none | DLive GraphQL (GK) | — |
| 44. Picarto | live-streaming | picarto.tv | live, video, image (G) | Y: `picarto`, `picarto:vod` · G: `picarto` · S: `picarto` | none | Picarto API (GK) | — |
| 45. TwitCasting | live-streaming | twitcasting.tv | live, video, playlist (user) | Y: `TwitCasting`, `TwitCastingLive`, `TwitCastingUser` · S: `twitcasting` | sometimes (password/member-only) | TwitCasting API v2 (GK) | Japan-centric |
| 46. Huya | live-streaming | huya.com, www.huya.com | live, video | Y: `huya:live`, `huya:video` · S: `huya` | none | none | China-centric |
| 47. Douyu | live-streaming | douyu.com, www.douyu.com, douyutv.com, v.douyu.com, vmobile.douyu.com | live, video | Y: `DouyuTV`, `DouyuShow` · S: `douyu` | none | none | China-centric |
| 48. CHZZK (Naver) | live-streaming | chzzk.naver.com | live, video, community images (G) | Y: `chzzk:live`, `chzzk:video` · G: `naver-chzzk` · S: `chzzk` | sometimes (19+ needs login) | CHZZK open API (unverified) | Korea |
| 49. SHOWROOM | live-streaming | showroom-live.com, www.showroom-live.com | live, video | Y: `showroom:live`, `showroom:vod` · S: `showroom` | none | none | Japan |
| 50. 17LIVE | live-streaming | 17.live | live, clips, video | Y: `17live`, `17live:clip`, `17live:vod` · S: `app17` | none | none | — |
| 51. Bigo Live | live-streaming | bigo.tv, www.bigo.tv | live | Y: `Bigo` · S: `bigo` | none | none | — |
| 52. Pluto TV | live-streaming | pluto.tv, www.pluto.tv | live channels, video (VOD) | Y: `PlutoTV` **Currently broken** (on-demand only) · S: `pluto` | none | none | Geo varies; use S for live |
| 53. Weverse | live-streaming | weverse.io, www./m.weverse.io | live, video, playlist (tabs) | Y: `Weverse`, `WeverseLive`, `WeverseLiveTab`, `WeverseMedia`, `WeverseMediaTab`, `WeverseMoment` | always (account; paid membership for some) | none | — |
| 54. SoundCloud | audio-music | soundcloud.com, www./m.soundcloud.com, w.soundcloud.com (widget), api(-v2).soundcloud.com; *on.soundcloud.com (redir)* | audio, playlist (sets/albums/user/station) | Y: `soundcloud` plus `:set`, `:user`, `:playlist`, `:trackstation`, `:related`, `:search`, `:user:permalink`, `SoundcloudEmbed` (netrc) | none (Go+ tracks are preview-only without a subscription; GK) | SoundCloud API (app registration limited; GK) | — |
| 55. Bandcamp | audio-music | bandcamp.com, `<artist>`.bandcamp.com; *custom artist domains (not matched)* | audio, album/playlist | Y: `Bandcamp`, `Bandcamp:album`, `Bandcamp:user`, `Bandcamp:weekly` | none (streams are 128k MP3; purchased lossless files need an account; GK) | none public | — |
| 56. Mixcloud | audio-music | mixcloud.com, www./m./beta.mixcloud.com | audio (mixes), live, playlist/user | Y: `mixcloud`, `mixcloud:user`, `mixcloud:playlist` · S: `mixcloud` | none (Select-exclusive shows need a subscription; GK) | Mixcloud API | — |
| 57. Audiomack | audio-music | audiomack.com, www.audiomack.com | audio, album/playlist | Y: `audiomack`, `audiomack:album` | none | Audiomack API (OAuth) | — |
| 58. Jamendo | audio-music | jamendo.com, www./licensing.jamendo.com | audio, album | Y: `Jamendo`, `JamendoAlbum` | none | Jamendo API v3 | Creative Commons catalog |
| 59. Audius | audio-music | audius.co | audio, playlist, artist | Y: `Audius`, `audius:track`, `audius:playlist`, `audius:artist` | none | Audius API (public) | — |
| 60. Vocaroo | audio-music | vocaroo.com, voca.ro | audio | Y: `Vocaroo` | none | none | — |
| 61. TuneIn | audio-music | tunein.com, tun.in (hidden `tunein:shortener`) | live radio, podcast | Y: `tunein:station`, `tunein:podcast`, `tunein:podcast:program`, `tunein:embed` | none | partner-only | — |
| 62. iHeartRadio | audio-music | iheart.com, www.iheart.com, www.iheartpodcastnetwork.com | podcast | Y: `iheartradio`, `iheartradio:podcast` | none | none public | US-centric (GK) |
| 63. Radiko | audio-music | radiko.jp | live radio, time-free radio | Y: `Radiko`, `RadikoRadio` · S: `radiko` | sometimes (prefecture area lock; premium for area-free) | none | Japan-only |
| 64. Suno / Udio (AI music) | audio-music | suno.com, udio.com | (audio) | Y: matched by the hidden `Liability` extractor, which refuses with "not supported and will not be supported" · G/S: — | n/a | (GK: no public download API) | yt-dlp adds sites to this list only if they were once supported ([unsupported.py][ytdrm]). Treat as blocked by policy |
| 65. Apple Podcasts | podcast | podcasts.apple.com (episode URLs with `?i=<id>`); *itunes.apple.com (legacy)* | audio, video podcasts, playlist (feed) | Y: `apple:podcasts` (episodes); show feeds through `generic` RSS | none | iTunes Search / Lookup API (returns feedUrl) | Paid subscription episodes are not accessible (GK) |
| 66. Podbean | podcast | *podbean.com, `<show>`.podbean.com, feed.podbean.com, mcdn.podbean.com (media)* | audio, video | Y: no dedicated extractor; `generic` RSS and direct MP3 | none | Podbean API (publisher OAuth) | Confirmed absent in 2026.11.23 by local check |
| 67. Buzzsprout | podcast | *buzzsprout.com, www.buzzsprout.com, feeds.buzzsprout.com* | audio | Y: no dedicated extractor; `generic` RSS and direct MP3 | none | Buzzsprout API (publisher token) | Confirmed absent by local check |
| 68. Acast | podcast | acast.com, www./shows./play./embed.acast.com; *feeds.acast.com* | audio, playlist (show) | Y: `acast`, `acast:channel` | none (Acast+ episodes need a subscription; GK) | Acast API (publisher) | — |
| 69. Simplecast | podcast | player.simplecast.com, api.simplecast.com, `<show>`.simplecast.com | audio, playlist | Y: `simplecast`, `simplecast:episode`, `simplecast:podcast` | none | Simplecast API | — |
| 70. Libsyn | podcast | html5-player.libsyn.com; *`<show>`.libsyn.com, traffic.libsyn.com* | audio | Y: `Libsyn` (player) | none | Libsyn API (publisher) | — |
| 71. Megaphone | podcast | player.megaphone.fm; *megaphone.fm, traffic.megaphone.fm, feeds.megaphone.fm* | audio | Y: `megaphone.fm` | none | Megaphone API (publisher) | — |
| 72. Omny Studio | podcast | omny.fm, www.omny.fm; *traffic.omny.fm* | audio, playlist | Y: `Omnyfm`, `OmnyfmShow`, `OmnyfmPlaylist` | none | Omny Studio API (GK) | — |
| 73. Art19 | podcast | art19.com, www.art19.com, rss.art19.com | audio, playlist | Y: `Art19`, `Art19Show` | none | none public | — |
| 74. Audioboom | podcast | audioboom.com | audio | Y: `AudioBoom` | none | Audioboom API (GK) | — |
| 75. Spreaker | podcast | spreaker.com, www./api.spreaker.com; *widget.spreaker.com* | audio, live, playlist (show) | Y: `Spreaker`, `SpreakerShow` | none | Spreaker API | — |
| 76. Pocket Casts | podcast | *pocketcasts.com, pca.st (share links)* | (directory) | none of Y/G/S | n/a | none public | Resolve to the show's RSS feed |
| 77. TED | education | ted.com, www.ted.com (`/talks/`), embed.ted.com, embed-ssl.ted.com | video, subtitles (many languages), playlist/series | Y: `TedTalk`, `TedEmbed`, `TedPlaylist`, `TedSeries` | none | none | — |
| 78. Khan Academy | education | khanacademy.org, www.khanacademy.org | video (YouTube-hosted), playlist (unit) | Y: `khanacademy`, `khanacademy:unit` | none | none current (GK) | Videos resolve to YouTube |
| 79. MIT OpenCourseWare (+TechTV) | education | ocw.mit.edu, techtv.mit.edu | video (often YouTube or Internet Archive hosted), course playlists | Y: `ocw.mit.edu`, `techtv.mit.edu` | none | none | CC BY-NC-SA (GK) |
| 80. Coursera | education | *coursera.org, www.coursera.org* | video, subtitles | none of Y/G/S | always | partner Catalog API (GK) | Unsupported |
| 81. Udemy | education | udemy.com, www.udemy.com, `<tenant>`.udemy.com (Udemy Business) | video, subtitles, course playlist | Y: `udemy`, `udemy:course` (netrc) | always (enrolled account) | Udemy Business API (partner; GK) | Many lectures are DRM-encrypted (GK) |
| 82. edX | education | *edx.org, www.edx.org, courses.edx.org, learning.edx.org* | video, subtitles | none of Y/G/S | always | partner APIs (GK) | Unsupported. Many videos are YouTube-hosted (GK) |
| 83. Pluralsight | education | pluralsight.com, www./app.pluralsight.com | video, course | Y: `pluralsight` (netrc), `pluralsight:course` | always | none public | — |
| 84. Platzi | education | platzi.com, courses.platzi.com | video, course | Y: `Platzi`, `PlatziCourse` (netrc) | always | none | Latin America |
| 85. Frontend Masters | education | frontendmasters.com, api.frontendmasters.com | video, course | Y: `FrontendMasters`, `FrontendMastersCourse`, `FrontendMastersLesson` (netrc) | always | none | — |
| 86. CuriosityStream | education | curiositystream.com, app.curiositystream.com | video, series/collections | Y: `curiositystream`, `curiositystream:series`, `curiositystream:collections` (netrc) | always | none | — |
| 87. Microsoft Learn (Build, events) | education | learn.microsoft.com, build.microsoft.com, medius.microsoft.com | video, playlist, subtitles | Y: `MicrosoftLearnEpisode`, `MicrosoftLearnPlaylist`, `MicrosoftLearnSession`, `MicrosoftBuild`, `MicrosoftMedius`, `MicrosoftEmbed` | none | Learn Catalog API (metadata; GK) | — |
| 88. Teachable schools | education | *`<school>`.teachable.com and custom school domains* (regex hard-codes a few) | video, course | Y: `Teachable` **Currently broken** | always | none | Treat as unsupported |
| 89. Skillshare | education | *skillshare.com, www.skillshare.com* | video | none of Y/G/S | always | none | Unsupported |
| 90. BBC (iPlayer, News, Sounds) | news-broadcaster | bbc.co.uk, www.bbc.co.uk, bbc.com, www.bbc.com, two .onion mirrors (bbcnewsd73hkzno2ini43t4gblxvycyac5aw4gnv7t2rccijh7745uqd.onion, bbcweb3hytmzhn5d532owbu6oqadra5z3ar726vq5kgwwn6aucdccrad.onion); *bbc.in (redir)* | video, audio, live, subtitles, playlist | Y: `bbc.co.uk` (netrc bbc), `bbc`, `bbc.co.uk:article`, `bbc.co.uk:iplayer:episodes`, `bbc.co.uk:iplayer:group`, `bbc.co.uk:playlist` · S: `bbciplayer` | sometimes (iPlayer needs UK location plus sign-in; GK) | none public | iPlayer is UK-only |
| 91. CNN | news-broadcaster | cnn.com, www./edition./money./cnnespanol.cnn.com, cnnindonesia.com; *cnn.it (redir)* | video | Y: `CNN`, `CNNIndonesia` | none | none | Live TV needs a TV-provider login (GK) |
| 92. NBC / NBC News / TODAY / MSNBC | news-broadcaster | nbc.com, www.nbc.com, nbcnews.com, today.com, msnbc.com, nbcsports.com, nbcolympics.com, NBC/Telemundo station sites (nbcboston.com, nbclosangeles.com, telemundoarizona.com…) | video, live, subtitles | Y: `NBC`, `NBCNews`, `NBCStations`, `nbcolympics`; `NBCSports`, `NBCSportsVPlayer`, `NBCSportsStream`, `nbcolympics:stream` **Currently broken** | sometimes (full episodes need a TV provider) | none | US geo |
| 93. CBS / CBS News | news-broadcaster | cbsnews.com, www.cbsnews.com, cbs.com, colbertlateshow.com, cbssports.com, embed.247sports.com | video, live | Y: `cbsnews`, `cbsnews:embed`, `cbsnews:live`, `cbsnews:livevideo`, `CBSLocal`, `CBSLocalArticle`, `CBSLocalLive`; `CBS`, `cbssports`, `cbssports:embed` **Currently broken** · S: `cbsnews` | none for news | none | cbs.com entertainment is on Paramount+, which is DRM-listed |
| 94. ABC News (US) and ABC stations | news-broadcaster | abcnews.go.com, fivethirtyeight.abcnews.go.com, 6abc.com, abc7news.com, clips.abcotvs.com | video, live | Y: `abcnews`, `abcnews:video`, `abcotvs`, `abcotvs:clips` | none | none | — |
| 95. ABC (Australia) / ABC iview | news-broadcaster | abc.net.au, www.abc.net.au, iview.abc.net.au | video, audio, subtitles, series | Y: `abc.net.au`, `abc.net.au:iview`, `abc.net.au:iview:showseries` | sometimes | none | iview is AU-geo |
| 96. ARD (Mediathek, Audiothek) | news-broadcaster | ardmediathek.de, www./beta.ardmediathek.de, ardaudiothek.de, www.ardaudiothek.de, www.ardsounds.de; *tagesschau.de, sportschau.de* | video, audio, live, subtitles, playlist | Y: `ARDMediathek`, `ARDMediathekCollection`, `ARDAudiothek`, `ARDAudiothekPlaylist`; `Tagesschau` **Currently broken** · S: `ard_mediathek`, `sportschau` | none | none official | Some items DE-geo. Youth-protection time windows (GK) |
| 97. ZDF (+3sat) | news-broadcaster | zdf.de, www.zdf.de, www.zdfheute.de, www.logo.de, 3sat.de, www.3sat.de | video, live, subtitles | Y: `zdf`, `zdf:channel`, `3sat` · S: `zdf_mediathek` | none | none official | Some items DE-geo |
| 98. ARTE | news-broadcaster | arte.tv, www.arte.tv (fr/de/en/es/it/pl), api.arte.tv; arte.sky.it (Sky Arte Italy) | video, live, subtitles, playlist | Y: `ArteTV`, `ArteTVEmbed`, `ArteTVPlaylist`, `ArteTVCategory`, `arte.sky.it` · S: `artetv` | none | none official | Subtitles fixed in 2026.11.23 ([rel][ytrel]). Some items EU-geo |
| 99. NHK (NHK World, Radiru, NHK for School) | news-broadcaster | www.nhk.or.jp, www2.nhk.or.jp, www3.nhk.or.jp; www.web.nhk (on the DRM list) | video, audio, live radio, playlist | Y: `NhkVod`, `NhkVodProgram`, `NhkRadiru`, `NhkRadiruLive`, `NhkRadioNewsPage`, `NhkForSchoolBangumi`, `NhkForSchoolSubject`, `NhkForSchoolProgramList` | none | none | www.web.nhk is refused as DRM ([unsupported.py][ytdrm]) |
| 100. France Télévisions (+ Radio France) | news-broadcaster | france.tv, www./mobile.france.tv, www.francetvinfo.fr, france3-regions.francetvinfo.fr, www.franceinfo.fr, radiofrance.fr, www.radiofrance.fr | video, live, audio, subtitles | Y: `francetv`, `francetv:site`, `franceinfo`, `FranceCulture` · S: `pluzz` | sometimes | none | Much content FR-geo (GK) |
| 101. C-SPAN | news-broadcaster | c-span.org, www.c-span.org | video, subtitles | Y: `CSpan`, `CSpanCongress` | none | none | — |
| 102. NASA (NASA+, image library) | news-broadcaster | *nasa.gov, plus.nasa.gov, images.nasa.gov, images-assets.nasa.gov, svs.gsfc.nasa.gov* | live, video, image | Y: no dedicated extractor (generic for direct files) · S: `nasaplus` | none | NASA Image and Video Library API (GK) | Most media public domain (GK) |
| 103. PBS (+ PBS Kids, member stations) | news-broadcaster | pbs.org (www./video./player.), pbskids.org, ~140 member-station hosts in the regex (thirteen.org, video.kcts9.org, video.gpb.org…) | video, subtitles, live | Y: `pbs`, `PBSKids` | sometimes (Passport titles) | PBS Media Manager API (partner; GK) | US geo for most video |
| 104. Al Jazeera | news-broadcaster | any `<sub>`.aljazeera.`<tld>` per regex (e.g. www.aljazeera.com, balkans.aljazeera.net) | video | Y: `AlJazeera` | none | none | — |
| 105. Deutsche Welle | news-broadcaster | *dw.com, www.dw.com* | video, live | Y: `dw`, `dw:article` **Currently broken** · S: `deutschewelle` | none | none | Use S for live |
| 106. Reuters | news-broadcaster | *reuters.com, www.reuters.com* | video, live | Y: `Reuters` **Currently broken** · S: `reuters` | none | none (paid Reuters Connect; GK) | — |
| 107. Bloomberg | news-broadcaster | bloomberg.com, www.bloomberg.com | video, live TV | Y: `Bloomberg` · S: `bloomberg` | none | none | — |
| 108. Euronews | news-broadcaster | *euronews.com, www.euronews.com, `<lang>`.euronews.com* | live, video | Y: — · S: `euronews` | none | none | Live only via S |
| 109. Sky (Sky News UK, Sky Sports, Sky TG24, Sky News AU, Sky News Arabia) | news-broadcaster | news.sky.com, skysports.com, www.skysports.com, tg24.sky.it, sport.sky.it, www.skynews.com.au, www.skynewsarabia.com | video | Y: `sky:news`, `sky:news:story`, `sky:sports`, `sky:sports:news`, `sky.it`, `SkyNewsAU`; `skynewsarabia:video`, `skynewsarabia:article` **Currently broken** | none | none | Separate companies share the brand; counted once |
| 110. Fox (Fox News, FOX, Fox Sports) | news-broadcaster | foxnews.com, www./video./insider.foxnews.com, video.foxbusiness.com, fox.com, www.fox.com, foxsports.com, fox9.com | video, live | Y: `foxnews`, `foxnews:article`, `FoxNewsVideo`, `FOX`, `FoxSports`, `FOX9`, `FOX9News` | sometimes (fox.com episodes need a TV provider) | none | US geo |
| 111. SVT Play | news-broadcaster | svtplay.se, www.svtplay.se, svt.se, www.svt.se, www.oppetarkiv.se | video, live, subtitles, series | Y: `svt:play`, `svt:page`, `svt:play:series` · S: `svtplay` | none | none | Much content SE-geo |
| 112. NRK | news-broadcaster | nrk.no, www./tv./radio.nrk.no, nrksuper.no, tv.nrksuper.no, psapi.nrk.no | video, audio/podcast, live, subtitles | Y: `NRK`, `NRKTV`, `NRKTVEpisode`, `NRKTVEpisodes`, `NRKTVSeason`, `NRKTVSeries`, `NRKTVDirekte`, `NRKPlaylist`, `NRKRadioPodkast`, `NRKSkole` · S: `nrk` | none | none | Some content NO-geo |
| 113. DR (DRTV) | news-broadcaster | dr.dk, www.dr.dk | video, live, series | Y: `drtv`, `drtv:live`, `drtv:season`, `drtv:series` · S: `drdk` | none | none | Fixed in 2026.11.23 ([rel][ytrel]). DK geo |
| 114. Yle Areena | news-broadcaster | areena.yle.fi | video, audio, subtitles | Y: `YleAreena` | none | none | Some content FI-geo |
| 115. RAI (RaiPlay, RaiPlay Sound, RaiNews) | news-broadcaster | raiplay.it, www.raiplay.it, raiplaysound.it, rainews.it, www.rai.it, raicultura.it, raisudtirol.rai.it | video, audio, live, playlist | Y: `RaiPlay`, `RaiPlayLive`, `RaiPlayPlaylist`, `RaiPlaySound`, `RaiPlaySoundLive`, `RaiPlaySoundPlaylist`, `Rai`, `RaiNews`, `RaiCultura`, `RaiSudtirol` · S: `raiplay` | none (some titles login/DRM; GK) | none | IT geo |
| 116. RTVE | news-broadcaster | rtve.es, www.rtve.es | video, audio, live | Y: `rtve.es:alacarta`, `rtve.es:audio`, `rtve.es:live`, `rtve.es:program`, `rtve.es:television` · S: `rtve` | none | none | Some content ES-geo |
| 117. ITVX | news-broadcaster | itv.com, www.itv.com | video | Y: `ITV` (regex matches only legacy `itv.com/hub/…` paths), `ITVBTCC` | always (ITVX login; GK) | none | Current ITVX URLs are not matched, so treat as effectively unsupported. Much content DRM (GK) |
| 118. CBC / CBC Gem | news-broadcaster | cbc.ca, www.cbc.ca, gem.cbc.ca | video, audio (Listen), live | Y: `cbc.ca`, `cbc.ca:player`, `cbc.ca:player:playlist`, `cbc.ca:listen`, `gem.cbc.ca:olympics` (+ hidden `gem.cbc.ca:content`) | sometimes (Gem login; CA geo) | none | ctv.ca, noovo.ca and tsn.ca (other Canadian networks) are on the DRM list |
| 119. ORF | news-broadcaster | on.orf.at, sound.orf.at, fm4.orf.at, oe1.orf.at, oe3.orf.at, radiothek.orf.at, iptv.orf.at, regional *.orf.at | video, audio, podcast, live | Y: `orf:on`, `orf:podcast`, `orf:radio`, `orf:iptv`, `orf:fm4:story` | none | none | Some content AT-geo |
| 120. SRG SSR (SRF, RTS, RSI, RTR, Swissinfo) | news-broadcaster | www.srf.ch, www.rts.ch, www.rtr.ch, play.swissinfo.ch, tp.srgssr.ch; *rsi.ch* | video, audio, subtitles | Y: `SRGSSR`, `SRGSSRPlay`; legacy `RTS` **Currently broken** · S: `swisstxt` (sports) | none | none | Some content CH-geo |
| 121. NPO (Netherlands) | news-broadcaster | npo.nl, www.npo.nl, www.npostart.nl, www.npo3.nl, www.zapp.nl, www.ntr.nl, omroepwnl.nl | video, radio, live | Y: `npo`, `npo.nl:live`, `npo.nl:radio`, `npo.nl:radio:fragment` · S: `nos` (NOS) | sometimes | none | NL geo. DRM on much NPO Start content (GK) |
| 122. Internet Archive (+ Wayback) | open-licensed-library | archive.org, www.archive.org (`/details/`, `/embed/`), web.archive.org; *ia*.us.archive.org (download nodes)* | video, audio, playlist (item files), lectures | Y: `archive.org`, `web.archive:youtube` | none (some items lending-restricted) | Internet Archive APIs (Advanced Search, Metadata, IAS3) | Also hosts LibriVox and many lecture mirrors |
| 123. Wikimedia Commons | open-licensed-library | commons.wikimedia.org (`/wiki/File:…`), www.wikimedia.org (G); *upload.wikimedia.org (direct files), commons.m.wikimedia.org, *.wikipedia.org File: pages* | image, video, audio, subtitles (TimedText) | Y: `wikimedia.org` · G: `wikimediacommons`, `wikimedia` (+ `fandom`) | none | MediaWiki Action API / Wikimedia REST API | Freely licensed |
| 124. Openverse | open-licensed-library | *openverse.org, api.openverse.org* | image, audio (aggregated) | none of Y/G/S; resolve results to their source sites | none | Openverse API | Aggregator over Flickr, Wikimedia and others |
| 125. Pexels | open-licensed-library | pexels.com (G); *www.pexels.com, images.pexels.com, videos.pexels.com* | image, video | G: `pexels` · Y: generic for direct files | none | Pexels API (key) | Pexels license, not CC (GK) |
| 126. Pixabay | open-licensed-library | *pixabay.com, cdn.pixabay.com* | image, video, audio | none of Y/G/S | none | Pixabay API (key) | Use the API |
| 127. Unsplash | open-licensed-library | unsplash.com (G); *images.unsplash.com, plus.unsplash.com* | image | G: `unsplash` | none | Unsplash API (key) | Unsplash+ is premium (GK) |
| 128. Flickr | open-licensed-library | flickr.com, www./secure.flickr.com; *flic.kr (redir), live.staticflickr.com (CDN)* | image, video, album | Y: `Flickr` (video) · G: `flickr` (OAuth) | none | Flickr API (key) | Has CC license filters |
| 129. Freesound | open-licensed-library | freesound.org, www.freesound.org | audio (previews) | Y: `Freesound` | none for previews; originals need an account (GK) | Freesound APIv2 | — |
| 130. Free Music Archive | open-licensed-library | *freemusicarchive.org, files.freemusicarchive.org* | audio | none dedicated; generic for direct MP3 | unverified | none current (GK) | — |
| 131. LibriVox | open-licensed-library | *librivox.org (feeds at /rss/`<id>`); files hosted on archive.org* | audio, playlist | Y: indirect (`archive.org` for IA copies, `generic` RSS for feeds) | none | LibriVox API (GK) | Public domain |
| 132. Library of Congress | open-licensed-library | loc.gov, www.loc.gov | video, audio, image | Y: `loc` | none | loc.gov JSON API (GK) | — |
| 133. Imgur | image-hosting | imgur.com, i.imgur.com; *www./m.imgur.com (normalize: the regex accepts only bare or i.)* | image, gif/GIFV (MP4), video, album/gallery | Y: `Imgur`, `imgur:album`, `imgur:gallery` · G: `imgur` | none | Imgur API (client ID) | Reported UK access block since 2025 (GK, unverified) |
| 134. DeviantArt | image-hosting | www.deviantart.com (G); *deviantart.com, `<user>`.deviantart.com (legacy), fav.me (redir), images-wixmp-*.wixmp.com (CDN)* | image, gif, playlist (gallery/folder) | G: `deviantart` (OAuth) · Y: — | sometimes (mature content needs login) | DeviantArt API (OAuth2) | — |
| 135. ArtStation | image-hosting | www.artstation.com (G); *`<user>`.artstation.com, cdna/cdnb.artstation.com* | image, video (embedded), project/album | G: `artstation` · Y: — | none | none official | artstation.com/learning/courses is DRM-listed by yt-dlp |
| 136. Tumblr | image-hosting | tumblr.com, www.tumblr.com, `<blog>`.tumblr.com; *tmblr.co (redir), 64.media.tumblr.com, va.media.tumblr.com (CDN)* | image, gif, video, audio, playlist (blog) | Y: `Tumblr` (netrc) · G: `tumblr` (OAuth) | none (login-only or NSFW blogs need login) | Tumblr API v2 | — |
| 137. Pinterest | image-hosting | pinterest.com and ccTLDs in the yt-dlp regex (.ca .co.uk .de .fr .jp .com.au .com.mx .ru .it .es .nl .pt .at .ch .dk .ie .nz .co.kr .kr .ph .th .vn .com.vn .cl .co .ec .pe .com.uy .in .co.in .id .tw .be .hu .info .uk .mx .com.ec .com.py .com.bo .com.pe .co.at .co.nz), any subdomain; *pin.it (redir), i.pinimg.com, v1.pinimg.com (CDN)* | image, video, gif, board/playlist | Y: `Pinterest`, `PinterestCollection` · G: `pinterest` (Cookies) | none (some boards need login) | Pinterest API v5 | — |
| 138. 500px | image-hosting | 500px.com; *drscdn.500px.org* | image, gallery | G: `500px` | none | none (public API closed; GK) | — |
| 139. Behance | image-hosting | www.behance.net; *mir-s3-cdn-cf.behance.net* | image, video, project | G: `behance` | none | none (closed to new keys; GK) | — |
| 140. pixiv (+ pixivFANBOX, Sketch) | image-hosting | www.pixiv.net, www.fanbox.cc (G); *pixiv.me, i.pximg.net (CDN, needs Referer), sketch.pixiv.net, `<creator>`.fanbox.cc* | image, ugoira animation, novels, live (Sketch) | G: `pixiv`, `pixiv-novel` (OAuth), `fanbox` (Cookies) · S: `pixiv` · Y: — | always for G (refresh token) | none official | R-18 works need an account setting (GK) |
| 141. VSCO | image-hosting | vsco.co; *im.vsco.co* | image, video | G: `vsco` | none | none | — |
| 142. SmugMug | image-hosting | www.smugmug.com; *`<user>`.smugmug.com, photos.smugmug.com* | image, video, album | G: `smugmug` (OAuth) | none (password galleries) | SmugMug API v2 | — |
| 143. ImgBB | image-hosting | imgbb.com; *ibb.co, i.ibb.co* | image, album | G: `imgbb` (login supported) | none | ImgBB API (upload) | — |
| 144. Postimages | image-hosting | postimages.org; *postimg.cc, i.postimg.cc* | image, gallery | G: `postimg` | none | none | — |
| 145. Wallhaven | image-hosting | wallhaven.cc; *w.wallhaven.cc, th.wallhaven.cc* | image | G: `wallhaven` (API Key) | none (NSFW needs an API key) | Wallhaven API v1 | — |
| 146. Civitai | image-hosting | www.civitai.com; *civitai.com, image.civitai.com* | image, video (AI-generated) | G: `civitai` | sometimes (NSFW) | Civitai REST API | Mixed SFW/NSFW |
| 147. Danbooru (+ safebooru.donmai.us) | image-hosting (booru) | danbooru.donmai.us; *safebooru.donmai.us, cdn.donmai.us* | image, gif/video, pool/playlist | G: `danbooru` (Danbooru instances; login/API key supported) | none | Danbooru REST API | **Mixed adult content**. safebooru.donmai.us is the SFW-filtered view |
| 148. Safebooru (.org) | image-hosting (booru) | safebooru.org | image | G: `safebooru` (Gelbooru Beta 0.2 family) | none | Gelbooru-0.2 DAPI | SFW |
| 149. Gelbooru | image-hosting (booru) | gelbooru.com; *img*.gelbooru.com* | image, video | G: `gelbooru` | none | Gelbooru API | **ADULT** |
| 150. e621 / e926 | image-hosting (booru) | e621.net, e926.net; *static1.e621.net* | image, video | G: `e621`, `e926` (login supported) | none | e621 API | **ADULT** (e926 is the SFW mirror) |
| 151. Moebooru boorus (yande.re, Konachan) | image-hosting (booru) | yande.re, konachan.com; *files.yande.re, konachan.net (SFW mirror)* | image | G: `yandere`, `konachan` | none | Moebooru API | **ADULT-leaning**. Counted once |
| 152. Rule 34 sites | image-hosting (booru) | rule34.xxx, rule34.us, rule34.xyz, rule34.world | image, video | G: `rule34`, `rule34us`, `rule34xyz`, `rule34world` | none | Gelbooru-0.2 DAPI | **ADULT**. Separate sites, counted once |
| 153. GIPHY | gif | *giphy.com, media.giphy.com, media0–4.giphy.com, i.giphy.com, gph.is (redir)* | gif, MP4/WebP renditions, stickers | none of Y/G/S; direct .gif/.mp4 files via G `directlink` or Y `generic` | none | GIPHY API (key) | — |
| 154. Tenor | gif | tenor.com (G); *media.tenor.com, media1.tenor.com, c.tenor.com* | gif, MP4 | G: `tenor` · Y: — | none | Tenor API v2 (Google; key) | — |
| 155. Gfycat (defunct) | gif | *gfycat.com, thumbs./giant./zippy.gfycat.com* | (formerly gif/video) | none (no extractor in any of the three) | n/a | — | Shut down 2023-09-01 ([TechCrunch][gfy]). Mark dead |
| 156. RedGIFs | gif | redgifs.com, www.redgifs.com, thumbs2.redgifs.com | video/gif | Y: `RedGifs`, `RedGifsSearch`, `RedGifsUser` · G: `redgifs` | none (temporary API token) | RedGIFs API | **ADULT** |
| 157. Coub | gif | coub.com, c-cdn.coub.com | looping video with audio | Y: `Coub` | none | none | — |
| 158. VK (VK Video, VK Video Live) | regional | vk.com, m./new./vksport. variants, vk.ru, vkvideo.ru, vksport.vkvideo.ru, live.vkvideo.ru, vkplay.live, live.vkplay.ru, daxab.com (embed mirror); *vk.cc (redir)* | video, clips, live, image (G), playlist | Y: `vk`, `vk:uservideos`, `vk:wallpost` (netrc vk), `VKPlay`, `VKPlayLive` · G: `vk` · S: `vk`, `vkvideolive` | sometimes (many videos login-only) | VK API | Russia-centric |
| 159. OK.ru | regional | ok.ru, www.ok.ru, odnoklassniki.ru; *m.ok.ru (normalize)* | video, live | Y: `Odnoklassniki` · S: `okru` | none | OK API (GK) | — |
| 160. Rutube | regional | rutube.ru | video, live, playlist/channel | Y: `rutube`, `rutube:embed`, `rutube:channel`, `rutube:movie`, `rutube:person`, `rutube:playlist`, `rutube:tags` | none | none public | Some content RU-geo (GK) |
| 161. Dzen | regional | dzen.ru, zen.yandex.ru (legacy) | video | Y: `dzen.ru`, `dzen.ru:channel` | none | none | — |
| 162. Youku (+ Tudou) | regional | v.youku.com, player.youku.com, list.youku.com, video.tudou.com, play.tudou.com | video, show | Y: `youku`, `youku:show` | sometimes (VIP) | none | China geo |
| 163. iQIYI / iQ.com | regional | iqiyi.com and subdomains (www., yule.…), www.pps.tv, iq.com, www.iq.com | video, album | Y: `iqiyi`, `iq.com`, `iq.com:album` | sometimes (VIP) | none | VIP content DRM (GK) |
| 164. Tencent Video / WeTV | regional | v.qq.com, wetv.vip | video, series | Y: `vqq:video`, `vqq:series`, `wetv:episode`, `WeTvSeries` | sometimes (VIP) | none | — |
| 165. Mango TV | regional | mgtv.com, www./w.mgtv.com | video | Y: `MangoTV` | none | none | China geo |
| 166. Douyin | regional | douyin.com, www.douyin.com (`/video/<id>`); *v.douyin.com, iesdouyin.com (redir)* | video, live (S) | Y: `Douyin` · S: `douyin` | sometimes (the extractor asks for "fresh cookies (not necessarily logged in)") | Douyin Open Platform (GK) | — |
| 167. Kuaishou / Kwai | regional | *kuaishou.com, www./v.kuaishou.com, kwai.com* | video | none of Y/G/S | n/a | Kuaishou Open Platform (GK) | Unsupported |
| 168. Xiaohongshu (RedNote) | regional | www.xiaohongshu.com (`/explore/<id>`, `/discovery/item/<id>`); *xiaohongshu.com, xhslink.com (redir)* | video, image notes | Y: `XiaoHongShu` · G: — | sometimes | none public | — |
| 169. Weibo | regional | weibo.com, www.weibo.com, m.weibo.cn, video.weibo.com; *weibo.cn, t.cn (redir)* | video, image, playlist (user) | Y: `Weibo`, `WeiboVideo`, `WeiboUser` · G: `weibo` | sometimes (visitor cookie or login) | Weibo Open Platform | — |
| 170. AcFun | regional | www.acfun.cn; *acfun.cn, m.acfun.cn (normalize)* | video, bangumi | Y: `AcFunVideo`, `AcFunBangumi` | none | none | — |
| 171. Naver TV (+ Naver Blog/Webtoon via G) | regional | tv.naver.com, m.tv.naver.com, tvcast.naver.com, blog.naver.com, comic.naver.com; *naver.me (redir)* | video, live, image | Y: `Naver`, `Naver:live` · G: `naver-blog`, `naver-webtoon` | none | Naver Developers Open API | — |
| 172. Zing MP3 | regional | zingmp3.vn, mp3.zing.vn | audio, video, album/playlist, podcast, live radio | Y: `zingmp3` plus 9 sub-extractors | sometimes (VIP) | none | Vietnam geo |
| 173. Aparat | regional | aparat.com, www.aparat.com | video | Y: `Aparat` | none | none | Iran |
| 174. Telewebion | regional | telewebion.ir, www.telewebion.ir | video, live | Y: `Telewebion` | none | none | Iran geo |
| 175. JioHotstar (Hotstar) | regional | hotstar.com, www.hotstar.com; *jiohotstar.com (brand domain, NOT matched by the regex)* | video, series, sports | Y: `hotstar`, `hotstar:series` (IE_DESC "JioHotstar") | sometimes to always (premium) | none | India geo. Premium content DRM (GK) |
| 176. SonyLIV | regional | sonyliv.com, www.sonyliv.com | video, series | Y: `SonyLIV` (netrc), `SonyLIVSeries` | sometimes | none | India geo. Premium content DRM (GK) |
| 177. MX Player | regional | mxplayer.in, www.mxplayer.in | video, show, season | Y: `mxplayer`, `mxplayer:show`, `mxplayer:season` | none | none | India geo |
| 178. JioSaavn | regional | jiosaavn.com, www.jiosaavn.com, saavn.com, www.saavn.com | audio, album, playlist, artist, podcast | Y: `jiosaavn:song`, `:album`, `:playlist`, `:artist`, `:show`, `:show:playlist` | none | none | — |
| 179. Viu | regional | viu.com, www.viu.com, india.viu.com | video | Y: `Viu`, `viu:ott` (netrc), `viu:playlist`, `ViuOTTIndonesia` | sometimes | none | Asia/Middle East geo |
| 180. Vidio | regional | vidio.com, www.vidio.com | video, live, premier | Y: `Vidio`, `VidioLive`, `VidioPremier` (netrc) · S: `vidio` | sometimes | none | Indonesia |
| 181. Shahid (MBC) | regional | shahid.mbc.net | video, series | Y: `Shahid` (netrc), `ShahidShow` | sometimes | none | MENA. VIP content DRM (GK) |
| 182. Globo (Globoplay, g1) | regional | g1./ge./globoplay./gshow./oglobo./redeglobo.globo.com | video | Y: `Globo` (netrc), `GloboArticle` | sometimes | none | Brazil geo |
| 183. TVer | regional | tver.jp | video | Y: `TVer`, `tver:olympic` | none | none | Japan geo |
| 184. ABEMA | regional | abema.tv | video, live, series | Y: `AbemaTV`, `AbemaTVTitle` (netrc) · S: `abematv` | sometimes (premium) | none | Japan geo |
| 185. NetEase Cloud Music | regional | music.163.com, y.music.163.com | audio, album, playlist, MV, radio | Y: `netease:song`, `:album`, `:playlist`, `:singer`, `:mv`, `:program`, `:djradio` | sometimes (VIP) | none | China geo |
| 186. QQ Music | regional | y.qq.com | audio, album, playlist, MV | Y: `qqmusic`, `:album`, `:playlist`, `:singer`, `:mv`, `:toplist` | sometimes (VIP) | none | — |
| 187. Yandex Music (+ Yandex Disk) | regional | music.yandex.ru, music.yandex.com; Disk: yadi.sk, *disk.yandex.ru* | audio, album, playlist, artist; files | Y: `yandexmusic:track`, `:album`, `:playlist`, `:artist:tracks`, `:artist:albums`; `YandexDisk` | sometimes (Plus subscription) | none | — |
| 188. Kuwo | regional | *kuwo.cn, www.kuwo.cn* | audio, MV | Y: `kuwo:song`, `kuwo:album`, `kuwo:chart`, `kuwo:mv`, `kuwo:singer`, `kuwo:category`, all **Currently broken** | n/a | none | Treat as unsupported |
| 189. Anghami | regional | *anghami.com, play.anghami.com* | audio | none of Y/G/S | always | none | Subscription streaming |
| 190. Boomplay | regional | *boomplay.com, www.boomplay.com* | audio | none of Y/G/S | n/a | none | Unsupported |
| 191. Netflix | protected-streaming | *netflix.com, www.netflix.com, nflxvideo.net (CDN)* | video | none (not on yt-dlp's DRM list either, so it falls to generic and fails) | always | none public | Widevine/PlayReady/FairPlay DRM (GK). **Unsupported** |
| 192. Disney+ | protected-streaming | disneyplus.com and any subdomain | video | Y: hidden `DRM` refuses | always | none | yt-dlp `Disney` covers only Disney clip sites (video.disney.com, starwars.com…). **Unsupported** |
| 193. Prime Video | protected-streaming | primevideo.com, www.primevideo.com, amazon.`<tld>`/gp/video/… | video | Y: `DRM` refuses | always | none | `AmazonStore`/`AmazonReviews` (product clips) and `AmazonMiniTV` (amazon.in/minitv) are separate. **Unsupported** |
| 194. HBO Max | protected-streaming | play.hbomax.com (DRM-listed); *hbomax.com, max.com, play.max.com (2023–25 brand)* | video | Y: `DRM` (play.hbomax.com) | always | none | play.max.com is not on the DRM list. yt-dlp `hbo` handles hbo.com extras only. **Unsupported** |
| 195. Apple TV (formerly Apple TV+) | protected-streaming | tv.apple.com | video | Y: `DRM` refuses | always | none | FairPlay (GK). **Unsupported** |
| 196. Hulu | protected-streaming | hulu.com, www.hulu.com | video | Y: `DRM` refuses | always | none | **Unsupported** |
| 197. Paramount+ | protected-streaming | paramountplus.com, www.paramountplus.com | video | Y: `DRM` refuses | always | none | `ParamountPressExpress` is the press site only. **Unsupported** |
| 198. Peacock | protected-streaming | peacocktv.com, www.peacocktv.com | video | Y: `DRM` refuses | always | none | **Unsupported** |
| 199. Crunchyroll | protected-streaming | crunchyroll.com, www./beta.crunchyroll.com | video | Y: `DRM` refuses | always | none | **Unsupported** |
| 200. Spotify (music + podcasts) | protected-streaming | open.spotify.com; anchor.fm (generic RSS test host); *spotify.link, spoti.fi (redir), creators.spotify.com* | audio, video podcasts | Y: `DRM` refuses open.spotify.com · G/S: — | always | Spotify Web API (metadata) | Many shows also publish public RSS (anchor.fm feeds), which `generic` parses. **Unsupported for open.spotify.com** |
| 201. Apple Music | protected-streaming | music.apple.com; *embed.music.apple.com, itunes.apple.com* | audio | Y: only `apple:music:connect` (old Connect posts); tracks unsupported; not on the DRM list | always | Apple Music API / MusicKit; iTunes Search API (30 s previews) | FairPlay (GK). **Unsupported** |
| 202. TIDAL | protected-streaming | *tidal.com, listen.tidal.com* | audio, video | none of Y/G/S; not on the DRM list | always | TIDAL Developer API (catalog) | **Unsupported** |
| 203. Deezer | protected-streaming | deezer.com; *www.deezer.com, link.deezer.com, deezer.page.link* | audio | Y: `DRM` refuses deezer.com | always | Deezer API (catalog, 30 s previews) | **Unsupported** |
| 204. Amazon Music | protected-streaming | music.amazon.`<tld>` (e.g. music.amazon.com, music.amazon.co.uk) | audio, podcast | Y: `DRM` refuses | always | Amazon Music Web API (limited; GK) | **Unsupported** |
| 205. Channel 4 / Channel 5 (UK) | protected-streaming | channel4.com, channel5.com | video | Y: `DRM` refuses | always | none | **Unsupported**. Counted once |
| 206. Rakuten Viki | protected-streaming | viki.com | video | Y: `DRM` refuses | always | none | **Unsupported** |
| 207. ZEE5 | protected-streaming | zee5.com | video | Y: `DRM` refuses | always | none | India. **Unsupported** |
| 208. Dropbox | direct-media | dropbox.com, www.dropbox.com (`/s/`, `/sh/`, `/scl/fi/`, `/scl/fo/`, `/e/scl/`); *dl.dropboxusercontent.com* | any file (video/audio) | Y: `Dropbox` | none (password links need the password) | Dropbox API v2 | — |
| 209. Google Drive | direct-media | drive.google.com, docs.google.com, drive.usercontent.google.com, video.google.com | video, audio, folder | Y: `GoogleDrive`, `GoogleDrive:Folder` · S: `googledrive` | sometimes (sharing permissions, quota) | Google Drive API v3 | — |
| 210. SharePoint / OneDrive for Business | direct-media | `<tenant>`.sharepoint.com, `<tenant>`-my.sharepoint.com (`/:v:/` links, `stream.aspx`); *onedrive.live.com, 1drv.ms (personal OneDrive: no extractor)* | video | Y: `SharePoint` | sometimes (tenant sharing) | Microsoft Graph | — |
| 211. Catbox / Litterbox | direct-media | catbox.moe; *files.catbox.moe, litterbox.catbox.moe* | any file | G: `catbox` | none | Catbox API (upload) | — |
| 212. Pixeldrain | direct-media | pixeldrain.com (`/u/`, `/l/`, `/api/file/`) | any file | G: `pixeldrain` | none (rate limits) | Pixeldrain API | — |
| 213. Gofile | direct-media | gofile.io | any file | G: `gofile` | sometimes (guest token) | Gofile API | — |
| 214. MEGA | direct-media | *mega.nz, mega.io, mega.co.nz* | any file (end-to-end encrypted) | none of Y/G/S | none | MEGA SDK | The decryption key is in the URL fragment (GK). **Unsupported** |
| — (not counted) Direct media URLs | direct-media | any host; match by extension or Content-Type: .mp4 .webm .mkv .mov .m4a .mp3 .ogg .opus .flac .wav .m3u8 .mpd (also .m4v .ogv .aac .f4m .ism) | video, audio, image, live (HLS/DASH), playlists | Y: `generic` (Content-Type `audio/*`, `video/*`, `application/ogg`, `application/vnd.apple.mpegurl` or `x-mpegurl`; `#EXTM3U` sniff; RSS/SMIL/XSPF/DASH/F4M/ISM parsing; follows redirects) ([generic.py][ytgen]) · G: `directlink` (jpe?g, png, gif, bmp, svg, webp/webm, avif, heic, psd, mp4, m4v, mov, mkv, ogg/ogm/ogv, wav, mp3, opus, zip, rar, 7z, pdf, swf) ([directlink.py][gdldl]) · S: `hls`, `dash`, `http` protocol plugins | none | n/a | .m4a, .flac and .aac are not in gallery-dl's extension list; route them to yt-dlp `generic` by MIME type |
| — (not counted) Generic podcast RSS/Atom feeds | podcast | any feed host (e.g. *feeds.buzzsprout.com, feed.podbean.com, feeds.megaphone.fm, anchor.fm*) | audio, video, playlist | Y: `generic` (RSS parser `_extract_rss`) | none | Podcast Index API is useful for feed lookup (GK) | Default path for hosts without a dedicated extractor |
| — (not counted) YouTube Premium-only content | protected-streaming | same hosts as YouTube (music.youtube.com, youtube.com movies / Primetime Channels) | premium formats, movies | Y: `youtube` with Premium cookies; DRM formats refused | always | YouTube Data API | Premium subscribers do not need a GVS PO token ([PO Token Guide][pot]). Purchased/rented movies are DRM (GK) |
| — (not counted) Other hosts on yt-dlp's DRM deny-list | protected-streaming | tvnz.co.nz, oneplus.ch, philo.com, mech-plus.com, aha.video, mubi.com, vootkids.com, nowtv.it/watch, resource.inkryptvideos.com, joyn.de, njpwworld.com (watch./front.), qub.ca/vrai, b-ch.com, ctv.ca, noovo.ca, tsn.ca, crackle.com / sonycrackle.com, cwtv.com, cwtvpr.com, cwseed.com, 6play.fr, rtlplay.be, play.rtl.hr, rtlmost.hu, plus.rtl.de (not /podcast/), mediasetinfinity.es, tv5mondeplus.com, tv.rakuten.co.jp, watch.telusoriginals.com, video.unext.jp, www.web.nhk, fod.fujitv.co.jp | video | Y: hidden `DRM` refuses with "known to use DRM protection… will NOT be supported" ([unsupported.py][ytdrm]) | always | — | Use the whole list as a deny-list in the registry |

**Counted rows by category:** social 17, video 21, live-streaming 15, audio-music 11, podcast 12, education 13, news-broadcaster 32, open-licensed-library 11, image-hosting 20 (4 of them adult boorus), gif 5, regional 33, protected-streaming 17, direct-media 7. Total **214**.

### Inferences
- **Normalize hostnames before dispatch.** The engine regexes are strict in ways a registry must handle. Imgur accepts only `imgur.com` and `i.imgur.com`. Bilibili's main extractor rejects `m.bilibili.com`. OK.ru rejects `m.ok.ru`. JioHotstar's own brand domain `jiohotstar.com` is not matched even though the extractor's description says "JioHotstar". ITV matches only legacy `/hub/` paths. A registry should keep a canonical host plus an alias/normalization table per platform, not just a set of hosts.
- **Shorteners need a redirect step.** Most short links (pin.it, redd.it, v.redd.it, fb.watch, instagr.am, b23.tv, on.soundcloud.com, flic.kr, lnkd.in, xhslink.com, v.douyin.com) are not in any extractor regex. They work only because yt-dlp's generic extractor follows the redirect. Resolve the redirect (HEAD/GET) before deciding capability.
- **Federated and embed platforms cannot be detected by hostname alone.** Mastodon, PeerTube, Misskey, and the Wistia/JW/Brightcove/Kaltura embeds need path or API probes, or page-content sniffing, plus a fallback to yt-dlp `generic`.
- **yt-dlp's DRM deny-list is a ready-made "protected-streaming" seed.** Netflix, Apple Music, TIDAL and `max.com` are not on it. Add them manually so the registry gives a clear "unsupported: DRM" answer instead of a generic failure.
- **Engine routing pattern:** yt-dlp for video/audio, gallery-dl for image-first sites (DeviantArt, ArtStation, pixiv, boorus, Unsplash, Pexels, Tenor, Discord, file hosts), Streamlink for live-only outlets (Euronews, DW and Reuters live, NASA+, Pluto TV live, Nimo-style plugins).

### Gaps
- The Official API column is general knowledge and was not re-verified against vendor developer portals in Nov 2026. Do not rely on it for policy decisions; other researchers cover ToS and API terms.
- Italic hostnames (CDNs, shorteners, legacy and brand domains) and "(GK)" notes were not individually checked against live DNS or redirects in this pass. Examples: SOOP's Korean `sooplive.co.kr` variant, `t.snapchat.com`, Deezer short-link hosts, the Imgur UK block, Apple TV+'s rename to "Apple TV", HBO Max's brand history, and ITVX/NPO/Udemy DRM coverage.
- Live verification that each "working" extractor actually succeeds today was out of scope, because media downloads were not permitted. "Working" means only that the extractor is not flagged broken.
- Not verified: whether Free Music Archive downloads now require login, whether Coub and Vocaroo-style small sites remain stable, and whether Nimo TV or Kakao TV are still operating. Those two were left out of the table for that reason.

## 2. How many entries does yt-dlp's supportedsites.md list today, how many are "Currently broken", and roughly how many distinct platforms do they represent?

### Takeaway
yt-dlp's supportedsites.md on master lists **1,731 extractor entries**, of which **136 (~7.9%) are marked "Currently broken"**. The installed 2026.11.23 exposes 1,752 extractor classes (20 hidden). Those entries collapse to roughly **900–1,100 distinct sites/platforms (best single estimate ≈1,000)**, including a long tail of regional broadcasters and ~80 adult-flagged extractors.

### Cited Findings
- Latest yt-dlp release is **2026.11.23**, published 2026-11-23 23:49 UTC — [release page][ytrel] (also via the GitHub releases API). Recent tags: 2026.10.26, 2026.10.21, 2026.08.19, 2026.07.04, 2026.06.09.
- The raw supportedsites.md on master, fetched 2026-11-24, has **1,731 bullet entries**, **136** of them containing "Currently broken" — [supportedsites.md][ytss].
- On the local yt-dlp 2026.11.23, `--list-extractors` prints **1,752** extractors, **136** flagged "(CURRENTLY BROKEN)". **20** are hidden (`IE_DESC=False`), so the supportedsites generator logic would emit **1,732** entries. That is one more than the master file; the difference is unexplained (likely regeneration timing).
- The 20 hidden extractors are internal helpers or refusers: `generic:quoted-html`, `CommonMistakes`, `UnicodeBOM`, `Blob`, `Rtmp`, `ViewSource`, `TestURL`, `DRM`, `Piracy`, `Liability`, `FacebookRedirectURL`, `gem.cbc.ca:content`, `HotStarPrefix`, `href.li`, `mxplayer:redirect`, `SangiinInstruction`, `tunein:shortener`, `youtube:consent`, `youtube:truncated_id`, `youtube:truncated_url` (local).
- Distinct-platform proxies from local read-only introspection:
  - **1,362** distinct `IE_NAME` prefixes (text before the first ":").
  - **922** distinct source modules, of which **831** have at least one working extractor.
  - **1,131** distinct registrable domains in the extractors' real (non-`only_matching`) test URLs, excluding generic and PeerTube; **1,028** of these come from working extractors.
  - **112** prefixes where every extractor is broken.
  - **95** distinct `.netrc` machines, i.e. sites with login support.
  - **80** listed extractors (**77** prefixes) are excluded at `age_limit=17`, i.e. adult-flagged by their tests.
- Sub-extractors inflate the entry count. YouTube has 20 extractor classes, Bilibili 22, Niconico 14, Vimeo 11, NRK 10, RAI 10, Zing MP3 10 (local). The PeerTube extractor alone embeds roughly 1,000 instance hostnames, with a regex comment citing instances.joinpeertube.org (local).
- Notable "Currently broken" entries (local, matches [supportedsites.md][ytss]):
  - Social and video: `instagram:user`, `tiktok:effect`, `tiktok:sound`, `tiktok:tag`, `loom:folder`, `PlutoTV`.
  - US TV and sports: `CBS`, `cbssports`, `NBCSports` (+3), six `nba*` extractors.
  - News and broadcasters: `Reuters`, `dw`, `dw:article`, `Tagesschau`, `RTBF`, `RTS`, `Telemundo`, `vice` (+2), `skynewsarabia:*`.
  - Education: `Teachable`, `GDCVault`, `Lecture2Go`, `TeachingChannel`.
  - Other: `LiveJournal`, all six `kuwo:*`, `radio.de`, `podomatic`, `Unity`, `Cinemax`, `aol.com`, `Europa`, `sejm`.
- The DRM deny-list (`KnownDRMIE`) explicitly covers HBO Max (play.hbomax.com), Channel 4/5, Peacock, Disney+, open.spotify.com, Apple TV (tv.apple.com), Prime Video (primevideo.com and amazon.*/gp/video), Hulu, music.amazon.*, Crunchyroll, Viki, Deezer, Paramount+, ZEE5, MUBI, Joyn and about 25 more. Its docstring says a site is added only if it uses DRM for *all* its videos and multiple users have asked — [unsupported.py][ytdrm].
- `KnownLiabilityIE` refuses motherless, suno.com and udio.com as sites "that would be a liability to the project"; only previously supported sites are added to it — [unsupported.py][ytdrm].
- The 2026.11.23 release changed:
  - **arte:** subtitles fixed.
  - **drtv:** fixed.
  - **facebook:** age-restriction detection and better error messages.
  - **twitter:** broadcasts reworked, Spaces fixed.
  - **youtube:** `ios_producer` client added; `web` temporarily removed from the default clients; default `player_js_variant` changed to `tv`; STS workaround.
  - **Also fixed:** duoplay, la7, screenrec, servus, thechosen.
  - No extractor was newly marked broken ([release notes][ytrel]).
- Local grep found **no extractor at all** for Threads, Mastodon, Trovo, TIDAL, Coursera, edX, Skillshare, Kuaishou, GIPHY, Tenor, Gfycat, DeviantArt, ArtStation, pixiv, Pexels, Pixabay, Unsplash, Openverse, NASA, Euronews, Podbean, Buzzsprout, Pocket Casts, Castbox, Netflix, MEGA, Veoh or livestream.com. Spotify, Deezer, Crunchyroll, Hulu, Peacock and Paramount+ are matched only by the DRM refuser.

### Inferences
- "Distinct platforms" ≈ **1,000 ± 100**. Module count (922) is a floor-ish estimate, because some modules cover many sites (e.g. PBS's ~140 station hosts, NBC stations, PeerTube's 1,000 instances). Test-URL registrable domains (1,131) are a ceiling-ish estimate, because they include partner and embed hosts. If adult sites and the ~112 fully broken prefixes are excluded, a registry-useful working set is roughly **800–900** platforms.
- The 136 broken entries are concentrated in US TV/sports (NBC Sports, NBA, CBS), news (Reuters, DW, Tagesschau) and dead or minor sites. Mainstream social platforms are mostly "working" by flag even when they fail in practice (see section 4), so the flag is not a reliable health signal for Instagram, Facebook or Reddit.

### Gaps
- The one-entry discrepancy between the master file (1,731) and the locally generated count (1,732) was not resolved.
- No authoritative "distinct platform" count exists. The estimates above are heuristics; an exact count would need manual dedupe of 1,362 prefixes.

## 3. How many sites/categories does gallery-dl support today, and how many Streamlink plugins exist?

### Takeaway
gallery-dl (v1.32.21, 2026-11-21) lists about **358 sites/instances** (389 table rows, minus 31 instance-family header rows) across 31 instance families. Streamlink (8.6.3, 2026-10-29) ships **135 plugin modules on master**: **132 site plugins** plus the `hls`, `dash` and `http` protocol plugins.

### Cited Findings
- Latest gallery-dl release is **v1.32.21**, published 2026-11-21 (GitHub releases API; [release][gdlrel]).
- gallery-dl's supportedsites.md is auto-generated and warns that all listed sites should be considered potentially NSFW. On master (fetched 2026-11-24) the table has **389 rows with an id**, of which **31** are instance-family headers, leaving **≈358 site/instance rows** and **386 distinct row ids** — [supportedsites.md][gdlss].
- Instance families include 2chen, Blogger, Chevereto, Danbooru, e621, Gelbooru Beta 0.1.11 and 0.2, Misskey, Nitter, Philomena, Shimmie2, vichan, Wikimedia (Wikimedia, Wikimedia Commons, Fandom), Moebooru/MyImouto, FoolFuuka 4chan archives, Mastodon and Image Hosting Sites — [supportedsites.md][gdlss].
- Auth column examples — [supportedsites.md][gdlss]:
  - **Cookies:** Twitter/X, Instagram, Facebook, TikTok, Pinterest, Patreon, pixivFANBOX, Boosty, Fur Affinity.
  - **OAuth:** Reddit, Tumblr, DeviantArt, Flickr, SmugMug, pixiv, mastodon.social.
  - **API Key:** Wallhaven, Weasyl, Derpibooru, Ponybooru, Furbooru.
  - **"Supported" (optional login):** Bluesky, Danbooru, e621, Newgrounds, ImgBB, MangaDex and others.
- Mainstream categories present: twitter, instagram, facebook, tiktok, reddit, pinterest, tumblr, imgur, flickr, deviantart, artstation, behance, 500px, pixiv, unsplash, pexels, tenor, redgifs, bluesky, mastodon, vk, weibo, bilibili, naver-chzzk, naver-blog, discord, vsco, smugmug, wallhaven, civitai, catbox, pixeldrain, gofile, wikimediacommons, newgrounds, patreon — [supportedsites.md][gdlss].
- Absent from gallery-dl: YouTube, SoundCloud, Threads, GIPHY, Pixabay, Xiaohongshu, Douyin, Dropbox, MEGA, Internet Archive (grep of the table).
- gallery-dl's `directlink` extractor matches direct URLs ending in image, video, audio and archive extensions (jpe?g, png, gif, webp/webm, avif, heic, mp4, m4v, mov, mkv, ogg/ogv, wav, mp3, opus, zip, rar, 7z, pdf, swf, …) — [directlink.py][gdldl].
- Streamlink's `src/streamlink/plugins` on master has **135** plugin modules excluding `__init__.py`. `dash`, `hls` and `http` are protocol handlers, so **132** are site plugins — [plugins dir][slsrc]; the rendered list is at [plugins.html][slp]. Latest release is **8.6.3**, published 2026-10-29 ([release][slrel]).
- Notable Streamlink plugins — [plugins dir][slsrc]:
  - **Major live platforms:** `twitch`, `youtube`, `kick`, `tiktok`, `douyin`, `soop`, `chzzk`, `huya`, `douyu`, `bilibili`, `dlive`, `picarto`, `twitcasting`, `showroom`, `nicolive`, `app17`, `bigo`, `nimotv`, `pluto`, `vimeo`, `dailymotion`, `facebook`, `okru`, `vk`, `vkvideolive`, `steam`, `pixiv`, `mixcloud`, `googledrive`, `livestream`, `ustreamtv`.
  - **Broadcasters and news:** `abematv`, `radiko`, `bbciplayer`, `ard_mediathek`, `zdf_mediathek`, `artetv`, `nrk`, `svtplay`, `drdk`, `rtve`, `raiplay`, `tf1`, `pluzz`, `euronews`, `deutschewelle`, `reuters`, `bloomberg`, `cbsnews`, `nasaplus`, `welt`, `nos`, `zattoo`, `filmon`, `vidio`.
- Trovo has no Streamlink plugin and no yt-dlp extractor. Its live service ended 2026-06-30 ([Streams Charts][trovo]).

### Inferences
- gallery-dl's ~358 rows are dominated by image boards, boorus, manga/comic readers and adult sites. Only ~40 are mainstream platforms relevant to a general-audience registry.
- Streamlink is the only engine for several live-only sources: Euronews, live DW, live Reuters, NASA+ and Nimo TV. A registry should allow per-platform engine routing for live versus VOD.

### Gaps
- The Streamlink count was taken from the repository plugin directory (equivalent to plugins.html); the rendered page itself was not parsed.
- gallery-dl subcategories (per-site extractor types) were not counted.
- Some gallery-dl "sites" are instances of the same software, so "≈358" overstates distinct *platforms* somewhat.

## 4. Which major platforms are currently broken or require login/cookies in yt-dlp (per recent GitHub issues)?

### Takeaway
As of late Nov 2026, the platforms most often broken or gated are **Reddit** (open 403/IP-block issue, cookies plus impersonation needed), **Facebook** (recurring "Cannot parse data"; partly login walls), **Instagram** (login or rate-limit walls; stories need working cookies; `instagram:user` flagged broken), **X/Twitter** (cookies for NSFW and protected content; cookie invalidation), **YouTube** (PO tokens and a JS challenge solver; periodic 403 waves; client churn in 2026.11.23) and **TikTok** (Aug-2026 breakage fixed in 2026.08.19 via impersonation; user/sound/tag/effect pages flaky or broken).

### Cited Findings
- **Reddit**
  - [#17965][rd17965], opened 2026-10-31 against stable 2026.10.26 and **still open**: "HTTP Error 403: Blocked". With cookies the reporter then hit "Your IP address is unable to access the Reddit API". A contributor says Reddit now requires cookies and that `--impersonate chrome` avoids the bot-detection page. No maintainer reply and no linked PR.
  - An earlier v.redd.it 403 was tied to TLS fingerprinting ([#15293][rd15293]).
  - The extractor uses impersonation and raises login-required for private and quarantined subreddits (local reddit.py).
- **Facebook**
  - Repeated "Cannot parse data" reports through 2026: June 2026 with cookies ([#15161][fb15161]); Oct 2026, with stable and master not working for videos ([#17906][fb17906], per search snippet).
  - [#18016][fb18016] was opened 2026-11-07 on 2026.10.26 and closed 2026-11-22. Root cause: Facebook's new React login-wall page lacked the markers yt-dlp checked. The maintainer's resolution was better error messages that suggest cookies (PR #18083).
  - 2026.11.23 adds detection of age-restricted content ([release][ytrel]).
- **Instagram**
  - `instagram:user` is flagged **Currently broken** (local / [supportedsites.md][ytss]).
  - [#17755][ig17755] was opened 2026-09-29: story URLs returned "You need to log in" even with valid cookies while posts and reels still worked. It was closed 2026-10-22 (labels account-needed, site-bug; duplicates #17903 and #17918; a contributor fix circulated as a fork branch).
  - The generic "Requested content is not available, rate-limit reached or login required" error is long-standing ([#11166][ig11166]).
  - A Nov-2026 downstream PR notes that audience-restricted reels need cookies ([cemekli/VideoDownloader #39][igpr]).
- **X/Twitter**
  - Late-Oct 2026 "Could not authenticate you": the maintainer said the cookies had been invalidated and should be re-exported ([#17950][tw17950]).
  - Protected-account tweets still fail even with cookies ([#17243][tw17243]).
  - A CSRF-cookie error was reported in March 2026 on 2026.03.03 ([#16176][tw16176]).
  - gallery-dl lists Twitter auth as Cookies ([supportedsites.md][gdlss]).
- **YouTube**
  - The PO Token Guide (last edited 2026-07-12) says GVS PO tokens are needed for web, web_safari, mweb, tv_simply, web_music, web_creator, android and ios; tv, web_embedded and android_vr do not need them. Missing tokens can cause 403s and account/IP blocking. Manual token extraction is no longer recommended; the bgutil and getpot-wpc provider plugins are recommended. Without cookies, tv formats are DRM-protected — [PO Token Guide][pot].
  - 403 reports in 2026 include intermittent 403s ([#17395][yt17395]) and 403s even with PO tokens ([#17682][yt17682]).
  - 2026.11.23 changed the default client set and added `ios_producer` ([release][ytrel]).
  - The local venv also ships the `yt_dlp_ejs` 0.8.0 package (yt-dlp's external JS challenge-solver component, observed in site-packages).
- **TikTok**
  - August 2026 failures: "Unexpected response from webpage request" around Aug 10 ([#17403][tt17403]). A downstream PR reports that 2026.07.04 fails while 2026.08.19 works with curl_cffi impersonation targets available ([PR][ttfix]).
  - `tiktok:user` fails to extract the secondary user ID ([#17500][tt17500], opened 2026-08-21).
  - `tiktok:effect`, `tiktok:sound` and `tiktok:tag` are flagged **Currently broken** (local).
  - Douyin asks for "fresh cookies (not necessarily logged in)" (local tiktok.py).
- **Other notable gated or broken sites** (local flags): `PlutoTV` broken (use Streamlink `pluto`); `CBS`, `NBCSports`, `Reuters`, `dw` and `Tagesschau` broken; `Teachable` broken; `loom:folder` broken. Subscription sites always need login: Nebula, Floatplane, CuriosityStream, Udemy, Pluralsight, Frontend Masters, Platzi, Weverse.

### Inferences
- For a public-facing downloader, treat Reddit, Facebook, Instagram and X as **"degraded: may need cookies/impersonation"**, not "supported". Health should come from periodic canary checks, not from yt-dlp's `working()` flag, which stays green for these extractors.
- Installing curl_cffi (impersonation), a PO-token provider and a JS runtime is now a de-facto prerequisite for reliable YouTube, TikTok, Reddit and Kick support.
- Cookie use carries account risk. A community gist on logging into sites with yt-dlp warns against logging into Instagram this way because of ban risk ([gist][gist], characterized from a search snippet). Prefer throwaway accounts if the product supports cookies at all.

### Gaps
- [#17906][fb17906], [#15161][fb15161], [#17403][tt17403], [#17500][tt17500], [#16176][tw16176] and [#17243][tw17243] were characterized from search-result snippets, not full page reads. Their current open/closed state may have changed.
- Whether Instagram stories work on 2026.11.23 with fresh cookies was not confirmed (#17755 was closed, but the linked PRs show as closed and their content was not read).
- No authoritative maintainer statement on Reddit's late-2026 blocking was found. The issue has contributor replies only.
- The exact JS-runtime requirement for YouTube (Deno or similar) was not re-read from yt-dlp's EJS documentation in this pass.

[ytss]: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md
[ytrel]: https://github.com/yt-dlp/yt-dlp/releases/tag/2026.11.23
[ytdrm]: https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/unsupported.py
[ytgen]: https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/generic.py
[pot]: https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide
[gdlss]: https://github.com/mikf/gallery-dl/blob/master/docs/supportedsites.md
[gdldl]: https://github.com/mikf/gallery-dl/blob/master/gallery_dl/extractor/directlink.py
[gdlrel]: https://github.com/mikf/gallery-dl/releases/tag/v1.32.21
[slp]: https://streamlink.github.io/plugins.html
[slsrc]: https://github.com/streamlink/streamlink/tree/master/src/streamlink/plugins
[slrel]: https://github.com/streamlink/streamlink/releases/tag/8.6.3
[fb18016]: https://github.com/yt-dlp/yt-dlp/issues/18016
[fb17906]: https://github.com/yt-dlp/yt-dlp/issues/17906
[fb15161]: https://github.com/yt-dlp/yt-dlp/issues/15161
[ig17755]: https://github.com/yt-dlp/yt-dlp/issues/17755
[ig11166]: https://github.com/yt-dlp/yt-dlp/issues/11166
[igpr]: https://github.com/cemekli/VideoDownloader/pull/39
[tw17950]: https://github.com/yt-dlp/yt-dlp/issues/17950
[tw17243]: https://github.com/yt-dlp/yt-dlp/issues/17243
[tw16176]: https://github.com/yt-dlp/yt-dlp/issues/16176
[tt17403]: https://github.com/yt-dlp/yt-dlp/issues/17403
[tt17500]: https://github.com/yt-dlp/yt-dlp/issues/17500
[ttfix]: https://github.com/DaH4uk/tg-video-downloader/pull/22
[rd17965]: https://github.com/yt-dlp/yt-dlp/issues/17965
[rd15293]: https://github.com/yt-dlp/yt-dlp/issues/15293
[yt17395]: https://github.com/yt-dlp/yt-dlp/issues/17395
[yt17682]: https://github.com/yt-dlp/yt-dlp/issues/17682
[trovo]: https://streamscharts.com/news/trovo-shut-down
[gfy]: https://techcrunch.com/2023/07/05/gfycat-shuts-down-on-september-1
[threads]: https://about.fb.com/news/2025/04/new-features-threads-web-experience/
[gist]: https://gist.github.com/gamer191/ddf0b23b0a6df8e2ffe81bd1dda9154c
