# Social platform policies on downloading media (18 platforms), as of 2026-11-24

Scope and method notes (read first): every URL below was accessed on 2026-11-24. Source tags: [fetched] = page text retrieved and read; [excerpt] = only a search-engine excerpt/summary was seen (page not loaded); [OTA copy] = Open Terms Archive's GitHub mirror of the official terms, used because the official page was unfetchable; [3rd-party] = non-official source, lower confidence. All contract provisions are paraphrased; to stay within copyright limits only one verbatim phrase (X, below) is quoted in this file. This is not legal advice. Classification scheme: 1 = officially supported downloads; 2 = authorized user-owned content exports; 3 = public media with permitted downloading; 4 = technically supported but permission-restricted; 5 = unsupported/protected.

## Per-platform record: what downloading is actually permitted and which official routes exist (items 1-6)

### Takeaway
No platform among the 18 grants third-party tools a general right to download other people's media: the terms of at least 14 of them restrict automated access, scraping or copying (VK's main terms could not be checked; Bluesky, current mastodon.social and the 2023 Imgur copy do not), and every first-party download feature (TikTok, Instagram Reels, X video, Pinterest images, LinkedIn documents, Telegram saving, Flickr) is in-app and gated by creator flags, subscription tier, account type or licence. The only near-unconditional routes are each user's export of their own data. On that basis, the classification (see Inferences) is: Pinterest = 1; Facebook, Threads, Snapchat, VK = 2; Flickr, Imgur = 3; TikTok, Instagram, X, Reddit, Tumblr, Bluesky, Mastodon, Telegram, GIPHY = 4; LinkedIn, Tenor = 5.

### Cited Findings

