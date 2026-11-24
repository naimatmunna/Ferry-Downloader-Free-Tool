# Legal and Regulatory Landscape for a Self-Hostable Web Media Downloader (status as of 2026-11-24)

Background research notes for engineers designing compliance features (policy registry, attestation gates, takedown handling, logging/privacy). This is not legal advice. Law differs by jurisdiction and several key questions are still open. Every URL below was accessed on 2026-11-24 ("acc. 2026-11-24"). Each citation is tagged: **fetched** means the page was opened and read; **snippet** means it was confirmed only from search-result summaries, so confidence is lower. **[unverified-current]** marks items that could not be confirmed as still current on 2026-11-24.

---

## Q1. United States: DMCA §1201 anti-circumvention, §512 safe harbors, secondary liability, and the key cases (youtube-dl/GitHub, Yout v. RIAA, Kurbanov, 2024-2026 actions)

### Takeaway
For a YouTube downloader, the main US risk is 17 U.S.C. §1201 (anti-circumvention and anti-trafficking), not ordinary copyright infringement. The only reasoned US ruling found on YouTube's measures is Yout v. RIAA (D. Conn., Sept 30, 2022). It treated YouTube's signature scheme (the "rolling cipher") as an effective technological measure and held that Yout circumvents it. The Second Circuit appeal (No. 22-2760, argued Feb 5, 2024) had no decision in any source found; the last docket activity located is from March 31, 2026. Kurbanov (FLVTO/2conv) ended in a final default judgment of about $83M. The Supreme Court's Cox v. Sony decision (Mar 25, 2026) narrowed contributory infringement, but the RIAA argues that §1201 liability stands independently of it.

### Cited Findings

#### The statute (17 U.S.C. §1201)
- §1201(a)(1)(A) bans circumventing a technological measure that effectively controls access to a copyrighted work. The triennial exemptions from the Librarian of Congress (§1201(a)(1)(C)-(D)) excuse only that act of circumvention. §1201(a)(1)(E) says neither the exemptions nor the rulemaking can be used as a defense under any other provision, including the trafficking bans. — [LII, 17 U.S.C. §1201](https://www.law.cornell.edu/uscode/text/17/1201) (acc. 2026-11-24; fetched)
- §1201(a)(2) bans manufacturing, offering to the public, providing, or otherwise trafficking in any technology, product, service, or component that meets any one of three tests:
  - it is primarily designed to circumvent;
  - it has only limited commercially significant purpose other than circumvention; or
  - it is marketed for circumvention.
  §1201(b) applies the same three-part test to tools that circumvent measures protecting the copyright owner's rights (copy controls). It covers trafficking only, not the act of circumvention. — [LII](https://www.law.cornell.edu/uscode/text/17/1201) (acc. 2026-11-24; fetched)
- Definitions in §1201(a)(3):
  - "Circumvent" means descrambling, decrypting, or otherwise avoiding, bypassing, removing, deactivating, or impairing a measure without the copyright owner's authority.
  - A measure "effectively controls access" if, in its ordinary operation, it requires information, a process, or a treatment authorized by the owner in order to gain access.
  — [LII](https://www.law.cornell.edu/uscode/text/17/1201) (acc. 2026-11-24; fetched)
- §1201(c)(1) says the section does not change the rights, remedies, or defenses to copyright infringement, including fair use. — [LII](https://www.law.cornell.edu/uscode/text/17/1201) (acc. 2026-11-24; fetched)
- The major labels' Sept 2025 amended complaint against Suno says fair use is not a defense to the anti-circumvention provisions. It seeks up to $2,500 per act of circumvention. — [Digital Music News, 2025-09-22](https://www.digitalmusicnews.com/2025/09/22/suno-lawsuit-amended-complaint-labels/) (acc. 2026-11-24; fetched)

#### RIAA notice to GitHub over youtube-dl, and the reinstatement (Oct-Nov 2020)
- After an RIAA notice reported on Oct 23, 2020, GitHub took down youtube-dl. The notice relied on §1201. — [TechCrunch, 2020-10-23](https://techcrunch.com/2020/10/23/the-riaa-is-coming-for-the-youtube-downloaders) (acc. 2026-11-24; snippet)
- The notice claimed that youtube-dl circumvented YouTube's "rolling cipher technology". — [TorrentFreak, 2026-09-29](https://torrentfreak.com/ifpi-wants-open-source-youtube-downloader-yt-dlp-on-eu-piracy-watch-list/) (acc. 2026-11-24; fetched)
- Reports say about 17 other repositories (forks) named in the letter were also disabled. — [EFF Deeplinks, Nov 2020](https://www.eff.org/deeplinks/2020/11/riaa-abuses-dmca-take-down-popular-tool-downloading-online-video) (acc. 2026-11-24; snippet)
- EFF wrote to GitHub on behalf of the maintainers. Its arguments:
  - YouTube's player JavaScript computes a "sig" value that any client able to run JavaScript can compute. youtube-dl simply runs that code as intended.
  - The streams are not DRM-encrypted.
  - Listing URLs of commercial music videos in unit tests, and streaming a few seconds to test, is not infringement.
  — [EFF, 2020-11-17](https://www.eff.org/deeplinks/2020/11/github-reinstates-youtube-dl-after-riaas-abuse-dmca) (acc. 2026-11-24; fetched)
- GitHub reinstated youtube-dl on Nov 16, 2020, concluding that the claims did not establish a §1201 violation. The maintainer had also patched the unit tests that referenced copyrighted videos. — [GitHub Blog, 2020-11-16](https://github.blog/2020-11-16-standing-up-for-developers-youtube-dl-is-back/) (acc. 2026-11-24; fetched)
- At the same time, GitHub announced a new process for §1201 claims and a $1M developer defense fund. The process:
  - technical experts verify the claimed circumvention;
  - lawyers review whether the claim is valid;
  - ambiguous claims are resolved in the developer's favour;
  - the repository owner gets a chance to respond or patch before any takedown.
  — [GitHub Blog, 2020-11-16](https://github.blog/2020-11-16-standing-up-for-developers-youtube-dl-is-back/) (acc. 2026-11-24; fetched)
- GitHub and EFF later filed amicus briefs supporting Yout in the Second Circuit (Feb 2023). — [TorrentFreak, 2025-11-29](https://torrentfreak.com/yout-and-riaa-clash-in-court-over-youtubes-alleged-copyright-barriers/) (acc. 2026-11-24; fetched); [GitHub Blog, 2023-02-13](https://github.blog/2023-02-13-yout-amicus-fighting-for-developers-right-to-innovate/) (acc. 2026-11-24; snippet)

#### Yout LLC v. RIAA (D. Conn. No. 3:20-cv-01602; 2d Cir. No. 22-2760)
- Yout runs a web-based YouTube-to-MP3/MP4 service. In late Oct 2020 it sued the RIAA seeking a declaration that it does not violate §1201. — [complaint PDF via Digital Music News](https://www.digitalmusicnews.com/wp-content/uploads/2020/10/YOUT-LLC-v-RIAA-complaint-201025.pdf) (acc. 2026-11-24; snippet)
- The suit followed RIAA notices to Google that described Yout as circumventing YouTube's "rolling cipher". — [CMU, 2022-10-04](https://completemusicupdate.com/stream-ripper-yout-circumvents-youtubes-technical-protection-measures-court-concludes/) (acc. 2026-11-24; fetched)
- **Sept 30, 2022:** Judge Stefan R. Underhill granted the RIAA's motion to dismiss Yout's declaratory-judgment claim, its §512(f) claim, and its defamation and business-disparagement claims. — [Eric Goldman blog, Oct 2022](https://blog.ericgoldman.org/archives/2022/10/anti-circumvention-takedowns-arent-covered-by-512f-yout-v-riaa.htm) (acc. 2026-11-24; snippet); [Justia, Doc. 61](https://law.justia.com/cases/federal/district-courts/connecticut/ctdce/3:2020cv01602/141714/61/) (acc. 2026-11-24; snippet)
- The court's reasoning on the YouTube measure:
  - YouTube's anti-download measures count as a "technological measure".
  - Yout's own step-by-step manual workaround showed that downloading without a tool is tedious, and YouTube created and maintains that difficulty.
  - A measure can be "effective" even if it can be circumvented; holding otherwise would make the DMCA nonsensical.
  - The statutory examples (scrambling, encryption) are not an exhaustive list.
  - Yout failed to plausibly plead that it does not circumvent.
  — [CMU, 2022-10-04](https://completemusicupdate.com/stream-ripper-yout-circumvents-youtubes-technical-protection-measures-court-concludes/) (acc. 2026-11-24; fetched)
- On §512(f): that provision penalizes misrepresentations of *infringement* only, so takedown notices based on §1201 fall outside it. — [Eric Goldman blog](https://blog.ericgoldman.org/archives/2022/10/anti-circumvention-takedowns-arent-covered-by-512f-yout-v-riaa.htm) (acc. 2026-11-24; snippet)
- The RIAA then sought about $250,000 in attorneys' fees. No outcome was found. — [TorrentFreak](https://torrentfreak.com/?p=226122) (acc. 2026-11-24; snippet)
- **Appeal timeline:**
  - The appeal (No. 22-2760) was docketed on Oct 25, 2022. — [Justia docket](https://dockets.justia.com/docket/circuit-courts/ca2/22-2760) (acc. 2026-11-24; snippet; direct fetch returned 403)
  - The amicus brief from the Copyright Alliance supporting the RIAA was filed in May 2023. — [TorrentFreak, 2025-11-29](https://torrentfreak.com/yout-and-riaa-clash-in-court-over-youtubes-alleged-copyright-barriers/) (acc. 2026-11-24; fetched)
  - Oral argument was set for Feb 5, 2024, with 10 minutes per side. — [Communications Litigation Today](https://communicationslitigationtoday.com/news/2023/12/26/2nd-Circuit-to-Allot-10-Minutes-a-Side-in-Feb-5-Yout-v-RIAA-Oral-Argument-2312220019) (acc. 2026-11-24; snippet)
- **At oral argument** (panel: Judges Carney, Leval, Sullivan):
  - Judge Sullivan said the district court seemed to reverse-engineer its conclusion without discovery or expert evidence, and suggested that input from YouTube could resolve the question.
  - The RIAA argued that intent is not part of the test and that YouTube's "signature mechanism" controls access in its ordinary operation.
  - Per TorrentFreak's account, RIAA counsel conceded that individual downloads may be exempt, while arguing that mass downloading is circumvention.
  — [TorrentFreak, 2024-02-09](https://torrentfreak.com/appeals-court-hears-riaa-and-yout-in-high-stakes-streamripper-case-240209/) (acc. 2026-11-24; fetched)
- **Oct-Nov 2025 briefing:**
  - Suno and Udio, which the labels themselves accuse of stream ripping, filed an amicus brief. They argue the district court blurred access controls and copy controls.
  - Yout argues YouTube has no access control at all, because videos are viewable without a password, encryption, or decryption. It relies on *Emmerich Newspapers v. Particle Media* (July 2025), which found no DMCA violation where a server voluntarily sent the content.
  - The RIAA argues that the cipher controls access to the fixed file, and that YouTube's intent is irrelevant.
  — [TorrentFreak, 2025-11-29](https://torrentfreak.com/yout-and-riaa-clash-in-court-over-youtubes-alleged-copyright-barriers/) (acc. 2026-11-24; fetched); [TorrentFreak, 2025-10-08](https://torrentfreak.com/suno-udio-wade-into-youtube-ripper-circumvention-lawsuit-appeal-251008/) (acc. 2026-11-24; snippet)
- **Mar 25 and Mar 31, 2026:**
  - Yout filed a Rule 28(j) letter citing *Cox v. Sony*.
  - The RIAA replied that Cox concerns common-law contributory liability. §1201 is a separate statutory regime under which a tool with noninfringing uses can still be banned if any trafficking test is met, and the RIAA says Yout meets all three.
  — [TorrentFreak, 2026-04-03](https://torrentfreak.com/yout-com-hopes-supreme-courts-cox-ruling-helps-its-case-riaa-disagrees/) (acc. 2026-11-24; fetched); [CourtListener docket](https://www.courtlistener.com/docket/66697744/yout-llc-v-recording-industry-association-of-america-inc/) (acc. 2026-11-24; snippet); [Digital Music News, 2026-04-13](https://www.digitalmusicnews.com/2026/04/13/yout-v-riaa-cox-decision/) (acc. 2026-11-24; snippet)
- **Status:** the appeal was pending as of Apr 3, 2026. Searches on 2026-11-24 found no Second Circuit decision. **[unverified-current]** — [TorrentFreak, 2026-04-03](https://torrentfreak.com/yout-com-hopes-supreme-courts-cox-ruling-helps-its-case-riaa-disagrees/) (acc. 2026-11-24; fetched)

#### UMG Recordings et al. v. Kurbanov (E.D. Va. No. 1:18-cv-00957; FLVTO.biz / 2conv.com)
- The district court first dismissed the case for lack of personal jurisdiction over the Russian operator (reported 2019). — [TorrentFreak, 2019-05-16](https://torrentfreak.com/aussie-music-industry-wins-first-ever-stream-ripping-site-blocks-190516/) (acc. 2026-11-24; snippet)
- The Fourth Circuit reversed on June 26, 2020. It found jurisdiction because the sites recorded US visitors' IP addresses and earned money from geotargeted ads sold through US ad brokers. — [TorrentFreak, 2020-06-26](https://torrentfreak.com/appeals-court-revives-record-labels-lawsuit-against-youtube-rippers-200626/) (acc. 2026-11-24; snippet); [Finnegan, 2020-10-06](https://www.finnegan.com/en/insights/blogs/incontestable/4th-circuit-finds-jurisdiction-over-foreign-website-operator-who-never-worked-in-or-visited-the-united-states.html) (acc. 2026-11-24; snippet)
- **Default judgment.** Kurbanov walked away from the case and did not hand over evidence, including server logs. The court entered a default (Oct 2021). Magistrate Judge Buchanan made a damages recommendation (Dec 2021), which Judge Claude M. Hilton adopted:
  - $82,922,500 in statutory damages under the Copyright Act and the DMCA, for 1,618 works (about $51,250 per work by arithmetic), plus fees and costs;
  - an injunction to stop circumventing technological measures, not expressly limited to the US.
  The sites had closed to US visitors in 2021. — [TorrentFreak, 2022-02-14](https://torrentfreak.com/?p=215056) (acc. 2026-11-24; fetched)
- **Final.** Kurbanov's Fourth Circuit appeal (No. 23-1774, filed July 26, 2023) was voluntarily dismissed on Aug 8, 2023; counsel cited lack of funds. The judgment of about $83M stands, and the court's order also bars running FLVTO.biz and 2conv.com. — [Justia docket 23-1774](https://dockets.justia.com/docket/circuit-courts/ca4/23-1774) (acc. 2026-11-24; snippet); [TorrentFreak, 2023-08-10](https://torrentfreak.com/youtube-rippers-run-out-of-money-give-up-on-83m-riaa-legal-battle-230810/) (acc. 2026-11-24; snippet)

#### Secondary liability (contributory, inducement)
- **Grokster (2005).** Distributing a product with the object of promoting infringement creates inducement liability. Evidence of that object includes advertising an infringing use or instructing users how to infringe. The Sony "staple article" rule (a product capable of substantial noninfringing use) does not protect against that liability. — [Justia, MGM v. Grokster, 545 U.S. 913](https://supreme.justia.com/cases/federal/us/545/913/) (acc. 2026-11-24; snippet)
- **Cox Communications v. Sony Music Entertainment (No. 24-171).** Cert granted June 30, 2025; argued Dec 1, 2025; decided Mar 25, 2026. The judgment below was reversed and remanded. Justice Thomas wrote for the Court; Justice Sotomayor, joined by Justice Jackson, concurred in the judgment. — [Supreme Court docket](https://www.supremecourt.gov/docket/docketfiles/html/public/24-171.html) (acc. 2026-11-24; fetched)
- **Cox holding, as summarized by law firms:**
  - A provider is contributorily liable only if it induced the infringement, or provided a service tailored to infringement, meaning one lacking substantial or commercially significant noninfringing uses.
  - Knowing about infringement and failing to stop it is not enough.
  - Cox did not induce infringement; the Court noted that Cox discouraged it through its subscriber agreement and through warnings, suspensions, and terminations.
  — [Mayer Brown, 2026-03](https://www.mayerbrown.com/fr/insights/publications/2026/03/supreme-court-significantly-narrows-liability-for-contributory-copyright-infringement) (acc. 2026-11-24; snippet); [Cooley, 2026-03-26](https://www.cooley.com/news/insight/2026/2026-03-26-supreme-court-confirms-limits-on-contributory-liability-for-copyright-infringement) (acc. 2026-11-24; snippet); [AIPLA, 2026-03-25](https://www.aipla.org/detail/news/2026/03/25/supreme-court-issues-unanimous-decision-in-cox-communications--inc.-v.-sony-music-entertainment) (acc. 2026-11-24; snippet)
- **BMG v. Cox (4th Cir., Feb 1, 2018).** Cox lost the §512(a) safe harbor because it did not reasonably implement its repeat-infringer policy; for example, it categorically ignored Rightscorp notices. A "repeat infringer" need not have been adjudicated. Providers keep flexibility in how they design such policies. — [Justia, No. 16-1972](https://law.justia.com/cases/federal/appellate-courts/ca4/16-1972/16-1972-2018-02-01.html) (acc. 2026-11-24; snippet); [Stanford CIS](https://cyberlaw.stanford.edu/blog/2018/02/mixed-result-cox-fourth-circuit) (acc. 2026-11-24; snippet)

#### §512 safe harbors
- To be eligible, a service provider must designate an agent to receive infringement notices, publish the agent's contact details, and file them with the Copyright Office. Filing has been online-only since Dec 2016. — [Copyright Office, DMCA Designated Agent Directory](https://www.copyright.gov/dmca-directory/) (acc. 2026-11-24; fetched)
- A designation costs $6 and expires three years after registration unless it is amended or resubmitted. If it lapses, the provider risks losing §512 protection. — [Copyright Office FAQ](https://www.copyright.gov/dmca-directory/faq.html) (acc. 2026-11-24; fetched)
- Yout shows that the DMCA's notice remedies (§512(f)) do not reach notices based on §1201. — [Eric Goldman blog](https://blog.ericgoldman.org/archives/2022/10/anti-circumvention-takedowns-arent-covered-by-512f-yout-v-riaa.htm) (acc. 2026-11-24; snippet)

#### Other US actions and signals, 2024-2026
- **Suno (Sept 2025).** In their amended complaint (D. Mass., No. 1:24-cv-11611), the labels allege Suno got training recordings by "stream ripping" YouTube, circumventing the rolling cipher. — [Digital Music News, 2025-09-22](https://www.digitalmusicnews.com/2025/09/22/suno-lawsuit-amended-complaint-labels/) (acc. 2026-11-24; fetched)
- **Udio** settled with UMG (Oct 2025) and with WMG (Nov 2025). — [TorrentFreak, 2025-11-29](https://torrentfreak.com/yout-and-riaa-clash-in-court-over-youtubes-alleged-copyright-barriers/) (acc. 2026-11-24; fetched)
- **USTR Notorious Markets.** The 2025 Review was released Mar 3, 2026 and lists 37 online and 32 physical markets. — [USTR press release](https://ustr.gov/about/policy-offices/press-office/press-releases/2026/march/ustr-releases-2025-review-notorious-markets-counterfeiting-and-piracy) (acc. 2026-11-24; fetched)
  - Coverage and the PDF's table of contents indicate Y2Mate and SaveFrom remain listed as music/stream-ripping markets. — [USTR 2025 NML PDF](https://ustr.gov/sites/default/files/files/Press/Releases/2026/2025%20Notorious%20Markets%20List%20(final).pdf) (acc. 2026-11-24; snippet)
  - The RIAA's 2025 nominations named Y2mate, Savefrom, Snaptube, Ssyoutube, Tubidy, and Notube. — [RIAA 2025 USTR submission](https://torrentfreak.com/images/riaa-ustr-25.pdf) (acc. 2026-11-24; snippet)

### Inferences
These are design lessons drawn from the findings above; they are interpretation, not settled law.

- **youtube-dl / GitHub (2020).** The RIAA used test fixtures that named commercial music videos as evidence against the project.
  - Ship test suites, documentation, and examples that use only the project's own or CC/public-domain media.
  - GitHub's process (technical verification of the claimed circumvention, legal review, chance to patch) is a good template for handling §1201-style complaints in a self-hosted project.
  - GitHub's view that running YouTube's JavaScript is not circumvention is one company's policy, not a court holding. A US district court and two German courts have gone the other way.
- **Yout (2022, appeal pending).** "Free to watch" does not mean "no technological measure".
  - At the pleading stage, a US court treated solving YouTube's signature/n-parameter challenge as circumvention of an access control.
  - Until the Second Circuit rules, the policy registry should classify YouTube signature/JavaScript-challenge solving as a TPM-circumvention capability. Gate it: off by default, or limited to sources and contexts where the rightsholder has authorized download.
  - §1201(a)(2) covers offering a circumvention *service*. A publicly reachable hosted instance is therefore more exposed than a single user running the tool for themselves. The RIAA's reported concession about individual downloads is only a remark at oral argument, not a rule.
- **Kurbanov (2019-2023).**
  - Ad-monetized sites that geotarget US visitors create US jurisdiction even for foreign operators.
  - Walking away from a case leads to default judgments with statutory damages per work (about $51k per work here).
  - Server logs were a specific discovery target, so logging decisions have litigation consequences (see Q6).
  - The injunction against circumventing "any" technological measure was not limited to the US.
- **PO tokens (no case law).** Proof-of-Origin tokens are produced by platform attestation systems (BotGuard/DroidGuard/iOSGuard; see Q4). They exist to tell genuine clients from others. Emulating them to get stream URLs looks even more like "avoiding or bypassing" a measure that requires a process or treatment to gain access (§1201(a)(3)) than the cipher does. A tool that refuses anti-bot circumvention should treat PO-token generators and BotGuard emulation as prohibited integrations.
- **Cox (2026) and Grokster (2005).**
  - Cox lowers contributory-infringement risk for a general-purpose tool with real noninfringing uses and anti-infringement practices (terms, warnings, terminations).
  - Grokster still punishes marketing or instructions that promote infringement. UI copy, SEO keywords such as "YouTube to MP3", and docs that showcase commercial music all matter.
  - Neither case removes §1201 trafficking exposure, which turns on design, purpose, and marketing rather than knowledge.
- **§512.** Safe harbors can limit *infringement* liability for qualifying service providers, so registering and renewing a DMCA agent is cheap insurance. Engineers should not assume §512 protects against §1201 claims. No source found applies §512 to §1201, and Yout keeps §512(f) out of §1201 disputes.

### Gaps
- **Second Circuit decision in Yout v. RIAA.** None found as of 2026-11-24. The latest docket activity located is the Mar 31, 2026 RIAA 28(j) response. The Justia docket page returned HTTP 403, so a ruling between April and November 2026 cannot be ruled out. **[unverified-current]**
- Outcome of the RIAA's motion for about $250,000 in fees in Yout: not found.
- Kurbanov:
  - whether any damages were collected or domains transferred: not found;
  - whether a cert petition followed the 2020 Fourth Circuit ruling: not verified;
  - exact date of the 2019 dismissal: not verified.
- Exact date of the RIAA letter to GitHub, and of EFF's letter: not verified. GitHub's reinstatement post is dated Nov 16, 2020.
- No US court decision found on PO tokens, SABR, or YouTube's 2025 JavaScript challenges specifically.
- No case found deciding whether a URL-to-file converter qualifies as a §512(k) "service provider", or whether any §512 safe harbor applies to §1201 claims.
- No new 2024-2026 US lawsuit filed directly against a stream-ripping *site* was found. The 2024-2026 US activity located is Yout (appeal), Suno/Udio (circumvention claims), and USTR listings.

---

## Q2. Germany and the EU: the Uberspace/youtube-dl case, InfoSoc Art. 6 and Art. 5(2)(b), DSM/DSA relevance, and 2025-2026 blocking activity

### Takeaway
Germany has the most developed appellate ruling. On Nov 21, 2024 (Az. 5 U 54/23), OLG Hamburg held that YouTube's rolling cipher is an effective technical protection measure, that youtube-dl users act in bad faith, and that Uberspace, which hosted the youtube-dl.org website, was liable. Revision was not allowed, and no BGH outcome was found. Under the InfoSoc Directive, TPMs are protected separately from infringement, and the private-copying exception cannot be used to force access to on-demand services offered on contractual terms (Art. 6(4)). CJEU case law limits private copying to lawful sources (ACI Adam 2014) and excludes commercial services that make the copies for users (VCAST 2017). Italy kept blocking stream rippers through Feb 2026, and in Sept 2026 IFPI asked the Commission to put yt-dlp on the EU piracy watch list.

### Cited Findings

#### Uberspace / youtube-dl (LG Hamburg 2023; OLG Hamburg 2024)
- Sony, Universal, and Warner sued Uberspace, the Mainz-based host of the youtube-dl.org website, in Jan 2022. The Gesellschaft für Freiheitsrechte (GFF) supported Uberspace. — [netzpolitik.org tag page](https://netzpolitik.org/tag/uberspace/) (acc. 2026-11-24; fetched); [GFF case page](https://freiheitsrechte.org/en/themen/demokratie/uberspace-youtube-dl-eng) (acc. 2026-11-24; fetched)
- GFF's position: YouTube videos have no digital lock, so there is nothing to circumvent. A neutral host only has to block *manifestly* illegal content. The software itself sat on GitHub; Uberspace only hosted a website linking to it. — [GFF case page](https://freiheitsrechte.org/en/themen/demokratie/uberspace-youtube-dl-eng) (acc. 2026-11-24; fetched)
- **LG Hamburg, Mar 31, 2023.** The court held Uberspace liable for hosting the site and ordered it to stop. Sources disagree on the file number: 310 O 316/21 per LTO, 310 O 317/21 per the GFF appeal brief. — [LTO](https://www.lto.de/recht/hintergruende/h/urheberrecht-youtube-musik-videos-download-haftung-uberspace-youtube-dl) (acc. 2026-11-24; snippet); [GFF appeal brief](https://freiheitsrechte.org/uploads/documents/Demokratie/Uberspace/Berufungsbegruendung-2023-Gesellschaft-fuer-Freiheitsrechte-Uberspace-Demokratie.pdf) (acc. 2026-11-24; snippet)
  - It also held the operator generally liable for damages for downloads by users who got the software through the site.
  - Uberspace complied in Aug 2023 after the plaintiffs posted €20,000 security.
  — [heise, 2024-11-27](https://heise.de/-10179284) (acc. 2026-11-24; fetched)
- **OLG Hamburg, Nov 21, 2024 (Az. 5 U 54/23).** The appeal was rejected. The court's reasoning:
  - The rolling cipher is effective because an average user cannot easily bypass it. The court found Uberspace's Firefox web-developer workaround too complicated for an average user.
  - Other download tools existing does not make the measure ineffective.
  - Archival uses by journalists and activists are irrelevant if the tool is primarily used for circumvention.
  - Users act in "bad faith" (they know, or are grossly negligent in not knowing, that they have no right to the audio file), because downloading through such tools involves instructions and several steps.
  - The host could not escape liability by claiming it was unaware of infringements through the page that linked to the tool. For injunctive relief, objective "disruptive capacity" is regularly enough.
  — [heise, 2024-11-28](https://heise.de/-10181247) (acc. 2026-11-24; fetched)
- **Further appeal.** The OLG did not allow a further appeal (Revision). At the end of Nov 2024, GFF and Uberspace's CEO were considering a Nichtzulassungsbeschwerde (a complaint to the BGH against the denial of leave to appeal). GFF expected little practical effect, since the software is hosted on GitHub. — [heise, 2024-11-27](https://heise.de/-10179284) (acc. 2026-11-24; fetched); [netzpolitik.org, 2024-11-28](https://netzpolitik.org/2024/entscheidung-des-olg-hamburg-youtube-dl-org-bleibt-gesperrt/) (acc. 2026-11-24; snippet); [TorrentFreak, 2024-11-27](https://torrentfreak.com/court-rejects-appeal-of-youtube-dl-hosting-provider-uberspace-241127-1/) (acc. 2026-11-24; snippet)

#### InfoSoc Directive 2001/29/EC
- **Art. 6(1):** Member States must protect against circumventing effective technological measures by someone who knows, or has reasonable grounds to know, that this is what they are doing. — [EUR-Lex, Directive 2001/29/EC](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32001L0029) (acc. 2026-11-24; fetched)
- **Art. 6(2):** Protection also covers making, distributing, advertising, or providing devices, products, components, or *services* that are promoted for circumvention, have only limited commercially significant use other than circumvention, or are primarily designed for it. — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32001L0029) (acc. 2026-11-24; fetched)
- **Art. 6(3):** A technological measure is any technology that, in normal operation, prevents or restricts unauthorized acts. It is "effective" where access or use is controlled through an access-control or protection process (such as encryption or scrambling) or a copy-control mechanism that achieves its protective objective. — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32001L0029) (acc. 2026-11-24; fetched)
- **Art. 6(4):** Member States *may* step in to let beneficiaries of exceptions, including private copying, actually use them. But this does not apply to works made available on demand on agreed contractual terms. — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32001L0029) (acc. 2026-11-24; fetched)
- **Art. 5(2)(b):** an optional exception for private copies by a natural person, for private use and non-commercial ends, with fair compensation that takes account of TPMs. — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32001L0029) (acc. 2026-11-24; fetched)
- **Art. 5(5):** the three-step test, which limits all exceptions. — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32001L0029) (acc. 2026-11-24; fetched)

#### CJEU case law on private copying
- **ACI Adam (C-435/12, Apr 10, 2014).** Private copying does not cover copies made from unlawful sources, and levy systems must distinguish lawful from unlawful sources. Commentators note the judgment does not define "unlawful source". — [Kluwer Copyright Blog](https://legalblogs.wolterskluwer.com/copyright-blog/no-more-downloading-from-unlawful-sources/) (acc. 2026-11-24; snippet); [Columbia Global Freedom of Expression](https://globalfreedomofexpression.columbia.edu/cases/aci-adam-bv-and-others-v-stichting-de-thuiskopie-stichting-onderhandelingen-thuiskopie-vergoeding/) (acc. 2026-11-24; snippet)
- **VCAST (C-265/16, Nov 29, 2017).** A company's cloud service that recorded free-to-air TV for users was *not* covered by private copying. The Court treated the service's own capture and making-available of the broadcasts as a communication to the public that needed authorization, so the copies came from an unauthorized source. — [IRIS/Merlin](https://merlin.obs.coe.int/article/8093) (acc. 2026-11-24; snippet); [Kluwer Copyright Blog](https://legalblogs.wolterskluwer.com/copyright-blog/up-in-the-cloud-some-reflections-on-the-cjeu-judgment-in-vcast/) (acc. 2026-11-24; snippet)

#### Digital Services Act (Regulation (EU) 2022/2065)
- Art. 16 requires every hosting-service provider, of any size, to offer an easy-to-access electronic notice-and-action mechanism for allegedly illegal content. Notices must be precise and substantiated. The provider must decide in a timely way and tell the person who filed the notice. — [Springlex, DSA Art. 16](https://www.springlex.eu/en/packages/dsa/dsa-regulation/article-16/) (acc. 2026-11-24; snippet); [Crowell & Moring](https://www.crowell.com/en/insights/client-alerts/notice-and-action-mechanisms-in-the-dsa-balancing-the-removal-of-illegal-content-and-the-freedom-of-expression) (acc. 2026-11-24; snippet)

#### EU enforcement, 2019-2026
- **Italy, 2019.** AGCOM ordered Yout.com blocked in Feb 2019. The Lazio Regional Administrative Court upheld the block in an interim decision on Aug 2, 2019, citing massive and irreparable infringement (about 10,000 downloads a day). AGCOM had already blocked 12 stream-ripping sites. — [IFPI, 2019-08-02](https://www.ifpi.org/italian-court-confirms-stream-ripping-is-illegal/) (acc. 2026-11-24; fetched)
- **Italy, July 2024.** At the request of FPM (the Italian anti-piracy federation), AGCOM blocked domains of stream-ripping services. Reported targets include y2meta.app, x2mate.com, ytmp3.nu, and yt5s.io (11 domains across six services). FPM says stream ripping is about 30% of online music piracy. — [CMU, 2024-07-26](https://completemusicupdate.com/french-and-italian-record-industries-secure-new-web-blocks/) (acc. 2026-11-24; fetched); [TorrentFreak](https://torrentfreak.com/?p=254926) (acc. 2026-11-24; snippet)
- **Italy, 2025-2026.** AGCOM issued:
  - a precautionary block of conv.mp3youtube.cc (May 2025);
  - a block of bigconv (July 2025);
  - a DNS block of TubeRipper;
  - a block of ytmp3.gg (Feb 19, 2026).
  — [Digital Policy Alert, conv.mp3youtube.cc](https://digitalpolicyalert.org/event/30100-communications-regulatory-authority-issued-precautionary-measure-order-n-6925dda-requiring-blocking-of-stream-ripping-website-convmp3youtubecc) (acc. 2026-11-24; snippet); [Digital Policy Alert, TubeRipper](https://digitalpolicyalert.org/event/30099-italian-communications-regulatory-authority-issued-precautionary-order-n-7225dda-to-disable-access-to-tuberipper) (acc. 2026-11-24; snippet); [Digital Policy Alert, ytmp3](https://digitalpolicyalert.org/event/38833-communications-regulatory-authority-issued-order-blocking-ytmp3-over-copyright-infringement-no-5626dda) (acc. 2026-11-24; snippet)
- **Denmark, Mar 2023.** A court in Næstved ordered nine music piracy sites blocked, on a complaint by Rights Alliance for IFPI, Sony, Universal, and KODA. Eight were YouTube rippers: ytmp3.cc, y2mate.com, yt1s.com, savefrom.net, loader.to, onlinevideoconverter.pro, yt5s.com, and ytmp3.plus.
  - Under a code of conduct, all Danish ISPs follow such orders.
  - Totals at the time: 239 sites plus 1,146 mirror domains blocked.
  - Denmark was the first country to block YouTube rippers, in 2018.
  — [TorrentFreak, 2023-03-16](https://torrentfreak.com/?p=232360) (acc. 2026-11-24; fetched)
- **EU watch list, Sept 2026.** IFPI's submission for the 2027 EU Counterfeit and Piracy Watch List asks that yt-dlp be listed as a stream-ripping service alongside Savefrom.net and two Y2mate sites.
  - It names yt-dlp's founder and current maintainers.
  - It stresses the Unlicense and says the project is hard to contain.
  - It asks for no concrete action.
  — [TorrentFreak, 2026-09-29](https://torrentfreak.com/ifpi-wants-open-source-youtube-downloader-yt-dlp-on-eu-piracy-watch-list/) (acc. 2026-11-24; fetched); [IFPI submission PDF, Sept 2026](https://torrentfreak.com/images/41-IFPI-EU-Counterfeit-and-Piracy-Watchlist-Submission-September-2026-IFPI276823.1.pdf) (acc. 2026-11-24; snippet)

### Inferences
- In Germany, and probably as persuasive authority elsewhere in the EU, solving YouTube's cipher is treated as circumventing an effective TPM. Private copying is unlikely to save users or operators:
  - TPM protection (Art. 6) is separate from the exceptions;
  - Art. 6(4) does not force TPM overrides for on-demand services offered on contractual terms;
  - OLG Hamburg treats users of such tools as acting in bad faith.
- VCAST suggests that a *hosted* service that fetches and stores copies for users is judged on the operator's own acts. It cannot simply borrow its users' private-copying exception. This matters for public instances of a self-hostable app.
- Uberspace shows that liability can reach a *host* of a website that merely links to a circumvention tool, after notice. Project websites, documentation hosts, and anyone who self-hosts a public instance should expect notices. A clear notice-and-action workflow, ideally aligned with DSA Art. 16, reduces exposure.
- Whether a URL-fetching downloader counts as a DSA "hosting service" is unclear. If downloaded files are stored for users to retrieve, a hosting classification is plausible. Building an Art. 16-style notice mechanism is cheap either way.
- Europe's enforcement pattern (AGCOM, Danish orders, IFPI watch-list nominations) targets music-oriented YouTube-to-MP3 services and now the open-source yt-dlp itself. A downloader that wraps yt-dlp for YouTube music should expect to be grouped with these targets.

### Gaps
- Whether Uberspace or GFF filed a Nichtzulassungsbeschwerde (or constitutional complaint), and its outcome: not found. **[unverified-current]**
- LG Hamburg file number: conflicting reports (310 O 316/21 vs 310 O 317/21). The full OLG and LG reasoning on §95a and §53 UrhG (German TPM and private-copy provisions) was not read in the original texts.
- DSM Directive (EU) 2019/790: its text was not retrieved this session. Background knowledge, unverified here: Art. 17 covers user-upload sharing platforms, and the text-and-data-mining exceptions (Arts. 3-4) assume lawful access and keep TPM protection. Its direct relevance to a downloader looks limited, but needs confirmation.
- No CJEU ruling found on YouTube's cipher or on stream ripping specifically.
- No 2025-2026 stream-ripper blocking orders found for Germany (CUII), France, or Spain. Searches were light; Italy and Denmark are well documented.
- Whether the European Commission will include yt-dlp in the 2027 Watch List: pending.

---

## Q3. UK, India, Denmark, Italy, Russia, Australia (plus Canada and Vietnam): blocking orders and cases against Y2Mate, SaveFrom, and stream rippers

### Takeaway
Courts and regulators in many jurisdictions now routinely order ISPs to block stream-ripping sites: Australia (2019), the UK (2021), Denmark (2018 and 2023), Italy (2019-2026), India (2023 and 2025), and Canada (2026). These orders usually rest on ordinary infringement theories (communication to the public, reproduction, joint tortfeasance), not TPM law, and increasingly extend automatically to mirror domains. Before its Oct 2025 shutdown through enforcement in Vietnam, Y2Mate had been blocked in 13 countries. No Russian court action against SaveFrom was found.

### Cited Findings
- **UK, Feb 2021.** In a BPI-backed claim against six major ISPs, Miles J in the High Court ordered blocking of the stream rippers Flvto, 2Conv, Flv2mp3, and H2Converter, the MP3 Studio app provider, and the cyberlocker Nitroflare.
  - He found the operators infringe by communication to the public and as joint tortfeasors with users.
  - The orders were made under CDPA s.97A and Senior Courts Act s.37, and found proportionate.
  — [TorrentFreak, 2021-02-25](https://torrentfreak.com/high-court-orders-uk-isps-to-block-stream-ripping-cyberlocker-sites-210225/) (acc. 2026-11-24; snippet); [SCL](https://www.scl.org/12206-high-court-orders-isps-to-block-streamrippers-and-cyberlockers/) (acc. 2026-11-24; snippet); [National Archives, [2021] EWHC 410 (Ch)](https://caselaw.nationalarchives.gov.uk/ewhc/ch/2021/410) (acc. 2026-11-24; snippet)
- **UK and US, 2021.** Y2mate's main site shut for US and UK users after geo-blocking them. — [Digital Music News](https://www.digitalmusicnews.com/?p=190331) (acc. 2026-11-24; snippet)
- **Australia, May 2019.** Perram J in the Federal Court ordered Telstra, Foxtel, Optus, TPG, and Vodafone to block 2conv, Flv2mp3, Convert2mp3, and Flvto. Music Rights Australia coordinated the case, the first use of Australia's site-blocking law against stream rippers. The published judgment described the sites as responsible for piracy on an "industrial scale". — [TorrentFreak, 2019-05-16](https://torrentfreak.com/aussie-music-industry-wins-first-ever-stream-ripping-site-blocks-190516/) (acc. 2026-11-24; snippet); [TorrentFreak, 2019-06-01](https://torrentfreak.com/youtube-rippers-infringe-copyright-on-industrial-scale-says-judge-190601/) (acc. 2026-11-24; snippet)
- **Denmark.** A Danish court ordered Convert2mp3 blocked in July 2018. — [TorrentFreak, 2019-05-16](https://torrentfreak.com/aussie-music-industry-wins-first-ever-stream-ripping-site-blocks-190516/) (acc. 2026-11-24; snippet) The Mar 2023 Næstved order (y2mate.com, savefrom.net and others) is covered under Q2. — [TorrentFreak, 2023-03-16](https://torrentfreak.com/?p=232360) (acc. 2026-11-24; fetched)
- **Italy.** The 2019 Yout.com block upheld by the Lazio Regional Administrative Court, and AGCOM orders from 2024 to Feb 2026, are covered under Q2. — [IFPI, 2019-08-02](https://www.ifpi.org/italian-court-confirms-stream-ripping-is-illegal/) (acc. 2026-11-24; fetched)
- **India, Jan 12, 2023.** In *Sony Music Entertainment India v. YT1S.com & Ors* (CS(COMM) 13/2023), Justice C. Hari Shankar of the Delhi High Court granted an interim injunction requiring ISPs to block stream-ripping sites (18 defendants; IFPI says 20 sites).
  - The basis was prima facie infringement under India's Copyright Act. The sites were treated as "rogue" (hidden WHOIS, ignoring takedowns).
  - A dynamic extension to mirror domains was sought.
  - No TPM theory was mentioned.
  — [TorrentFreak, 2023-01-20](https://torrentfreak.com/major-labels-obtain-stream-ripping-site-blocking-order-in-india-230120/) (acc. 2026-11-24; fetched)
- **India, Nov 10, 2025.** On Saregama's plea, the Delhi High Court held that each act of stream ripping is infringement that deprives the rightsholder of revenue, and directed domain registrars to block the sites. — [LiveLaw](https://www.livelaw.in/high-court/delhi-high-court/delhi-high-court-restrains-websites-enabling-illegal-downloads-of-saregama-indias-copyrighted-music-310306) (acc. 2026-11-24; snippet); [Bar & Bench](https://www.barandbench.com/news/on-saregamas-plea-delhi-high-court-cracks-down-on-websites-offering-copyrighted-music-downloads) (acc. 2026-11-24; snippet)
- **Russia.** No court order against SaveFrom was found.
  - Russia's "perpetual blocking" regime for repeat copyright infringers took effect May 1, 2015; the Moscow City Court issued its first perpetual blocks in Oct 2015. — [Meduza, 2015-10-14](https://meduza.io/news/2015/10/14/mosgorsud-vynes-pervoe-reshenie-o-vechnoy-blokirovke-saytov) (acc. 2026-11-24; snippet)
  - In 2024, SaveFrom's YouTube downloads were reportedly limited to 360p with audio after YouTube technical changes. — [Habr](https://habr.com/en/news/841122) (acc. 2026-11-24; snippet)
  - Russia began throttling YouTube in July 2024. — [Bloomberg, 2024-07-25](https://www.bloomberg.com/news/articles/2024-07-25/youtube-throttled-in-russia-in-latest-attack-on-social-media) (acc. 2026-11-24; snippet)
- **Canada, June 2026.** Justice Fothergill of the Federal Court issued Canada's first stream-ripper blocking order and a permanent injunction, in a case filed in Nov 2025 by Sony, Universal, and Warner against the John Doe operators of copycat Y2Mate, YTMP3, and SaveFrom sites.
  - Nine ISPs (including Bell, Rogers, and TekSavvy) must block y2mate.ws, ytmp3.lat, savefrom.space, and spowload.cc for two years.
  - New domains can be added by affidavit if no ISP objects within 10 business days.
  - The court found infringement because the services' sole function is enabling unauthorized reproduction.
  - Savefrom.net itself already blocks Canadian visitors.
  — [TorrentFreak, 2026-06-16](https://torrentfreak.com/music-labels-win-canadian-site-blocking-order-against-y2mate-ytmp3-and-savefrom/) (acc. 2026-11-24; fetched); [CMU, 2026-06-17](https://completemusicupdate.com/majors-secure-their-first-canadian-web-blocking-order-targeting-stream-rippers-that-threaten-the-foundation-of-canadas-music-marketplace/) (acc. 2026-11-24; snippet)
- **Vietnam, Oct 14, 2025.** IFPI announced that Y2mate and related sites went offline after enforcement in Vietnam.
  - The operator agreed to close them permanently, and most domains are now held by IFPI.
  - The sites had more than 620M visits in the prior year.
  - Y2mate had been subject to web blocks in 13 countries.
  — [CMU, 2025-10-14](https://completemusicupdate.com/legal-action-in-vietnam-takes-stream-ripper-y2mate-offline/) (acc. 2026-11-24; fetched)

### Inferences
- Outside the US, rightsholders seldom need TPM law. Theories such as "sole function is enabling unauthorized reproduction" (Canada), communication to the public and joint tortfeasance (UK), and prima facie infringement by rogue sites (India) are enough to block music-oriented YouTube-to-MP3 services.
- The key risk drivers are therefore the service's *purpose and use profile*: music focus, rogue-site traits such as anonymity and ignoring takedowns, and traffic volume. Whether a particular TPM is technically strong matters less.
- Dynamic and mirror-extension mechanisms (affidavit additions in Canada, dynamic injunctions in India, Denmark's 1,146 mirror domains) mean any public instance that looks like a stream ripper can be added to blocklists quickly.
- A self-hosted, private, non-music-oriented instance is a much less likely target. The upstream project, though, can still be named, as IFPI did with yt-dlp.

### Gaps
- Russia: no court case or blocking order against SaveFrom or other rippers found. The Russian-language search was limited.
- Australia and the UK: no later (post-2021) stream-ripper-specific orders or renewals found. The current status of the 2019 and 2021 orders is **[unverified-current]**.
- The list of the 13 countries that had blocked Y2Mate: not found.
- Full text of the Saregama order (Nov 10, 2025), and whether it names YouTube-to-MP3 sites specifically: not read.

---

## Q4. Platform enforcement trends: YouTube's technical measures (SABR, PO tokens, JS challenges) and legal letters to downloader operators, 2025-2026

### Takeaway
YouTube has steadily hardened its delivery stack. It now requires Proof-of-Origin (PO) tokens from platform attestation (BotGuard, DroidGuard, iOSGuard) for many clients, serves SABR-only formats to the web client, and runs JavaScript challenges that, from Nov 2025, pushed yt-dlp to depend on an external JS runtime (Deno by default). Its Terms of Service (effective Jan 5, 2022) ban downloading unless YouTube enables it, circumventing copy-restriction features, and automated access. No 2025-2026 YouTube legal letters to downloader operators were found. Legal pressure in 2025-2026 came mainly from the music industry.

### Cited Findings
- **PO tokens.** These are parameters YouTube requires from some clients. Without a token, format URLs may return HTTP 403 and the account or IP may be blocked. Per the yt-dlp PO Token Guide (last edited July 12, 2026):
  - Tokens come from BotGuard (web), DroidGuard (Android), and iOSGuard (iOS), and cannot be reused across platforms.
  - Streaming URLs (GVS) require them for clients including web, mweb, tv_simply, web_music, web_creator, android, and ios. The web client also needs them for subtitles.
  - YouTube Premium users are exempt for GVS.
  - Tokens are now bound to video IDs.
  - YouTube is still rolling out enforcement.
  — [yt-dlp wiki, PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide) (acc. 2026-11-24; fetched)
- **SABR and DRM.** The same guide says the web client offers only SABR formats, and the tv client offers SABR-only formats in some cases. All tv-client formats are DRM-protected when no logged-in or guest cookies are passed. — [yt-dlp wiki, PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide) (acc. 2026-11-24; fetched)
- **JavaScript challenges.** yt-dlp 2025.11.12 (Nov 12, 2025) added support for external JS runtimes; Deno is recommended and the only runtime enabled by default.
  - The change was needed to solve YouTube's JS challenges, which a contributor called aggressive changes by YouTube.
  - Without a runtime, YouTube support is "deprecated", formats are limited, and support may stop working entirely.
  — [yt-dlp issue #15012](https://github.com/yt-dlp/yt-dlp/issues/15012) (acc. 2026-11-24; fetched); [OSnews](https://www.osnews.com/story/143423/yt-dlp-will-soon-require-a-full-js-runtime-to-overcome-youtubes-js-challenges/) (acc. 2026-11-24; snippet)
- **YouTube Terms of Service** (effective Jan 5, 2022). Users may not:
  - access, copy, or download content unless the Service expressly allows it, YouTube (and where applicable the rights holders) give prior written permission, or applicable law allows it;
  - circumvent or interfere with security features or features that prevent or restrict copying;
  - access the Service by automated means, except public search engines that follow robots.txt, with permission, or where the law allows.
  — [YouTube Terms of Service](https://www.youtube.com/static?template=terms) (acc. 2026-11-24; fetched)
- **Past YouTube and Google legal letters:**
  - YouTube ordered the Invidious front-end (a viewer, not a downloader) to shut down within seven days (June 2023). — [TorrentFreak, 2023-06-09](https://torrentfreak.com/youtube-orders-invidious-privacy-software-to-shut-down-in-7-days-230609/) (acc. 2026-11-24; snippet)
  - Free Download Manager removed YouTube support after a complaint from Google (Oct 2021). — [TorrentFreak, 2021-10-25](https://torrentfreak.com/free-download-manager-removes-youtube-support-after-google-complaint-211025/) (acc. 2026-11-24; snippet)
- **Music-industry actions, 2025-2026:**
  - IFPI's watch-list nomination of yt-dlp (Sept 2026). — [TorrentFreak, 2026-09-29](https://torrentfreak.com/ifpi-wants-open-source-youtube-downloader-yt-dlp-on-eu-piracy-watch-list/) (acc. 2026-11-24; fetched)
  - The Canadian blocking order (June 2026). — [TorrentFreak, 2026-06-16](https://torrentfreak.com/music-labels-win-canadian-site-blocking-order-against-y2mate-ytmp3-and-savefrom/) (acc. 2026-11-24; fetched)
  - The Y2mate shutdown in Vietnam (Oct 2025). — [CMU, 2025-10-14](https://completemusicupdate.com/legal-action-in-vietnam-takes-stream-ripper-y2mate-offline/) (acc. 2026-11-24; fetched)
  - The labels' stream-ripping and circumvention claims against Suno (Sept 2025). — [Digital Music News, 2025-09-22](https://www.digitalmusicnews.com/2025/09/22/suno-lawsuit-amended-complaint-labels/) (acc. 2026-11-24; fetched)

### Inferences
- Each new YouTube layer (attestation-bound PO tokens, SABR, frequently rotated JS challenges) makes it easier to argue that the measures "effectively control access" in their ordinary operation. It also makes the technical approach of downloaders look more like deliberate bypassing.
- For a tool whose policy is to refuse anti-bot circumvention, the clear prohibited integrations are:
  - PO-token provider plugins and BotGuard emulation;
  - cookie or account import to unlock formats;
  - client spoofing to dodge SABR or attestation;
  - any handling of DRM'd formats.
- YouTube's JS-challenge solving is the same "rolling cipher" issue that the D. Conn. and Hamburg courts treated as circumvention. A truly circumvention-free design probably has to disable the YouTube extractor by default, or restrict it to contexts where YouTube itself offers a download.
- The ToS lets users download only where the Service expressly allows it, which supports "honor platform download flags" as the low-risk default.
- Industry pressure has moved upstream to the open-source tools themselves (IFPI naming yt-dlp's maintainers). Downstream wrappers that bundle yt-dlp with YouTube enabled inherit that reputational and legal exposure.
- yt-dlp's maintainers advise updating frequently because YouTube changes break things. A compliance-first project should pin and review extractor updates through its policy registry rather than auto-updating circumvention-relevant code.

### Gaps
- No 2025-2026 cease-and-desist or legal letter from YouTube or Google to a downloader operator was found. This may reflect quiet enforcement or limited search coverage.
- No official YouTube or Google documentation on SABR or PO tokens was found. All technical details come from the yt-dlp community.
- No court has yet ruled specifically on PO tokens, SABR, or the 2025 JS challenges.

---

## Q5. Which design choices are higher risk, and which are lower risk?

### Takeaway
Across jurisdictions, risk rises with four things: (1) circumventing technical measures (YouTube cipher solving, PO tokens or attestation, DRM); (2) a music focus, especially YouTube-to-MP3; (3) ad-monetized, high-traffic public sites, particularly ones that geotarget the US; and (4) marketing or examples that promote copyrighted downloads. Risk falls with user-owned or explicitly licensed sources (CC, public domain), honoring platform download permissions, no circumvention, and responsive takedown practice. Even the "lower risk" choices are not risk-free where YouTube's cipher is involved.

### Cited Findings
Evidence for each risk driver:
- **Circumvention is actionable regardless of infringement or fair use.**
  - US: the trafficking ban covers tools and services meeting any one of three tests. — [LII, 17 U.S.C. §1201](https://www.law.cornell.edu/uscode/text/17/1201) (acc. 2026-11-24; fetched)
  - EU: Art. 6 covers devices and services. — [EUR-Lex, Directive 2001/29/EC](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32001L0029) (acc. 2026-11-24; fetched)
  - The cipher has been treated as an effective TPM by D. Conn. in 2022 ([CMU](https://completemusicupdate.com/stream-ripper-yout-circumvents-youtubes-technical-protection-measures-court-concludes/), acc. 2026-11-24; fetched) and by OLG Hamburg in 2024 ([heise](https://heise.de/-10181247), acc. 2026-11-24; fetched).
- **Music-focused YouTube-to-MP3 services are the primary enforcement target.**
  - Yout, FLVTO/2conv, Y2Mate, SaveFrom, YTMP3, and yt1s are named in actions in the US, UK, Australia, Denmark, Italy, India, Canada, and Vietnam. — [TorrentFreak, 2022-02-14](https://torrentfreak.com/?p=215056) (acc. 2026-11-24; fetched); [TorrentFreak, 2026-06-16](https://torrentfreak.com/music-labels-win-canadian-site-blocking-order-against-y2mate-ytmp3-and-savefrom/) (acc. 2026-11-24; fetched); [TorrentFreak, 2023-03-16](https://torrentfreak.com/?p=232360) (acc. 2026-11-24; fetched); [TorrentFreak, 2023-01-20](https://torrentfreak.com/major-labels-obtain-stream-ripping-site-blocking-order-in-india-230120/) (acc. 2026-11-24; fetched)
  - FPM says stream ripping is about 30% of online music piracy. — [CMU, 2024-07-26](https://completemusicupdate.com/french-and-italian-record-industries-secure-new-web-blocks/) (acc. 2026-11-24; fetched)
- **Ad monetization and US geotargeting create jurisdiction, and walking away brings large default judgments.** This is the Kurbanov pattern. — [TorrentFreak, 2020-06-26](https://torrentfreak.com/appeals-court-revives-record-labels-lawsuit-against-youtube-rippers-200626/) (acc. 2026-11-24; snippet); [TorrentFreak, 2022-02-14](https://torrentfreak.com/?p=215056) (acc. 2026-11-24; fetched)
- **Promoting infringing uses is the core of inducement liability** (Grokster), and Cox preserves that theory. — [Justia, MGM v. Grokster](https://supreme.justia.com/cases/federal/us/545/913/) (acc. 2026-11-24; snippet); [Mayer Brown](https://www.mayerbrown.com/fr/insights/publications/2026/03/supreme-court-significantly-narrows-liability-for-contributory-copyright-infringement) (acc. 2026-11-24; snippet)
- **Commercial-music test URLs were used against youtube-dl.** The maintainers removed them before reinstatement. — [GitHub Blog, 2020-11-16](https://github.blog/2020-11-16-standing-up-for-developers-youtube-dl-is-back/) (acc. 2026-11-24; fetched)
- **Platform permission.** YouTube's ToS allows downloads only where the Service expressly allows it, with permission, or where applicable law allows. — [YouTube Terms of Service](https://www.youtube.com/static?template=terms) (acc. 2026-11-24; fetched)
- **"Circumvent" requires lack of the copyright owner's authority** (§1201(a)(3)). This is relevant where the user owns the content or the owner has licensed copying. — [LII](https://www.law.cornell.edu/uscode/text/17/1201) (acc. 2026-11-24; fetched)
- **Anti-infringement practices count in a provider's favour on inducement.** In Cox, the subscriber agreement and the warning and termination system were noted. — [Mayer Brown](https://www.mayerbrown.com/fr/insights/publications/2026/03/supreme-court-significantly-narrows-liability-for-contributory-copyright-infringement) (acc. 2026-11-24; snippet)

### Inferences
The risk spectrum below is a synthesis, not legal advice.

| Design choice | Relative risk | Why (from the evidence above) |
|---|---|---|
| Solving YouTube signature/n JavaScript challenges ("rolling cipher") | High (EU/DE effectively settled at appellate level; US pending appeal) | Treated as circumvention of an effective TPM in D. Conn. (2022) and OLG Hamburg (2024) |
| PO-token generation, BotGuard emulation, client spoofing to evade SABR or attestation | Very high | Designed to defeat attestation; no case law yet, but it fits "avoiding/bypassing" a measure more clearly than the cipher does |
| Any DRM handling (Widevine and similar, e.g. YouTube tv-client formats) | Very high | Classic encryption-based TPM under both §1201 and Art. 6 |
| Paywalled or private content, cookie/session import | High | Defeats access controls; also breaches platform terms |
| Music-focused YouTube-to-MP3 UX, "YouTube to MP3" branding/SEO | High | Primary target of RIAA, IFPI, BPI, FPM and MRA actions in at least 8 jurisdictions |
| Ad-monetized public site with US geotargeted ads | High | Kurbanov jurisdiction and statutory-damages exposure |
| Docs, tests or examples using commercial music | Elevated | Used as evidence against youtube-dl; Grokster inducement |
| Public multi-user hosted instance (any source) | Elevated | §1201(a)(2) and Art. 6(2) cover *services*; VCAST judges the operator's own acts |
| Private single-user self-hosting, no circumvention | Lower | Fewer trafficking and "offering to the public" signals; RIAA's reported concession on individual downloads (not authoritative) |
| User-owned uploads, retrieved through the platform's own export or download feature | Low | Owner authority plus platform permission; no circumvention |
| CC/public-domain sources with direct file links (no TPM in the path) | Low | Licensed copying; no measure to circumvent |
| Honoring platform download flags (download only where the platform offers it) | Low | Matches YouTube's ToS permission model |

Caveat on CC-licensed videos *on YouTube*: the copyright owner's licence authorizes copying, but the TPM is YouTube's. Whether a CC licence supplies the "authority" needed under §1201(a)(3), or under German §95a UrhG, is untested. Treat it as unresolved.

### Gaps
- No case was found that assesses CC-licensed or user-owned content fetched by circumventing a platform's TPM.
- No case was found on whether honoring a platform "download allowed" flag protects a tool operator.
- No authoritative source was found ranking these risks. The table is a synthesis.

---

## Q6. Operator compliance practices: DMCA agent and takedown, repeat-infringer policy, blocklists, geo-restrictions, attestations, terms of use, privacy/GDPR for logs, minimal logging

### Takeaway
The baseline toolkit is:
- a registered, renewed DMCA agent ($6, three-year term);
- a notice-and-takedown and counter-notice flow;
- a *reasonably implemented* repeat-infringer policy (BMG v. Cox);
- a DSA Art. 16-style notice mechanism for EU users;
- updatable domain and URL blocklists;
- terms of use, attestations, and messaging that discourage infringement (useful against inducement after Cox and Grokster).

None of these defeats a §1201 or Art. 6 circumvention claim, which has to be handled by design: don't circumvent. On privacy, IP addresses are personal data under GDPR (Recital 30; Breyer 2016), hashing or pseudonymising them does not take them out of scope (EDPB 2025), and logs should be minimised and short-lived. Kurbanov shows that logs you keep can become discovery targets.

### Cited Findings
- **DMCA designated agent.** Required for §512 eligibility; online filing; $6; expires after three years unless amended or resubmitted; lapse risks losing safe harbor. — [Copyright Office](https://www.copyright.gov/dmca-directory/) (acc. 2026-11-24; fetched); [Copyright Office FAQ](https://www.copyright.gov/dmca-directory/faq.html) (acc. 2026-11-24; fetched)
- **Repeat-infringer policy.** It must be reasonably implemented, not just adopted. Ignoring notices from a source cost Cox the safe harbor, and "repeat infringer" includes people who were never adjudicated. — [Justia, BMG v. Cox](https://law.justia.com/cases/federal/appellate-courts/ca4/16-1972/16-1972-2018-02-01.html) (acc. 2026-11-24; snippet)
- **§1201-based notices sit outside the §512(f) misrepresentation remedy.** — [Eric Goldman blog](https://blog.ericgoldman.org/archives/2022/10/anti-circumvention-takedowns-arent-covered-by-512f-yout-v-riaa.htm) (acc. 2026-11-24; snippet)
- **GitHub's §1201 claim process** is a model for handling circumvention complaints: technical verification, legal review, ambiguity resolved for the developer, and a chance to patch before takedown. — [GitHub Blog, 2020-11-16](https://github.blog/2020-11-16-standing-up-for-developers-youtube-dl-is-back/) (acc. 2026-11-24; fetched)
- **Anti-infringement practices and inducement.** In Cox, the subscriber agreement and the warning, suspension, and termination system were cited as showing Cox did not induce infringement. Grokster ties inducement to advertising or instructing infringing uses. — [Mayer Brown](https://www.mayerbrown.com/fr/insights/publications/2026/03/supreme-court-significantly-narrows-liability-for-contributory-copyright-infringement) (acc. 2026-11-24; snippet); [Justia, MGM v. Grokster](https://supreme.justia.com/cases/federal/us/545/913/) (acc. 2026-11-24; snippet)
- **Blocklists must be updatable.** Court orders now extend to mirrors by affidavit (Canada), dynamic injunctions (India), or rolling mirror lists (Denmark: 1,146 mirror domains). — [TorrentFreak, 2026-06-16](https://torrentfreak.com/music-labels-win-canadian-site-blocking-order-against-y2mate-ytmp3-and-savefrom/) (acc. 2026-11-24; fetched); [TorrentFreak, 2023-01-20](https://torrentfreak.com/major-labels-obtain-stream-ripping-site-blocking-order-in-india-230120/) (acc. 2026-11-24; fetched); [TorrentFreak, 2023-03-16](https://torrentfreak.com/?p=232360) (acc. 2026-11-24; fetched)
- **Geo-restrictions in practice:**
  - FLVTO and 2conv closed to US visitors in 2021. — [TorrentFreak, 2022-02-14](https://torrentfreak.com/?p=215056) (acc. 2026-11-24; fetched)
  - Y2mate geo-blocked the US and UK in 2021. — [Digital Music News](https://www.digitalmusicnews.com/?p=190331) (acc. 2026-11-24; snippet)
  - Savefrom.net blocks Canadian visitors. — [TorrentFreak, 2026-06-16](https://torrentfreak.com/music-labels-win-canadian-site-blocking-order-against-y2mate-ytmp3-and-savefrom/) (acc. 2026-11-24; fetched)
  - US jurisdiction over Kurbanov rested partly on recording US IP addresses for geotargeted ads. — [TorrentFreak, 2020-06-26](https://torrentfreak.com/appeals-court-revives-record-labels-lawsuit-against-youtube-rippers-200626/) (acc. 2026-11-24; snippet)
- **Logs as evidence.** Kurbanov's default followed his failure to hand over evidence, including server logs. — [TorrentFreak, 2022-02-14](https://torrentfreak.com/?p=215056) (acc. 2026-11-24; fetched)
- **GDPR, Recital 30.** IP addresses and cookie identifiers are online identifiers that, combined with other data, can identify and profile people. — [GDPR Recital 30](https://gdpr-info.eu/recitals/no-30/) (acc. 2026-11-24; snippet)
- **Breyer (CJEU C-582/14, Oct 19, 2016).** A dynamic IP address is personal data for a website operator that has legal means to identify the visitor with additional data held by the ISP. — [Covington Inside Privacy](https://www.insideprivacy.com/international/cjeu-confirms-dynamic-ip-addresses-to-be-personal-data/) (acc. 2026-11-24; snippet); [CMS](https://cms.law/en/aut/legal-updates/are-dynamic-ip-addresses-personal-data-europe-s-highest-court-says-they-are-in-certain-circumstances) (acc. 2026-11-24; snippet)
- **GDPR Art. 5 principles:**
  - purpose limitation (5(1)(b));
  - data minimisation (5(1)(c));
  - storage limitation, meaning identifiable data is kept no longer than the purpose needs (5(1)(e));
  - integrity and confidentiality (5(1)(f));
  - accountability: the controller must be able to demonstrate compliance (5(2)).
  — [GDPR Art. 5](https://gdpr-info.eu/art-5-gdpr/) (acc. 2026-11-24; fetched)
- **EDPB Guidelines 01/2025 on Pseudonymisation** (adopted at the Jan 2025 plenary): pseudonymised data that can be attributed to a person using additional information remains personal data. — [EDPB news, Jan 2025](https://edpb.europa.eu/news/news/2025/edpb-adopts-pseudonymisation-guidelines-and-paves-way-improve-cooperation_en) (acc. 2026-11-24; snippet)
- **CJEU C-470/21 (La Quadrature du Net II, Full Court, Apr 30, 2024).** Member States may require internet access providers to retain IP addresses generally, including for fighting online copyright infringement (France's Hadopi, now Arcom), if the addresses are strictly separated from other data. The authority may access the linked identity data only under conditions that prevent profiling. — [EU FRA case-law entry](https://fra.europa.eu/en/caselaw-reference/cjeu-case-c-47021-judgment) (acc. 2026-11-24; snippet)
- **DSA Art. 16.** Hosting providers need an accessible notice-and-action mechanism with timely decisions and feedback to the notifier. — [Springlex, DSA Art. 16](https://www.springlex.eu/en/packages/dsa/dsa-regulation/article-16/) (acc. 2026-11-24; snippet)

### Inferences
These are suggested engineering translations of the findings, not legal advice.

- **Policy registry.** Make per-source rules explicit and versioned:
  - allowed source types: direct-file, CC/public-domain, user-owned via platform export;
  - forbidden capabilities: TPM/JavaScript-challenge solving, PO tokens, DRM, cookie import, paywalls, private content;
  - category flags: music-platform domains denied by default;
  - updatable domain and URL blocklists that can absorb court-ordered and rightsholder-supplied mirror lists;
  - a regional overlay (for example, stricter defaults for DE/EU, where the cipher-as-TPM ruling is final at appellate level).
- **Attestation gates.** Have users attest to ownership or licence for each job, and record the attestation as a minimal, non-IP record (job ID, timestamp, attestation version). This is useful evidence against inducement and for terms enforcement after Cox and Grokster. It is *not* a defense to §1201 or Art. 6 claims, so it cannot unlock circumvention features.
- **Takedown handling:**
  - Register and renew the DMCA agent.
  - Publish a notice form that also serves DSA Art. 16 needs.
  - Triage §1201 and circumvention claims through a GitHub-style technical and legal review.
  - Keep a repeat-infringer policy that is actually enforced (per account, or per API key for public instances).
  - Feed confirmed notices into the blocklist automatically.
  - Remember that §512(f) gives no remedy against bad-faith §1201 notices.
- **Logging and privacy:**
  - Default to no IP logging. Where abuse prevention needs it, use in-memory rate limiting with short time-to-live, or truncated IPs.
  - Hashed or pseudonymised IPs are still personal data under the EDPB view.
  - Set short, documented retention, keep aggregate metrics without identifiers, and do not log source URLs together with user identifiers.
  - This keeps storage limitation and minimisation defensible and shrinks what can be demanded in discovery. Do not destroy logs once litigation is reasonably anticipated; the litigation-hold duty is a general US principle that was not sourced here, so check with counsel.
- **Geo-restriction** is a weak shield. It is easy to bypass and does not erase past contacts, but it can reduce exposure in specific markets. Avoid US-geotargeted ad monetization entirely, given Kurbanov.
- **Terms of use and UI copy.** Prohibit infringing use and circumvention. Avoid music-ripping branding and examples. Ship CC or public-domain test fixtures only.

### Gaps
- No case law or regulator guidance was found on whether per-user ownership attestations reduce operator liability.
- No EDPB or national DPA guidance was found that sets a specific retention period for web-server or abuse-prevention IP logs. Only the general Art. 5 principles and the pseudonymisation guidance were found. The lawful basis for security logging (for example, legitimate interests under Art. 6(1)(f)) was not verified this session.
- How a URL-fetching downloader is classified under the DSA (hosting vs. other intermediary service) is unresolved.
- US state privacy laws (CCPA and others), the UK GDPR, and India's DPDP Act were not researched.
- How a repeat-infringer policy applies to an account-less service under §512(i) was not addressed in any source found.