#### TikTok
- (1) ToS: The U.S. Terms of Service were last updated July 15, 2026, and the contracting entity is TikTok USDS Joint Venture LLC. Section 3.4 (What you can't do on the Platform) bars scraping, crawling, exporting or otherwise extracting any data or content through automated systems or bots without TikTok's written approval, and bars reverse engineering. Section 3.5 (Ownership of content and grant of licenses) gives TikTok rights that include downloading and copying user content, and gives other users a licence to download content only as the poster's sharing activities and settings allow. No standalone clause says downloads may happen only through TikTok features, but the user-to-user download licence is tied to platform settings. — [TikTok U.S. Terms of Service](https://www.tiktok.com/legal/page/us/terms-of-service/en) [fetched]
- (2) Download feature: The creator-controlled *Video downloads* setting is at Profile > Menu > Settings and privacy > Privacy > Downloads. It is off by default for private accounts and for users under 16, and those users cannot turn it on. — [TikTok Support: Manage video downloads](https://support.tiktok.com/en/account-and-privacy/account-privacy-settings/video-downloads) [excerpt; the URL redirects to a JavaScript-rendered tiktok.com/support page that returned no text when fetched]
- (2) TikTok's Guardian's Guide says teens cannot use downloading and cannot change that control. — [TikTok Guardian's Guide](https://www.tiktok.com/safety/en/tools-and-guides/guardians-guide) [excerpt]. TikTok's youth-safety newsroom post says downloads are disabled for content from accounts under 16. — [TikTok Newsroom: Strengthening privacy and safety for youth](https://newsroom.tiktok.com/strengthening-privacy-and-safety-for-youth?lang=en) [excerpt]
- (2) Third-party guides say videos saved with TikTok's native Save option carry the TikTok watermark and the creator's username. — [IONOS Digital Guide](https://www.ionos.com/digitalguide/online-marketing/social-media/tiktok-download/) [3rd-party, excerpt]. Social Media Today reported an option for creators to save their own posts without the watermark. — [Social Media Today](https://www.socialmediatoday.com/news/tiktok-updates-option-download-clips-without-watermark/720401/) [3rd-party, excerpt; publication date not confirmed]
- (3) Own-data export: In the app's *Download your data* flow, users choose TXT or JSON. The file takes about 1 to 4 days, stays downloadable for a few days, and can be requested about once every 30 days. Third-party guides say it contains data and links but not the video files. — [PIRG guide](https://pirg.org/edfund/resources/how-to-request-and-download-tiktok-data/) [3rd-party, excerpt]; [TechCrunch, Jan 17 2025](https://techcrunch.com/2025/01/17/tiktok-ban-how-to-download-your-videos-and-data) [excerpt]. The exact menu path was not verified from an official page.
- (3)/(4) Data Portability API: POST https://open.tiktokapis.com/v2/user/data/download/ returns a binary stream that is saved as a .zip. It uses the portability scopes (all, activity, directmessages, postsandprofile, each with single or ongoing variants). The page does not state eligibility regions or say whether .mp4 files are included. — [TikTok Data Portability API: download](https://developers.tiktok.com/docs/en/data-portability-api-download) [fetched]. A search excerpt says TikTok's data-types documentation gives apps a post URL for downloading .mp4/.jpg files. — [TikTok Data Portability data types](https://developers.tiktok.com/docs/zh-Hans/data-portability-data-types) [excerpt, unverified]
- (4) Display API: It returns basic profile data (user.info.basic) and metadata for the authorizing user's public videos (video.list: /v2/video/list/, /v2/video/query/) for display or embedding on third-party sites. The overview does not say it returns downloadable video files. — [TikTok Display API overview](https://developers.tiktok.com/doc/display-api-overview) [fetched]
- (4) Research API: It is limited to independent and academic researchers doing non-profit work, and needs an approved project and ethics sign-off. Commercial users and creators are excluded. It returns public video metadata (counts, captions, transcripts, timestamps), not files. — [TikTok Research API](https://developers.tiktok.com/products/research-api); [Research API FAQ](https://developers.tiktok.com/docs/en/research-api-faq) [excerpts]. The changelog (last updated Aug 19, 2026) shows fields added in Dec 2025 and coverage changes in Feb 2026. — [TikTok developer changelog](https://developers.tiktok.com/docs/en/changelog) [excerpt]
- (5) Login to view public media: not verified this session (see Gaps).

#### Instagram (Reels, Posts, Stories, carousels)
- (1) ToS: The official Terms of Use page is JavaScript-rendered and returned no text, so the OTA copy was used. It shows the terms effective 1 January 2025. Section 4.2 (How You Can't Use Instagram) bars creating accounts or collecting information in an automated way without express permission, whether or not you are logged in. It also bars circumventing technical limits on access and selling or buying data. There is no standalone clause about downloading. Section 4.3 licenses content to Instagram and ends when the content is deleted. — [Instagram Terms of Use (official)](https://help.instagram.com/581066165581870) [unfetchable: empty JS shell]; [OTA copy](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Instagram/Terms%20of%20Service.md) [fetched]
- (1) Meta's Automated Data Collection guidance applies to both Facebook and Instagram. Programmatic access is allowed only through Platform APIs unless Meta gives prior written permission, and instagram.com, facebook.com and Meta's GraphQL endpoints are named as off-limits for automated requests. — [Meta for Developers: Automated Data Collection](https://developers.facebook.com/documentation/development/terms-and-policies/automated-data-collection) [fetched]
- (2) Download feature (Reels only): Anyone on Instagram can download a public account's reels unless the creator changes the reels download setting. Reels from private accounts cannot be downloaded. Creators control this with an account-level toggle (*Allow people to download your reels*, under Reels and remix privacy settings) or per reel with *Turn off downloading*. Accounts under 18 start with downloads off. — [Instagram Help: who can download your reels](https://help.instagram.com/iphone-app/520831036611383) [excerpt]; [BGR how-to](https://bgr.com/tech/how-to-stop-people-from-downloading-your-instagram-reels/) [3rd-party]
- (3) Own-data export: Accounts Center > Your information and permissions > Download your information (password required). You choose HTML or JSON and a quality level for photos and videos. Since Oct 2023 Facebook and Instagram data can be exported together. — [Instagram Help: download a copy of your information](https://help.instagram.com/ipad-app/181231772500920) [excerpt]; [Meta Newsroom, Oct 2023](https://about.fb.com/news/2023/10/manage-your-information-across-apps/) [excerpt]
- (4) APIs: The *Instagram API with Instagram Login* (and *with Facebook Login*) gives an app access to the user's own Business or Creator account data. The IG Media media_url field is omitted when the media contains copyrighted material or has been flagged. — [Instagram API with Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started); [IG Media reference](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media) [excerpts]. The Basic Display API, which covered personal accounts, was deprecated on Dec 4, 2024. — [Instagram Platform changelog](https://developers.facebook.com/docs/instagram-platform/changelog); [Meta developer blog, Sept 4 2024](https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api) [excerpts]
- (5) Login: Since Oct 2019, logged-out web visitors are prompted to sign in after viewing a few posts. — [The Next Web, 2019](https://thenextweb.com/news/instagram-now-forces-people-to-sign-in-to-view-public-profiles) [excerpt]. Guides from 2026 report that a few posts are visible logged out, while Reels and Stories trigger a login wall. — [DICloak 2026 guide](https://dicloak.com/blog-detail/how-to-view-instagram-without-an-account-in-2026-working-methods-and-safety-risks) [3rd-party, low reliability]

#### Facebook (Videos, Reels, public posts)
- (1) ToS: The Meta Terms of Service have been effective since 1 January 2025. The page was served in Arabic and the date was confirmed with the OTA copy. Section 3.2 (What you can share and do), item 3, bars accessing or collecting data from Meta Products by automated means without prior permission, logged in or not. Item 7 bars circumventing technical access controls, and item 1 bars sharing content that infringes others' IP. Section 3.4 reserves all rights not expressly granted. — [Facebook Terms](https://www.facebook.com/terms.php) [fetched, Arabic rendering]; [OTA copy](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Facebook/Terms%20of%20Service.md) [fetched]. Meta's Automated Data Collection page cites ToS section 3.2.3 for this rule. — [Meta: Automated Data Collection](https://developers.facebook.com/documentation/development/terms-and-policies/automated-data-collection) [fetched]
- (2) Download feature (own content only): In the mobile app, go to your profile > Reels > select a reel > Options > Download reel, which saves it to the device gallery. Since the September 2025 change, every Facebook video counts as a reel. Reels posted after that change can be downloaded, while older videos keep their earlier options. Reels that use someone else's original audio download muted, and licensed music may be muted. The help page states plainly that reels or videos created by other people cannot be downloaded. — [Facebook Help (app version): Download a reel you shared](https://www.facebook.com/help/android-app/1005944300373812) [fetched; Arabic rendering, translated]. The desktop version of the page says the feature is not available on computers. — [Facebook Help (desktop)](https://www.facebook.com/help/1005944300373812) [fetched]. Saving someone else's video only adds it to your Saved list, not to the device. — [Facebook Help: Save reels and videos](https://www.facebook.com/help/283351151337206/Save+reels+and+videos+on+Facebook+to+view+later) [excerpt]
- (3) Own-data export: Accounts Center > Download your information (help title: Export a copy of your Facebook information), using the same HTML/JSON and media-quality options as Instagram. — [Facebook Help 212802592074644](https://www.facebook.com/help/212802592074644) [excerpt: title only]; format details from the Instagram Help and Meta Newsroom sources above.
- (4) APIs: Data may be retrieved only through Platform APIs on graph.facebook.com (for example the Pages, Groups and Marketing APIs), with App Review for permissions. — [Meta: Automated Data Collection](https://developers.facebook.com/documentation/development/terms-and-policies/automated-data-collection) [fetched]. Meta Content Library (researcher access) was not researched (see Gaps).
- (5) Login: not verified (see Gaps).

#### Threads
- (1) Terms: The Threads Terms of Use and Impressum were last updated 21 January 2026. The Instagram Terms and Community Standards also apply. Section 3.1(iv) bars using robots, spiders, crawlers, scrapers or other automatic devices, and also manual processes, to collect or extract data. Section 3.1(iii) bars circumventing content protections. Sections 1.2 and 4.2 describe interoperable (fediverse-style) sharing, under which content may sit on third-party servers that Meta does not control. — [OTA copy of Threads Terms](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Threads/Terms%20of%20Service.md) [fetched; official page not attempted]
- (2) Download feature: none found (see Gaps).
- (3) Own-data export: not verified separately for Threads (see Gaps).
- (4) Threads API:
  - GET /{threads-user-id}/threads returns the user's own posts with the threads_basic permission.
  - Profile discovery (GET /profile_posts?username=...) needs threads_profile_discovery. Its example request asks for media_url, and permalink is omitted for copyright-flagged media.
  - Keyword search needs threads_keyword_search approval. Without it, only the user's own posts are searchable. Keyword search was added Dec 9, 2024 and media-type filtering on Sep 9, 2025.
  - Sources: [Retrieve posts](https://developers.facebook.com/documentation/threads/retrieve-and-discover-posts/retrieve-posts); [Threads Profiles](https://developers.facebook.com/documentation/threads/threads-profiles); [Keyword search](https://developers.facebook.com/documentation/threads/keyword-search); [Threads changelog](https://developers.facebook.com/docs/threads/changelog) [excerpts]
- (5) Login: not verified (see Gaps).

#### Snapchat (Spotlight, public Stories)
- (1) ToS: The Snap Terms, in separate Snap Inc. and Snap Group Limited versions, are effective September 21, 2026; a banner says the prior terms apply until then.
  - Section 8 (Respecting the Services and Snap's Rights) bars bots, crawlers, scrapers, scripts and other automated or semi-automated means of accessing, extracting or copying the Services or content. It also bars unauthorized third-party apps.
  - Section 8 also bars copying, archiving, downloading or distributing content, except temporary caching, uses the Terms expressly allow, or the Service's intended functionality. The Group Limited version adds an exception for EU Digital Services Act researchers.
  - Section 2 (Public Content, covering Spotlight, Public Stories and Public Profiles): in the Snap Inc. version, posters grant Snap, its affiliates, other users and business partners a broad, perpetual licence, including reproduction and derivatives. In the Group Limited version the licence lasts while the content is on the Services plus a reasonable period.
  - Source: [Snap Terms of Service](https://snap.com/en-US/terms) [fetched; the last ~17% of the page was not read]
- (2) Download feature: No official documentation of downloading other users' Spotlight or public Stories was found. Third-party guides conflict: some describe a Share > Download option, others say there is none. — [Beebom](https://beebom.com/how-save-snapchat-videos) [3rd-party]. Snap's June 12, 2025 creator-tools announcement covers Auto-Save of Stories to Public Profiles but says nothing about downloads. — [Snap Newsroom, June 12 2025](https://newsroom.snap.com/empowering-content-creation-with-new-tools) [fetched]
- (3) Own-data export:
  - Profile > Settings > My Data, then select Memories plus HTML and/or JSON > Next > All Time > confirm email > Submit. The data is emailed as a .zip.
  - In the app, Memories can also be exported to the camera roll up to 100 at a time.
  - In late Sept 2025 Snap announced a 5GB cap on free Memories storage. Paid plans are $1.99/mo for 100GB, Snapchat+ includes 250GB, and Platinum includes 5TB. Memories above 5GB get 12 months of temporary storage.
  - Source: [TechCrunch, Oct 3 2025](https://techcrunch.com/2025/10/03/snapchat-is-planning-to-charge-for-storage-heres-how-to-save-your-memories-for-free) [fetched]. The web route is accounts.snapchat.com > My Data. — [Technobezz](https://www.technobezz.com/how-to-download-your-snapchat-account-data) [3rd-party]
- (4) APIs: The Public Profile API (part of the Marketing API) needs the snapchat-profile-api scope. It covers profiles, creator discovery through search, and asset management for creators and partners. — [Public Profile API intro](https://developers.snap.com/marketing-api/Public-Profile-API/Introduction); [Public Profile API FAQ](https://developers.snap.com/marketing-api/Public-Profile-API/FAQ) [excerpts]. Web embeds (copy-paste embed code, not downloads) cover Lenses, Spotlight, Public Stories and Public Profiles, and embedded Spotlight still carries ads. — [Snap embeds doc](https://developers.snap.com/api/snapchat-for-web/social-plugins/embedding-web-content); [Snap Newsroom: how to embed](https://newsroom.snap.com/how-to-embed-snapchat-content) [excerpts]
- (5) Login: Spotlight and public content can be embedded on third-party sites (sources above). Logged-out viewing on snapchat.com itself was not verified.

#### X / Twitter
- (1) ToS: x.com/en/tos returned HTTP 402 to the fetcher, so the OTA copy was used. It shows the current version effective October 9, 2026, in both the general and the EU/EFTA/UK versions.
  - Section 4 (Misuse of the Services) requires access only through X's published interfaces unless a separate agreement says otherwise. It prohibits "crawling or scraping the Services in any form" without prior written consent.
  - Section 5 (Liquidated Damages): requesting, viewing or accessing more than 1,000,000 posts in any 24-hour period costs US$15,000 per 1,000,000 posts (EUR 15,000 in the EU/EFTA/UK version). Anyone who knowingly assists is jointly liable.
  - The Section 4 licence covers using X's software only as intended.
  - Sources: [X Terms (official)](https://x.com/en/tos) [unfetchable: HTTP 402]; [OTA copy](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/X/Terms%20of%20Service.md) [fetched]
- (1) Background: Reporting describes an earlier revision effective Jan 15, 2026 that treated AI prompts and outputs as Content and kept the scraping ban and damages. — [crypto.news](https://crypto.news/x-expands-content-to-ai-prompts-outputs-in-2026-terms-update/); [PureAI, Dec 22 2025](https://pureai.com/articles/2025/12/22/x-new-terms-ai-prompts.aspx) [excerpts]. The ban on crawling dates from Sept 2023. — [TechCrunch, Sept 8 2023](https://techcrunch.com/2023/09/08/x-updates-its-terms-to-ban-crawling-and-scraping) [excerpt]
- (2) Download feature: Premium subscribers, and subscribers to the Plus, Premium, Super and Ultra plans of *The X Subscription*, can download videos from certain posts. The uploader controls this with an *Allow video to be downloaded* toggle while composing; it cannot be changed later, and deleting the post is the only way to withdraw it. Videos posted before July 25, 2023 cannot be downloaded. — [X Help: How to share and watch videos](https://help.x.com/en/using-x/x-videos) [unfetchable: HTTP 403; excerpt]. The feature launched in July 2023. — [Engadget](https://www.engadget.com/x-blue-subscribers-can-now-download-videos-from-the-website-065336710.html) [excerpt]
- (3) Own-data export: Settings and privacy > Your account > Download an archive of your data > confirm password > Request archive. Preparation can take a few days, and X sends an email or push notification when it is ready. You download a .zip while logged in. It contains machine-readable HTML and JSON files plus a *Your archive* HTML viewer. — [X Help: How to download your X archive](https://help.x.com/articles/20170320); [X Help: accessing your X data](https://help.x.com/en/managing-your-account/accessing-your-x-data) [excerpts]
- (4) API pricing: The X API is pay-per-usage with prepaid credits; the pricing page shows no subscriptions or minimums.
  - Reads cost $0.005 per post (also Lists and Spaces), $0.010 per user, and $0.001 per owned read.
  - Creating a post costs $0.015, or $0.200 if it contains a URL.
  - Post reads are capped at 3M per month; Enterprise covers higher volume. The page shows no date.
  - Sources: [X API pricing](https://docs.x.com/x-api/getting-started/pricing) [fetched]. Pay-per-use was piloted in Oct 2025. — [TechCrunch, Oct 21 2025](https://techcrunch.com/2025/10/21/x-is-testing-a-pay-per-use-pricing-model-for-its-api) [excerpt]. One blog says legacy Basic subscribers were moved after June 1, 2026 and Pro was deprecated on Aug 14, 2026. — [Blotato](https://www.blotato.com/blog/twitter-api-pricing) [3rd-party, unverified]
- (4) API media fields: The media object's variants array gives a URL for each resolution or bitrate, requested with media.fields plus expansions=attachments.media_keys. — [X API media object](https://developer.x.com/en/docs/x-api/data-dictionary/object-model/media) [excerpt]. The allow_download_status object (allow_download: boolean) can be set through POST /2/media/metadata. — [X API: Create media metadata](https://docs.x.com/x-api/media/create-media-metadata) [excerpt]; [AllowDownloadStatus schema](https://docs.x.com/xdks/typescript/reference/interfaces/Schemas.AllowDownloadStatus) [excerpt: title only]
- (5) Login: Most browsing has required login since mid-2023, though single post links sometimes render logged out. Sources conflict. — [TechCrunch, July 5 2023](https://techcrunch.com/2023/07/05/twitter-silently-removes-login-requirement-for-viewing-tweets/) [excerpt]; [unanswered.io 2026 guide](https://unanswered.io/guide/browse-x-without-account) [3rd-party, low reliability]

#### Pinterest
- (1) ToS: The Terms of Service are effective November 12, 2026.
  - Section 2(a) (Who can use Pinterest): users agree not to scrape, collect, search, copy or otherwise access data or content in unauthorized ways, such as automated means without express prior permission.
  - Section 2(b) (Our license to you): a limited, revocable licence that excludes copying features.
  - Section 3(b) (How we and other users can use your User Content): posters grant Pinterest, its affiliates and service providers, and other users a non-exclusive, royalty-free licence. It covers, among other things, storing, reproducing, saving and downloading the content, framed around operating and promoting the Service.
  - Source: [Pinterest Terms of Service](https://policy.pinterest.com/en/terms-of-service) [fetched]
- (2) Download feature: *Download image* is in the ellipsis menu for image Pins on web and app. Video Pins cannot be downloaded, including your own. Creators cannot prevent downloads; the only option is a private board, and invitees may still download from it. There is no original-resolution option. — [Pinterest Help: Download an image](https://help.pinterest.com/en/article/download-an-image) [fetched; no date shown]. Some third-party guides claim the apps allow creator-enabled video downloads, which contradicts the help article. — [Brandwatch](https://www.brandwatch.com/blog/how-to-download-pinterest-videos/) [3rd-party]
- (3) Own-data export: Settings > Privacy and data > Request your data > Start request. A download link arrives by email within up to 48 hours through SendSafely, and only the verified account holder can get it. — [Pinterest Help: Download your Pinterest data](https://help.pinterest.com/en/article/download-your-pinterest-data) [excerpt]
- (4) API (v5): Apps start with Trial access. Standard access brings higher rate limits and public Pin creation, and requires compliance with the Developer Guidelines plus a demo of the app. — [Pinterest access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/) [excerpt]; [Pinterest API FAQ](https://community.pinterest.biz/t/frequently-asked-questions-pinterest-api/2083) [excerpt]. One third-party guide says API data cannot be stored except for campaign analytics. — [Blotato](https://www.blotato.com/blog/pinterest-api-pricing) [3rd-party, unverified]
- (5) Login: not verified (see Gaps).

#### Reddit
- (1) ToS: The User Agreement is effective July 1, 2026, last revised May 26, 2026. redditinc.com could not be fetched, so the OTA copy was used.
  - Section 7 (Things You Cannot Do): no accessing or collecting data from the Services by any means, automated or otherwise, unless the Terms or a separate agreement allow it. Crawling is conditionally allowed within robots.txt, and scraping without Reddit's prior written consent is prohibited.
  - Section 3 (Your Use of the Services): a personal, non-transferable, revocable, limited licence, and no commercial use of the Services or Content without a written agreement.
  - Section 11 (Intellectual Property): Reddit owns its Materials.
  - Sources: [Reddit User Agreement (official)](https://redditinc.com/policies/user-agreement) [unfetchable]; [OTA copy](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Reddit/Terms%20of%20Service.md) [fetched]. Reddit's H1 2026 New York ToS report links to a user-agreement-july-1-2026 page. — [NY AG filing](https://ag.ny.gov/sites/default/files/social-media-policy-report/2026-q1q2-reddit-inc-policy-1.pdf) [fetched, metadata only]
- (2) Download feature: Third-party guides say the mobile apps sometimes show a Download or Save Video option in the share menu (more often on Android than iOS) and can save images. There is no desktop option. — [Make Tech Easier](https://www.maketecheasier.com/download-reddit-videos/) [3rd-party, low confidence]
- (3) Own-data export: The request page is reddit.com/settings/data-request. It produces a ZIP of CSV files by category (posts, comments, messages, IP logs and so on), and uploaded media is reportedly not included. — [Takeout Day guide](https://takeoutday.org/guides/how-to-export-reddit-data) [3rd-party]; [ContextBolt guide](https://contextbolt.com/blog/export-reddit-saved-posts/) [3rd-party]
- (4) API (Responsible Builder Policy, Nov 2025): Developers, moderators and researchers need approval before accessing Reddit data through the API, and commercial use needs separate written approval. Self-service access is closed. Developers are steered to Devvit and researchers to r/reddit4researchers, and existing access is unaffected. — [Reddit Help: Responsible Builder Policy](https://support.reddithelp.com/hc/articles/42728983564564) [unfetchable: HTTP 403; content from excerpts]; [r/redditdev announcement, Nov 11 2025 (mirror)](https://r.datuan.dev/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/) [3rd-party mirror]
- (5) Login: not verified (see Gaps).

#### Tumblr
- (1) ToS: The Terms of Service were last updated January 16, 2026.
  - Section 3 (Limitations on Automated Use): no automated access except through published interfaces or as robots.txt permits, unless Tumblr gives express prior written permission. Scraping, especially of Content, is prohibited.
  - Section 6 (Content License to You): a limited, revocable licence to download, view, redistribute and create derivative works of Content, but only for using the Services, for example reblogging.
  - Section 7: developers must accept the Application Developer and API License Agreement.
  - Source: [Tumblr Terms of Service](https://www.tumblr.com/policy/en/terms-of-service) [fetched]
- (2) Download feature: No native media-download button was found. Reblogging is the sanctioned reuse mechanism (ToS Section 6, above).
- (3) Own-data export: Export is per blog, from the blog's settings, and produces a ZIP. It holds a Posts folder of HTML (including drafts and private posts) and a Media folder; each blog is exported separately, and notes and theme formatting are dropped. — [The Next Web guide (2018)](https://thenextweb.com/news/how-to-save-all-your-tumblr-content) [3rd-party, dated]. The Tumblr help URL tried returned 404.
- (4) API: The Application Developer and API License Agreement was last updated Sept 12, 2018. It requires:
  - attribution to both the posting blog and the original source;
  - applying deletions and privacy changes within 24 hours;
  - not storing or caching content for more than three days;
  - no archiving or reselling Tumblr data, except user-requested portability;
  - respecting rate limits and not scraping pages to exceed the API.
  - Source: [Tumblr API License Agreement](https://www.tumblr.com/docs/en/api_agreement) [fetched]
- (5) Login: not verified (see Gaps).

#### LinkedIn
- (1) ToS: The User Agreement is effective November 3, 2025. Section 8.2 (Don'ts), item 2, bars developing or using software, scripts, robots, crawlers, browser plugins or add-ons to scrape or copy the Services, including profiles. Item 4 bars copying, using, displaying or distributing information obtained from the Services without the content owner's consent. — [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement) [fetched]
- (2) Download feature: Members who can view a document post (PDF, PPT/PPTX or DOC/DOCX) can download it as a PDF. LinkedIn describes this as an accessibility feature, and no author opt-out was found. — [LinkedIn Help 97459](https://www.linkedin.com/help/linkedin/answer/97459) [excerpt]; [Social Media Examiner](https://www.socialmediaexaminer.com/how-to-share-documents-linkedin-posts-marketing-tips/) [3rd-party]. No download feature for others' videos or images was found.
- (3) Own-data export: Me > Settings & Privacy > Data privacy > Get a copy of your data. You can request a full or a selected archive. It arrives by email, often in two parts, in about 24 hours. — [LinkedIn Help 50191](https://www.linkedin.com/help/linkedin/answer/50191) [excerpt]; [Guideflow](https://www.guideflow.com/tutorial/how-to-request-a-full-linkedin-data-archive) [3rd-party]
- (4) API: not researched in enough depth to cite (see Gaps).
- (5) Login: not verified (see Gaps).

#### Bluesky
- (1) ToS: The Terms were last updated 14 August 2025.
  - They contain no clause on scraping, bulk collection or automated access; AT Protocol developer applications are governed by their own terms.
  - Section 3 (User Content): users keep ownership and license their content to Bluesky to operate the service. Bluesky says it does not control how others use content and cannot guarantee deletion across the network.
  - No licence is granted to other users or the public to copy or download content.
  - Source: [Bluesky Terms of Service](https://bsky.social/about/support/tos) [fetched]
- (2) Download feature and flag:
  - Third-party sources from 2025-26 say there is no native download button. — [Circleboom](https://circleboom.com/blog/bluesky-video-downloader-how-to-save-videos-for-free/); [DICloak 2026](https://dicloak.com/blog-detail/bluesky-video-downloader-how-to-download-bluesky-videos-safely-in-2026) [3rd-party, low confidence]
  - The *Logged-out visibility* setting (Settings > Moderation) publishes a !no-unauthenticated label on the account. Bluesky's own app and site honour it. Other atproto apps are asked to honour it and keep the content out of search indexes, but compliance is voluntary. — [Bluesky docs: visibility preferences](https://bsky.network/docs/about-bluesky-content/visibility-preferences/) [excerpt]; [Ditto client implementation](https://gitlab.com/soapbox-pub/ditto/-/merge_requests/596) [3rd-party]
- (3) Own-data export: *Export my data* produces a CAR file of the account repository (posts, likes, follows). Images and videos (blobs) are referenced by CID but not included and must be fetched separately. DMs and private preferences are excluded. — [AT Protocol blog: repo export](https://atproto.com/blog/repo-export); [Bluesky docs: repo export](https://docs.bsky.app/blog/repo-export) [excerpts]
- (4) API: There are public AT Protocol endpoints, but the rate-limits page redirected to bsky.network and returned an empty page. — [Bluesky rate limits](https://docs.bsky.app/docs/advanced-guides/rate-limits) [unfetchable]. No pricing was found.
- (5) Login: Posts have been viewable without login since Dec 2023. — [TechCrunch, Dec 22 2023](https://techcrunch.com/2023/12/22/bluesky-finally-lets-users-look-at-posts-without-logging-in/) [excerpt]. Accounts that set logged-out visibility are hidden on Bluesky's own surfaces (docs above).

#### Mastodon (typical instance terms; mastodon.social used as the example)
- (1) Terms: The mastodon.social terms page is JavaScript-rendered, so the text was fetched through the instance API. The operator is Mastodon GmbH, and the effective date is 2026-08-31.
  - Sections: definitions, scope, liability, content management, ownership, your licence to us, licence termination on deletion, disputes, data processing, general.
  - The licence to Mastodon covers only operating and maintaining the Service. The terms note that third parties can reach content through RSS, embeds and search indexes.
  - There is no clause on scraping, bots, archiving or AI training.
  - Sources: [mastodon.social ToS via API](https://mastodon.social/api/v1/instance/terms_of_service) [fetched]; [mastodon.social ToS page](https://mastodon.social/terms-of-service) [unfetchable: empty JS shell]
- (1) 2025 history: The June 2025 mastodon.social terms (effective July 1, 2025) banned scraping for unauthorized purposes, including archiving and LLM training, and applied only to that server. — [TechCrunch, June 17 2025](https://techcrunch.com/2025/06/17/mastodon-updates-its-terms-to-prohibit-ai-model-training/); [The Register, June 18 2025](https://www.theregister.com/2025/06/18/mastodon_says_no_to_ai/) [excerpts]. A Fediverse Report item says those terms were retracted after community criticism. — [SocialHub: Fediverse Report #122](https://socialhub.activitypub.rocks/t/fediverse-report-122fediverse-report-is-now-connected/5389) [excerpt, undated]
- (2) Download feature: not verified (see Gaps).
- (3) Own-data export: Settings > Import and export > Export lets you request an archive of posts and media in ActivityStreams 2.0 JSON, once every 7 days. CSV exports cover follows, lists, blocks, mutes and blocked domains. — [Mastodon docs: Moving or leaving accounts](https://docs.joinmastodon.org/user/moving/) [fetched]
- (4) API: not researched (see Gaps).
- (5) Login: depends on the instance; not verified (see Gaps).

#### Imgur
- (1) ToS: imgur.com could not be fetched, so the OTA copy was used. It says *Effective May 15, 2023* (version 3.5, 05/03/2022) and may be out of date.
  - USE OF IMGUR CONTENT: downloading or copying user content gives you no rights in it. Personal, non-commercial use is allowed, as is fair use with attribution to Imgur, but non-journalistic commercial use is not.
  - Stuff not to do: no using Imgur as an image host for hotlinking from websites, ads or avatars.
  - Scraping and automated access are not addressed in this copy.
  - Sources: [Imgur Terms (official)](https://imgur.com/tos) [unfetchable]; [OTA copy](https://raw.githubusercontent.com/OpenTermsArchive/contrib-versions/main/Imgur/Terms%20of%20Service.md) [fetched]
- (2) Download feature: not verified (see Gaps).
- (3) Own-data export: none found (see Gaps).
- (4) API: A mirror of the docs gives about 12,500 requests or 1,250 uploads per day per application. Commercial use reportedly requires registering the app plus RapidAPI. — [public-api.org mirror](https://public-api.org/de/api/1030/imgur) [3rd-party, unverified]
- (5) Login and availability: login not verified. Imgur has blocked UK users since Sept 30, 2025, after the ICO raised concerns about children's data. — [Wikipedia: Imgur](https://en.wikipedia.org/wiki/Imgur) [excerpt, secondary]

#### GIPHY
- (1) ToS: The User Terms page returned HTTP 403, so excerpts were used. Content found on GIPHY may be used only in connection with the Services and only for personal, non-commercial purposes. Copying, distributing or commercially exploiting site content is barred, except public-domain or permitted material. — [GIPHY User Terms of Service](https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-User-Terms-of-Service) [unfetchable; excerpt; date not visible]. A university guide describes the user licence as limited to embedding or linking. — [University of Newcastle GIF guide](https://www.newcastle.edu.au/__data/assets/pdf_file/0004/875992/Suggested-GIF-sites.pdf) [3rd-party]. The Community Guidelines have been in effect since 2/01/26. — [GIPHY Community Guidelines](https://support.giphy.com/hc/en-us/articles/360020286811-GIPHY-Community-Guidelines) [excerpt]
- (2) Download feature: In a Nov 2, 2026 test, the website's Download button asked the tester to sign in, and previews may be MP4 or WebP files. — [itigic guide](https://itigic.com/?p=82311) [3rd-party, single observation]
- (3) Own-data export: none found (see Gaps).
- (4) API: The separate API Terms bar building a database or index of GIFs or stickers and require attribution. — [GIPHY API Terms](https://support.giphy.com/hc/en-us/articles/360028134111-GIPHY-API-Terms-of-Service) [excerpt]. Beta keys are free but limited to 100 calls/hour; a production key requires an application and a fee, with custom pricing. — [GIPHY beta key](https://support.giphy.com/hc/en-us/articles/360035527611-What-is-the-beta-key-What-can-I-do-with-the-beta-key); [GIPHY API fee](https://support.giphy.com/hc/en-us/articles/10389869671322-Is-there-a-fee-for-using-GIPHY-s-API) [excerpts]. The rendition guide recommends MP4 or WebP rather than GIF. — [GIPHY rendition guide](https://developers.giphy.com/docs/optional-settings/rendition-guide/) [excerpt]
- (5) Login: viewing not verified. Downloading may require sign-in (see (2)).

#### Tenor
- (1) Terms: The Tenor Additional Terms were last updated March 3, 2021, and the Google Terms also apply. Users, including API users, may view, share and modify content. Section 2.1 bars commercial use or use for third parties' benefit. Section 2.3 lists scraping content that doesn't belong to you as conduct that can lead to restriction. — [Tenor legal terms](https://tenor.com/legal-terms) [fetched]
- (2) Download feature: tenor.com search remains available; a download option was not verified (see Gaps).
- (3) Own-data export: not applicable or not found.
- (4) API: Google stopped issuing API keys and accepting new integrations on Jan 13, 2026, and discontinued the Tenor API on June 30, 2026. Existing integrations stop working on July 1. Google's own surfaces continue: Gboard, Google Messages and Chat, the GIF Keyboard apps and tenor.com. — [9to5Google, June 30 2026](https://9to5google.com/2026/06/30/google-tenor-api-gif-updates/) [fetched]; [AlternativeTo](https://alternativeto.net/news/2026/7/google-discontinues-tenor-gif-api-for-developers-impacting-discord-x-whatsapp-and-bluesky/) [excerpt]. 9to5Google cites a Google support notice. — [Tenor Help 10455265](https://support.google.com/tenor/answer/10455265) [not fetched]
- (5) Login: not verified.

#### Flickr
- (1) ToS: The Terms & Conditions of Use (Flickr, Inc., owned by SmugMug) were last revised July 24, 2025.
  - Section 1.4 (Restrictions): no collecting or copying Flickr Materials, no commercial use, no scraping, data mining or robots, and no downloading Flickr Materials except User Content that has been made available for download. Any other use needs written permission from SmugMug and the content owner.
  - Section 1.6: users keep their IP.
  - Section 1.10: public content can be accessed, downloaded, indexed and republished by others.
  - Source: [Flickr Terms](https://www.flickr.com/help/terms) [fetched]
- (2) Download feature: Owners control downloads with *Who can download your images (including originals)?* under Privacy & Permissions. Since May 15, 2025, free accounts cannot offer original or large (over 1024px) downloads, while Pro accounts can allow originals. Creative Commons photos (unless private) and Flickr Commons content are exempt. — [Flickr Help: Download permissions](https://www.flickrhelp.com/hc/en-us/articles/4404079715220-Download-permissions) [excerpt]; [Flickr blog, Apr 15 2025 (updated May 16)](https://blog.flickr.net/en/2025/04/15/service-update-original-large-size-download-limitations-on-free-accounts/) [fetched]
- (3) Own-data export: Users can request all their content, including originals, through the Flickr Data section of account settings. — [Flickr blog (above)](https://blog.flickr.net/en/2025/04/15/service-update-original-large-size-download-limitations-on-free-accounts/) [fetched]; [Flickr Help: Downloading content](https://www.flickrhelp.com/hc/en-us/articles/4404079675156-Downloading-content-from-Flickr) [excerpt]
- (4) API: The Flickr APIs Terms of Use were last updated May 9, 2018.
  - There are non-commercial and commercial keys; commercial keys are reviewed and may carry fees.
  - Apps must honour owner licences, including all-rights-reserved and Creative Commons terms.
  - Privacy changes must be reflected promptly, and content an owner asks to remove must go within 24 hours.
  - Content may be cached only for reasonable periods, at most 30 photos may be shown per page, and apps may not replicate Flickr.
  - Sources: [Flickr API Terms](https://www.flickr.com/services/api/tos/) [fetched]. photos.getInfo returns a per-photo licence attribute and needs only an api_key. — [flickr.photos.getInfo](https://www.flickr.com/services/api/flickr.photos.getInfo.html) [fetched]. One blog claims only Pro accounts could create API keys from 2025. — [cantoni.org, Dec 2025](https://www.cantoni.org/2025/12/12/downsizing-flickr-library-free-tier/) [3rd-party, unverified]
- (5) Login: The help excerpt describes viewing originals through a logged-in web flow; otherwise not verified.

#### Telegram (public channels)
- (1) ToS: The Terms of Service show no date. They state that Telegram prohibits data scraping under its Content Licensing and AI Scraping Terms, which apply to all users, businesses and third-party services. — [Telegram ToS](https://telegram.org/tos) [fetched]
- (1) Content Licensing terms:
  - Access to user content in public and private chats is limited to ordinary, intended use of the platform.
  - Scraping, indexing, harvesting, aggregating or using platform data to develop AI or ML is prohibited.
  - Exceptions: third-party clients, bots and Mini Apps may access data strictly needed to operate, under a revocable limited licence; AI uses are allowed only with explicit, continued consent from all relevant users.
  - Copyright conditions set by rights holders apply.
  - Sources: [Telegram Content Licensing terms](https://telegram.org/tos/content-licensing) [fetched]. The terms were added in early Feb 2026. — [Open Terms Archive memo](https://opentermsarchive.org/en/memos/telegram-prohibits-collecting-data-for-ai-use/) [excerpt]. API ToS clause 1.5 separately bars developers from using Telegram data to train AI. — [Telegram API ToS](https://core.telegram.org/api/terms) [fetched]
- (2) Download feature and flag:
  - Channel or group owners can turn on *Restrict Saving Content* (Info > Group/Channel Type), which blocks forwarding, saving and screenshots. — [Telegram blog: Protected Content](https://telegram.org/blog/protected-content-delete-by-date-and-more) [excerpt]
  - In the API, protected groups and channels carry a noforwards flag, bots can mark individual messages noforwards, and clients must disable forwarding, downloads, copying and screenshots for protected content. Groups and channels need no Premium; protecting private chats needs Premium. Forwarding protected messages returns CHAT_FORWARDS_RESTRICTED. — [Telegram API: Content protection](https://core.telegram.org/api/content-protection) [fetched]
- (3) Own-data export: Telegram Desktop > Settings > Advanced > Export Telegram data. It produces either JSON (result.json, with media referenced by relative paths) or HTML (export_results.html). The desktop app is required, and channels and media types must be selected. — [Telegram Data Export Schema](https://core.telegram.org/import-export) [excerpt]; [Telegram blog: Chat Export Tool](https://telegram.org/blog/export-and-more) [excerpt]
- (4) API: The MTProto client API requires your own api_id and disclosure that the app uses the Telegram API; apps may not use Telegram's name or logo. Apps that show channel content must support sponsored messages. Violations get a 10-day cure period before access is discontinued. — [Telegram API ToS](https://core.telegram.org/api/terms) [fetched]
- (5) Login: Public channel posts can be viewed in a browser without an account (t.me/s/<channel>) and are indexed by search engines. — [Telegram: Channels tour](https://telegram.org/tour/channels) [excerpt]

#### VK
- (1) ToS: The main terms could not be retrieved. vk.com is blocked for the fetcher, and vk.ru/terms redirected to m.vk.ru/terms, which served only an outdated-browser notice. As a fallback: VK's developer Standard User Agreement bans automated scripts (bots) that interact with an app without the user. The Platform Rules forbid app functions that let users break the VK Terms of Service. — [VK Standard User Agreement](https://dev.vk.ru/en/user-agreement); [VK Platform Rules](https://dev.vk.ru/en/rules) [excerpts]; [VK Legal information](https://vk.ru/legal) [excerpt: title only]
- (2) Download feature: not verified (see Gaps).
- (3) Own-data export: You request a copy of your data on the data-protection page and confirm with a one-time code. OpenPGP encryption is optional. Preparation takes several days, and the download link is time-limited. Photos are reportedly included, and VK says the feature is still being tested. — [VK data protection](https://vk.ru/data_protection?section=rules); [VK FAQ 18145](https://vk.ru/faq18145) [excerpts]; [Kaspersky guide](https://www.kaspersky.com/blog/how-to-delete-vk/27418) [3rd-party]
- (4) API: Methods such as photos.getAll exist. — [dev.vk.ru photos.getAll](https://dev.vk.ru/en/method/photos.getAll) [excerpt: title only]. Restrictions on downloading media were not verified.
- (5) Login: not verified (see Gaps).

### Inferences
- How the categories were assigned: each platform gets the most permissive route a compliant third-party downloader could rely on.
  - 1: the platform itself offers downloads of others' media to ordinary viewers, without creator gating.
  - 2: the only sanctioned route to media is the user's own export or own-content download.
  - 3: the terms or a per-item licence affirmatively permit downloading public media for some uses.
  - 4: retrieval exists (in-app feature, API or open protocol) but depends on creator flags, subscription, platform approval or instance rules.
  - 5: no sanctioned route for a downloader.
- Classification (exactly one category per platform):

| Platform | Cat. | One-sentence justification | Confidence |
|---|---|---|---|
| TikTok | 4 | TikTok's own Save video works only where the creator's Video downloads setting allows it (never for private or under-16 accounts) and adds a watermark, while ToS s.3.4 bars automated extraction and no official API returns others' video files. | High |
| Instagram | 4 | Only public-account Reels can be downloaded, in-app, and only if the creator has not turned downloads off; ToS s.4.2 bans automated collection, and others' photos, carousels and Stories have no official download. | High |
| Facebook | 2 | The help center allows downloading only reels/videos you posted yourself (plus Download your information) and explicitly not others' videos, and ToS s.3.2 bans automated collection. | High |
| Threads | 2 | Threads terms s.3.1 ban scrapers and even manual extraction, no download feature for others' media was found, and the sanctioned routes are your own posts via the Threads API or Meta's export. | Medium |
| Snapchat | 2 | Snap Terms s.8 prohibit downloading or archiving except through intended functionality and ban automated means, leaving My Data/Memories export as the clearly authorized route. | Medium-high |
| X/Twitter | 4 | Video download is an in-product feature limited to paying subscribers and to posts whose uploader left the per-post toggle on, while the ToS bans scraping (liquidated damages US$15,000 per 1M posts) and the API is metered pay-per-use. | High |
| Pinterest | 1 | Pinterest's own Download image option works for any image Pin and creators cannot disable it (video Pins excluded), though ToS s.2(a) still bans automated copying, so official support means the user-initiated button, not bulk tooling. | Medium-high |
| Reddit | 4 | Reddit allows only robots.txt-compliant crawling, prohibits scraping without written consent, and has required approval for API access since Nov 2025, so retrieval is possible only with Reddit's permission. | High |
| Tumblr | 4 | Tumblr's download licence covers only use of the service, automated access is allowed only through published interfaces, and the API agreement forbids archiving and caching beyond three days. | Medium |
| LinkedIn | 5 | LinkedIn's User Agreement s.8.2 bans scraping tools and copying content without the owner's consent and LinkedIn sues scrapers; apart from in-app PDF document downloads there is no sanctioned media route for others' content. | Medium-high (borderline 2, since own-data export exists) |
| Bluesky | 4 | Public posts and blobs are technically retrievable through open AT Protocol endpoints and the ToS is silent, but it grants no reuse licence and users can set a logged-out-visibility label that apps are asked to honour. | Medium (borderline 3) |
| Mastodon | 4 | Public media is reachable through federation and APIs, but permission depends on each instance's terms (mastodon.social banned archiving and AI scraping in 2025; its 2026 text is silent), and authors keep their rights. | Medium |
| Imgur | 3 | Imgur's terms expressly allow personal, non-commercial and fair-use use of downloaded user content while barring non-journalistic commercial use (based on a 2023 terms copy; UK access blocked). | Medium |
| GIPHY | 4 | GIPHY content may be used only in connection with the service for personal, non-commercial purposes, and API use needs a key and attribution and forbids database-building, so downloads are possible but conditioned. | Medium |
| Tenor | 5 | Google discontinued the Tenor API on June 30, 2026, and Tenor's terms bar commercial use and scraping others' content, leaving no sanctioned third-party download route. | Medium-high |
| Flickr | 3 | Owners can enable downloads and attach machine-readable licences (CC/public domain), and the API terms allow retrieval if those licences are honoured, though ToS s.1.4 bars downloading anything not made available and free-account originals have been capped since May 2025. | High |
| Telegram | 4 | Official apps let users save public-channel media unless the owner enabled Restrict Saving Content (noforwards in the API), and the 2026 terms prohibit scraping or aggregation beyond ordinary use. | High |
| VK | 2 | The only route verified this session is VK's own data-archive request (still in testing), the main terms could not be retrieved, and the developer rules ban bots, so others' media should not be treated as authorized. | Low |

- A platform-provided download is not the same thing as permission for a third-party tool. TikTok, Instagram, X, Facebook, Pinterest, LinkedIn and Telegram all offer their feature inside the first-party app or site (often watermarked, tier-gated or flag-gated), and their ToS separately ban automated or scripted access. A compliant downloader should hand off to, or deep-link into, the native feature rather than copy it. This is inferred from the ToS clauses and help pages above.
- Even in categories 1 and 3, copyright stays with the creator. Pinterest's download button and Imgur's personal-use clause do not license commercial reuse, and Flickr requires honouring each photo's licence.
- For category 2 platforms, the compliant product pattern is to help users request and parse their official export (Meta DYI, Snapchat My Data, VK archive) rather than fetch from live pages.

### Gaps
- Login requirement for viewing public media was not verified for TikTok, Facebook, Threads, Pinterest, Reddit, Tumblr, LinkedIn, Mastodon instances, Imgur, Tenor, Flickr (non-original sizes) or VK. My unverified background expectation: TikTok, Reddit, Pinterest, Tumblr and Threads show public posts logged out with prompts; LinkedIn and Facebook use auth walls; Mastodon depends on the instance.
- Pages that could not be fetched, and the fallbacks used:
  - Instagram Terms and Mastodon ToS pages: JavaScript-rendered, empty. Used the OTA copy and the instance API.
  - X ToS: HTTP 402. Used the OTA copy.
  - X Help and GIPHY: HTTP 403. Used excerpts.
  - Reddit, Imgur, VK: blocked domains. Used OTA copies or excerpts.
  - Reddit Responsible Builder Policy: HTTP 403. Used excerpts and a mirror.
  - TikTok support: JavaScript-rendered. Used an excerpt.
  - Bluesky rate-limits page: empty.
  - Tumblr and Pinterest help URLs: 404. Used third-party guides or excerpts.
  - The VK main terms could not be retrieved through any route.
- OTA copies are mirrors, not the live pages; the Imgur copy (2023) may be stale. GIPHY's User Terms date is unknown.
- Not researched: LinkedIn APIs (including any EU data-portability API), Meta Content Library, the Mastodon REST API, Bluesky AppView rate limits, the Telegram Bot API, VK video API rules, and the Reddit Data API's current free-tier limits and pricing.
- Whether these official exports contain actual media files was not confirmed: TikTok, X, Pinterest, LinkedIn, Reddit and Snapchat My Data.
- Imgur download button, Tenor website download option, Threads download features, Mastodon UI download: not verified.

## Key question 1: Which platforms explicitly prohibit downloading other than through platform-provided features?

### Takeaway
Only Snapchat and Flickr explicitly confine downloading to what the service provides or what owners make available. TikTok, X, Pinterest, Reddit, Tumblr, LinkedIn, Threads, Telegram and GIPHY reach the same result in practice through bans on automated access, scraping or copying, or through narrow use licences. Instagram and Facebook ban automated collection, and Facebook's help center separately says others' videos cannot be downloaded. Bluesky, the current mastodon.social terms and the 2023 Imgur terms copy do not prohibit downloading.

### Cited Findings
- **Snapchat:** Section 8 prohibits copying, archiving, downloading or distributing content except temporary caching, uses the Terms expressly allow, or the Service's intended functionality. It also bans automated and semi-automated means. — [Snap Terms](https://snap.com/en-US/terms) [fetched]
- **Flickr:** Section 1.4 prohibits downloading Flickr Materials except User Content that has been made available for download, and prohibits scraping and robots. — [Flickr Terms](https://www.flickr.com/help/terms) [fetched]
- **TikTok:** Section 3.4 bans automated extraction of any content without written approval. Section 3.5 ties other users' licence to download to the poster's settings. — [TikTok ToS](https://www.tiktok.com/legal/page/us/terms-of-service/en) [fetched]
- **X:** Section 4 requires access only through published interfaces and bans crawling or scraping without written consent. Section 5 sets liquidated damages above 1M posts in 24 hours. — [OTA copy of X ToS](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/X/Terms%20of%20Service.md) [fetched]
- **Pinterest:** Section 2(a) bans scraping, collecting, copying or accessing content in unauthorized ways, including automated means without permission. — [Pinterest ToS](https://policy.pinterest.com/en/terms-of-service) [fetched]
- **Reddit:** Section 7 bars collecting data by any means, automated or manual, unless permitted. Only robots.txt-compliant crawling is allowed, and scraping needs written consent. — [OTA copy of Reddit UA](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Reddit/Terms%20of%20Service.md) [fetched]
- **Tumblr:** Section 3 allows automated access only through published interfaces or robots.txt and bans scraping Content. Section 6 licenses downloading only for using the Services. — [Tumblr ToS](https://www.tumblr.com/policy/en/terms-of-service) [fetched]
- **LinkedIn:** Section 8.2 bans scraping or copying tools, including browser add-ons, and bans copying or distributing content without the owner's consent. — [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement) [fetched]
- **Threads:** Section 3.1(iv) bans automatic devices and manual processes for collecting or extracting data. — [OTA copy of Threads Terms](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Threads/Terms%20of%20Service.md) [fetched]
- **Instagram and Facebook:** Instagram Section 4.2 and Facebook Section 3.2 ban automated collection without permission. — [OTA copy of Instagram Terms](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Instagram/Terms%20of%20Service.md); [Facebook Terms](https://www.facebook.com/terms.php) [fetched]. Facebook's help center states that reels or videos created by others cannot be downloaded. — [Facebook Help (app)](https://www.facebook.com/help/android-app/1005944300373812) [fetched]
- **Telegram:** Content access is limited to ordinary, intended use, and scraping, indexing, harvesting and aggregation are prohibited (with client and bot exceptions). — [Telegram Content Licensing terms](https://telegram.org/tos/content-licensing) [fetched]
- **GIPHY:** Content may be used only in connection with the Services for personal, non-commercial purposes, and copying or distribution outside that is barred. — [GIPHY User Terms](https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-User-Terms-of-Service) [excerpt]
- **Tenor:** The terms bar commercial use and flag scraping content that isn't yours. — [Tenor legal terms](https://tenor.com/legal-terms) [fetched]
- **No prohibition found:**
  - Bluesky's ToS is silent on scraping and downloading. — [Bluesky ToS](https://bsky.social/about/support/tos) [fetched]
  - The current mastodon.social terms are silent. — [mastodon.social ToS via API](https://mastodon.social/api/v1/instance/terms_of_service) [fetched]
  - The Imgur terms copy affirmatively allows personal, non-commercial use of downloaded content. — [OTA copy of Imgur terms](https://raw.githubusercontent.com/OpenTermsArchive/contrib-versions/main/Imgur/Terms%20of%20Service.md) [fetched]

### Inferences
- Snapchat's carve-out for intended functionality and Flickr's carve-out for content made available for download are the closest to the key question's wording (downloading only through platform-provided features). For a downloader, Snapchat is the clearest contractual no.
- Silence (Bluesky, mastodon.social) is not authorization. Neither grants third parties a licence to the content, so copyright still governs reuse.
- The X liquidated-damages clause makes bulk retrieval financially risky: 1M+ posts a day triggers US$15,000 per million.

### Gaps
- The VK main terms could not be checked.
- GIPHY's full terms text and date could not be read directly.
- Whether Instagram's terms restrict non-automated downloading (for example manual saving) was not found in the OTA copy.

## Key question 2: Which platforms offer creator-controlled download permission flags, and are those flags exposed in public page data or APIs?

### Takeaway
Creator or owner download controls exist on TikTok, Instagram (Reels), X (video, per post), Flickr (account-level, plus per-photo licences) and Telegram (per channel or group). Bluesky has an adjacent logged-out-visibility label. Only Telegram's flag (noforwards) is clearly readable in an official API. X documents allow_download_status as write-side media metadata. Flickr exposes per-photo licence IDs, not the download setting. No official API exposure was found for TikTok's or Instagram's flags, and TikTok's public page JSON field names could not be verified.

### Cited Findings
- **TikTok:** An account-level *Video downloads* toggle, forced off for private and under-16 accounts. — [TikTok Support](https://support.tiktok.com/en/account-and-privacy/account-privacy-settings/video-downloads) [excerpt]. The Display API overview lists no download-permission field. — [TikTok Display API](https://developers.tiktok.com/doc/display-api-overview) [fetched]. Searches for the field names a downloader would look for (downloadSetting, video_control.allow_download, prevent_download_type) found no documentation, official or unofficial.
- **Instagram:** An account-level *Allow people to download your reels* toggle and a per-reel *Turn off downloading*; private accounts' reels are never downloadable. — [Instagram Help](https://help.instagram.com/iphone-app/520831036611383) [excerpt]. No Graph API field for this was found.
- **X:** The per-post *Allow video to be downloaded* toggle is set while composing and cannot be changed later. — [X Help: videos](https://help.x.com/en/using-x/x-videos) [excerpt]. In the API, allow_download_status (allow_download: boolean) is accepted by POST /2/media/metadata. — [X API: Create media metadata](https://docs.x.com/x-api/media/create-media-metadata) [excerpt]; [AllowDownloadStatus schema](https://docs.x.com/xdks/typescript/reference/interfaces/Schemas.AllowDownloadStatus) [excerpt]. The media-object docs' sample media.fields do not include it. — [X media object](https://developer.x.com/en/docs/x-api/data-dictionary/object-model/media) [excerpt]
- **Flickr:** The owner setting covers who can download images, including originals, and free accounts are capped at 1024px. — [Flickr Help: Download permissions](https://www.flickrhelp.com/hc/en-us/articles/4404079715220-Download-permissions) [excerpt]. The API returns a licence attribute per photo; the documented photos.getInfo example shows no candownload/usage element. — [flickr.photos.getInfo](https://www.flickr.com/services/api/flickr.photos.getInfo.html) [fetched]
- **Telegram:** *Restrict Saving Content* appears as noforwards on chat and channel objects and on bot-sent messages and stories, and clients must disable downloads. — [Telegram API: Content protection](https://core.telegram.org/api/content-protection) [fetched]
- **Bluesky:** The *Logged-out visibility* setting appears as a public !no-unauthenticated self-label that apps are asked to honour; it is not a download flag. — [Bluesky docs: visibility preferences](https://bsky.network/docs/about-bluesky-content/visibility-preferences/) [excerpt]
- **No creator flag:**
  - Pinterest creators cannot block image downloads. — [Pinterest Help](https://help.pinterest.com/en/article/download-an-image) [fetched]
  - LinkedIn document downloads are on by default, and no author opt-out was found. — [LinkedIn Help 97459](https://www.linkedin.com/help/linkedin/answer/97459) [excerpt]
  - Facebook allows only your own downloads, so there is no flag for others' content. — [Facebook Help (app)](https://www.facebook.com/help/android-app/1005944300373812) [fetched]

### Inferences
- A compliance-first downloader can programmatically verify a creator's permission through an official API only for Telegram, by reading noforwards. Flickr's licence ID is a partial substitute.
- For TikTok, Instagram and X, the official place where the creator flag is enforced is the platform's own app. Relying on unofficial page JSON flags would itself mean scraping those platforms, which their ToS forbid. The safe pattern is to defer to the native Save/Download control.
- An X download toggle set to allowed still does not authorize non-subscribers or third-party tools; the help center frames downloading as a subscriber feature.

### Gaps
- TikTok web or app JSON field names for the download setting could not be verified from any source.
- Whether X API v2 reads return allow_download_status on media objects is unconfirmed.
- Whether Flickr's API exposes the owner's download permission (for example a usage/candownload element) is unconfirmed.
- No Instagram API field for Reels download permission was found.

## Key question 3: Which official export routes exist for user-owned media, and what formats do they deliver?

### Takeaway
Every platform except Imgur, GIPHY and Tenor has a documented own-data route. The exports that most clearly include media are Meta's Download your information (HTML/JSON with a chosen media quality), Snapchat My Data/Memories (zip with HTML/JSON), Mastodon (ActivityStreams JSON archive of posts and media), Telegram Desktop (JSON/HTML with media folders), Flickr (originals) and Tumblr (ZIP with a media folder). Bluesky's CAR export excludes blobs. TikTok's and Reddit's exports reportedly contain data and links rather than media files.

### Cited Findings

| Platform | Route (menu path / URL) | Format and media inclusion | Source |
|---|---|---|---|
| Facebook / Instagram (and likely Threads) | Accounts Center > Your information and permissions > Download your information | HTML or JSON; selectable media quality; FB+IG together since Oct 2023 | [Instagram Help](https://help.instagram.com/ipad-app/181231772500920) [excerpt]; [Meta Newsroom 2023](https://about.fb.com/news/2023/10/manage-your-information-across-apps/) [excerpt]; [Facebook Help 212802592074644](https://www.facebook.com/help/212802592074644) [excerpt] |
| Facebook (own reels) | App: Profile > Reels > Options > Download reel | Video to the device gallery; audio may be muted | [Facebook Help (app)](https://www.facebook.com/help/android-app/1005944300373812) [fetched] |
| X | Settings and privacy > Your account > Download an archive of your data | .zip of HTML + JSON with a *Your archive* viewer; prepared in a few days | [X Help 20170320](https://help.x.com/articles/20170320) [excerpt] |
| TikTok | In-app Download your data (path not verified); Data Portability API for apps | TXT or JSON; video files reportedly not included; the API returns a zip | [PIRG](https://pirg.org/edfund/resources/how-to-request-and-download-tiktok-data/) [3rd-party]; [TikTok DPA download](https://developers.tiktok.com/docs/en/data-portability-api-download) [fetched] |
| Snapchat | Profile > Settings > My Data (or accounts.snapchat.com) > Memories + HTML/JSON > All Time > Submit | .zip by email; in-app Memories export in batches of 100; 5GB free storage cap | [TechCrunch, Oct 3 2025](https://techcrunch.com/2025/10/03/snapchat-is-planning-to-charge-for-storage-heres-how-to-save-your-memories-for-free) [fetched] |
| Reddit | reddit.com/settings/data-request | ZIP of CSVs; media reportedly excluded | [Takeout Day](https://takeoutday.org/guides/how-to-export-reddit-data) [3rd-party] |
| LinkedIn | Me > Settings & Privacy > Data privacy > Get a copy of your data | Emailed archive (full or partial), about 24 hours; format not verified | [LinkedIn Help 50191](https://www.linkedin.com/help/linkedin/answer/50191) [excerpt] |
| Pinterest | Settings > Privacy and data > Request your data > Start request | Email link within 48 hours via SendSafely; format not verified | [Pinterest Help](https://help.pinterest.com/en/article/download-your-pinterest-data) [excerpt] |
| Tumblr | Blog settings > Export (per blog) | ZIP: posts as HTML plus a media folder; notes and theme dropped | [TNW (2018)](https://thenextweb.com/news/how-to-save-all-your-tumblr-content) [3rd-party] |
| Bluesky | Settings > Account > Export my data | CAR repository file; blobs (images/video) not included, fetch separately | [atproto.com repo export](https://atproto.com/blog/repo-export) [excerpt] |
| Mastodon | Settings > Import and export > Export | ActivityStreams 2.0 JSON archive of posts and media (once every 7 days); CSV lists | [Mastodon docs](https://docs.joinmastodon.org/user/moving/) [fetched] |
| Flickr | Account settings > Flickr Data | All content including originals | [Flickr blog 2025](https://blog.flickr.net/en/2025/04/15/service-update-original-large-size-download-limitations-on-free-accounts/) [fetched] |
| Telegram | Desktop: Settings > Advanced > Export Telegram data | JSON (result.json + media paths) or HTML; desktop app only | [Telegram export schema](https://core.telegram.org/import-export) [excerpt] |
| VK | Data-protection page > request a copy | Archive with a time-limited link; optional OpenPGP; photos reportedly included; in testing | [VK data protection](https://vk.ru/data_protection?section=rules) [excerpt]; [VK FAQ 18145](https://vk.ru/faq18145) [excerpt] |

### Inferences
- A compliant downloader could offer an import-your-export mode for Meta, X, Snapchat, Mastodon, Telegram, Flickr and Tumblr archives. That uses content the user is authorized to obtain and avoids live-site scraping.
- For Bluesky, rebuilding a complete media backup means calling the official sync/blob endpoints for the user's own repository. That is an authorized, documented step for the user's own account (atproto docs).

### Gaps
- Imgur, GIPHY and Tenor: no export route found.
- Threads-specific export: not verified (likely Accounts Center).
- Whether X, Pinterest and LinkedIn archives contain media files rather than links: not confirmed.
- Retention windows and frequency limits for most exports beyond those noted: not confirmed.

## Key question 4: 2025-2026 changes (new download features, API policy changes, lawsuits against scrapers or downloaders)

### Takeaway
2025-2026 brought tighter access almost everywhere: Reddit API approval, X's metered pay-per-use API, Tenor's API shutdown, Flickr's caps on free-account downloads, and Telegram's and mastodon.social's anti-scraping and anti-AI terms. There were new ToS versions at TikTok (US joint venture), X, Snap, Pinterest, Reddit, Tumblr, Threads and LinkedIn, and anti-scraping lawsuits from Reddit and LinkedIn. The one notable new first-party download feature is Facebook's own-reel download (Sept 2025).

### Cited Findings
- **Download features:**
  - Facebook: since the Sept 2025 video change, all videos are reels and your own reels can be downloaded in the mobile app; others' reels and videos cannot. — [Facebook Help (app)](https://www.facebook.com/help/android-app/1005944300373812) [fetched]
  - Flickr: from May 15, 2025, free accounts' original and large downloads are blocked, with CC and Commons exempt. — [Flickr blog](https://blog.flickr.net/en/2025/04/15/service-update-original-large-size-download-limitations-on-free-accounts/) [fetched]
  - Snapchat: Memories free storage capped at 5GB with paid tiers and a 12-month grace period (announced late Sept 2025). — [TechCrunch, Oct 3 2025](https://techcrunch.com/2025/10/03/snapchat-is-planning-to-charge-for-storage-heres-how-to-save-your-memories-for-free) [fetched]
- **API policy:**
  - X: pay-per-use was tested from Oct 2025, and the docs now show credits-based pricing with a 3M post-read monthly cap. — [TechCrunch, Oct 21 2025](https://techcrunch.com/2025/10/21/x-is-testing-a-pay-per-use-pricing-model-for-its-api); [X API pricing](https://docs.x.com/x-api/getting-started/pricing) [fetched]. A Feb 9, 2026 report covers the launch. — [GIGAZINE](https://gigazine.net/gsc_news/en/20260209-x-api-pay-per-use) [excerpt: title]
  - Reddit: the Responsible Builder Policy (Nov 2025) requires approval for all new API access. — [r/redditdev mirror](https://r.datuan.dev/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/) [3rd-party mirror]
  - Tenor: new keys stopped Jan 13, 2026 and the API was shut down June 30, 2026. — [9to5Google](https://9to5google.com/2026/06/30/google-tenor-api-gif-updates/) [fetched]
  - TikTok Research API: fields added Dec 2025 and coverage changed Feb 2026. — [TikTok changelog](https://developers.tiktok.com/docs/en/changelog) [excerpt]
  - Threads API: media-type filtering added Sep 9, 2025. — [Threads changelog](https://developers.facebook.com/docs/threads/changelog) [excerpt]
- **Terms changes:**
  - Telegram: Content Licensing and AI Scraping Terms added in early Feb 2026. — [OTA memo](https://opentermsarchive.org/en/memos/telegram-prohibits-collecting-data-for-ai-use/) [excerpt]
  - mastodon.social: scraping and AI ban effective July 1, 2025 — [TechCrunch](https://techcrunch.com/2025/06/17/mastodon-updates-its-terms-to-prohibit-ai-model-training/) [excerpt] — reportedly retracted; the current 2026-08-31 terms are silent. — [mastodon.social ToS via API](https://mastodon.social/api/v1/instance/terms_of_service) [fetched]
  - X: revision effective Jan 15, 2026 (AI content) per reporting — [crypto.news](https://crypto.news/x-expands-content-to-ai-prompts-outputs-in-2026-terms-update/) [excerpt]; current version effective Oct 9, 2026. — [OTA copy](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/X/Terms%20of%20Service.md) [fetched]
  - Other new versions:
    - TikTok US: July 15, 2026, TikTok USDS Joint Venture LLC. — [TikTok ToS](https://www.tiktok.com/legal/page/us/terms-of-service/en) [fetched]
    - Snap: Sept 21, 2026. — [Snap Terms](https://snap.com/en-US/terms) [fetched]
    - Pinterest: Nov 12, 2026. — [Pinterest ToS](https://policy.pinterest.com/en/terms-of-service) [fetched]
    - Reddit: July 1, 2026. — [OTA copy](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Reddit/Terms%20of%20Service.md) [fetched]
    - Tumblr: Jan 16, 2026. — [Tumblr ToS](https://www.tumblr.com/policy/en/terms-of-service) [fetched]
    - Threads: Jan 21, 2026. — [OTA copy](https://raw.githubusercontent.com/OpenTermsArchive/pga-versions/main/Threads/Terms%20of%20Service.md) [fetched]
    - LinkedIn: Nov 3, 2025. — [LinkedIn UA](https://www.linkedin.com/legal/user-agreement) [fetched]
    - Bluesky: Aug 14, 2025. — [Bluesky ToS](https://bsky.social/about/support/tos) [fetched]
    - Flickr: July 24, 2025. — [Flickr Terms](https://www.flickr.com/help/terms) [fetched]
- **Access restrictions:** Imgur has blocked UK users since Sept 30, 2025. — [Wikipedia: Imgur](https://en.wikipedia.org/wiki/Imgur) [excerpt]
- **Lawsuits:**
  - Reddit v. Perplexity, SerpApi, Oxylabs and AWMProxy (S.D.N.Y., filed Oct 22, 2025) alleges scraping of Reddit content through Google results and includes DMCA anti-circumvention trafficking claims against SerpApi and Oxylabs. An amended complaint was filed Feb 6, 2026. — [Bloomberg, Oct 22 2025](https://www.bloomberg.com/news/articles/2025-10-22/reddit-sues-perplexity-others-over-alleged-data-scraping); [The Register](https://theregister.com/2025/10/22/reddit_sues_perplexity); [CourtListener filing](https://storage.courtlistener.com/recap/gov.uscourts.nysd.651592/gov.uscourts.nysd.651592.55.0.pdf) [excerpts]
  - Reddit v. Anthropic (2025): alleged training on Reddit content in breach of the user agreement. — [TechSpot](https://www.techspot.com/community/topics/reddit-sues-anthropic-for-scraping-website-content-without-consent.292758/) [excerpt]
  - LinkedIn v. ProAPIs (N.D. Cal., No. 3:25-cv-8393, Oct 2025): millions of fake accounts used for scraping, services sold at up to $15k/month. A Dec 8 filing showed the parties exploring early resolution. — [LinkedIn Newsroom](https://news.linkedin.com/2025/linkedin-takes-legal-action-to-defend-member-privacy); [iTnews](https://www.itnews.com.au/news/linkedin-sues-alleged-data-scrapers-that-use-millions-of-fake-site-accounts-620843); [Security Affairs](https://securityaffairs.com/183001/security/linkedin-sues-proapis-for-15k-month-linkedin-data-scraping-scheme.html) [excerpts]
- **Litigation context (pre-2025 or tangential):**
  - X v. Bright Data: in 2024 the district court held breach-of-terms scraping claims preempted by the Copyright Act but let access-related claims proceed. — [Eric Goldman blog, Jan 2025](https://blog.ericgoldman.org/archives/2025/01/catching-up-on-the-heavyweight-scraping-battle-between-x-and-bright-data-guest-blog-post.htm) [excerpt]
  - Meta lost a claim against Bright Data over logged-off scraping in Jan 2024. — [TechCrunch, Jan 24 2024](https://techcrunch.com/2024/01/24/court-rules-in-favor-of-a-web-scraper-bright-data-which-meta-had-used-and-then-sued) [excerpt]
  - X v. CCDH was argued in the Ninth Circuit on Sept 30, 2026, per the Knight Institute. — [Knight Institute](https://knightcolumbia.org/litigation/x-corp-v-center-for-countering-digital-hate) [excerpt]

### Inferences
- Legal risk for scraping-based downloaders rose in 2025-26. Reddit's case adds DMCA §1201 trafficking theories against tools that circumvent access controls, which is directly relevant to downloader tools. LinkedIn targets fake-account scraping.
- The courts' treatment of logged-off public scraping (Meta v. Bright Data, X v. Bright Data) remains unsettled, so ToS-based risk varies by platform and jurisdiction. This is not legal advice.
- API routes are shrinking or becoming paid (Tenor gone, X metered, Reddit approval-gated). Official-export and native-feature handoff patterns are therefore the more durable compliance strategy.

### Gaps
- No 2025-26 Meta, TikTok or Snap lawsuit against scrapers or downloaders was found in searches; absence is not confirmed.
- Current status (2026) of Reddit v. Perplexity et al., LinkedIn v. ProAPIs and the X v. Bright Data appeal: not confirmed.
- The exact X API tier-migration dates (legacy Basic/Pro) come from one third-party source.
- Whether mastodon.social's 2025 anti-scraping terms were formally withdrawn, and when, is unconfirmed beyond one Fediverse Report item.
