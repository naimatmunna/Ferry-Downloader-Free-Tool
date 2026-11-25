/**
 * Platform registry: indexes the catalog for O(labels) hostname detection,
 * path-pattern detection (federated platforms) and yt-dlp extractor mapping.
 */

import { directMediaExtension, hostCandidates, parseMediaUrl } from '../url.js';

/**
 * @typedef {object} Platform
 * @property {string} id
 * @property {string} name
 * @property {string} kind
 * @property {string[]} hosts           hostnames matched on label boundaries
 * @property {RegExp[]} [paths]         optional path filters when several entries share a host
 * @property {RegExp[]} [patterns]      path patterns for hosts not in the registry (federated software)
 * @property {string[]} [extractors]    yt-dlp extractor-name regexes (full match, case-insensitive)
 * @property {string[]} content
 * @property {string} engine
 * @property {true} [ytdlpPictures]    yt-dlp lists this site's pictures as items without video formats
 *                                     (Instagram posts): Ferry offers them as a picture gallery
 * @property {1|2|3|4|5} category
 * @property {string} policy
 * @property {'none'|'sometimes'|'always'} auth
 * @property {string|null} officialApi
 * @property {{ label: string, url: string|null }[]} routes
 * @property {string} restrictions
 * @property {'verified'|'experimental'|'unstable'|'unsupported'} reliability
 * @property {string} lastChecked
 * @property {string} [attestation]
 * @property {string} [license]
 * @property {string} [notes]
 * @property {string[]} [sources]
 */

/**
 * @typedef {{ ok: true, platform: Platform, via: 'host'|'pattern'|'direct'|'generic', url: URL, href: string, directExt: string|null }
 *   | { ok: false, reason: string }} Detection
 */

/** @param {Platform[]} catalog */
export function createRegistry(catalog) {
  /** @type {Map<string, Platform>} */
  const byId = new Map();
  /** @type {Map<string, Platform[]>} */
  const byHost = new Map();
  /** @type {Platform[]} */
  const patterned = [];
  /** @type {{ re: RegExp, platform: Platform }[]} */
  const extractorIndex = [];

  for (const p of catalog) {
    if (byId.has(p.id)) throw new Error(`Duplicate platform id: ${p.id}`);
    byId.set(p.id, p);
    for (const h of p.hosts ?? []) {
      const key = h.toLowerCase();
      const list = byHost.get(key) ?? [];
      list.push(p);
      // Entries with path filters are tested before plain host entries.
      list.sort((a, b) => (b.paths?.length ? 1 : 0) - (a.paths?.length ? 1 : 0));
      byHost.set(key, list);
    }
    if (p.patterns?.length) patterned.push(p);
    for (const src of p.extractors ?? []) extractorIndex.push({ re: new RegExp(`^(?:${src})$`, 'i'), platform: p });
  }

  const generic = byId.get('generic');
  const direct = byId.get('direct');
  if (!generic || !direct) throw new Error('Catalog must define "generic" and "direct" entries');

  /**
   * @param {string|URL} input
   * @param {{ allowLocal?: boolean, allowedPorts?: readonly number[] }} [opts]
   * @returns {Detection}
   */
  function detect(input, opts = {}) {
    let url;
    let href;
    if (input instanceof URL) {
      url = input;
      href = input.href;
    } else {
      const parsed = parseMediaUrl(input, opts);
      if (!parsed.ok) return parsed;
      url = parsed.url;
      href = parsed.href;
    }
    const host = url.hostname.toLowerCase();
    const directExt = directMediaExtension(url);

    for (const candidate of hostCandidates(host)) {
      const entries = byHost.get(candidate);
      if (!entries) continue;
      for (const p of entries) {
        if (!p.paths?.length || p.paths.some((re) => re.test(url.pathname))) {
          return { ok: true, platform: p, via: 'host', url, href, directExt };
        }
      }
    }
    for (const p of patterned) {
      if (p.patterns.some((re) => re.test(url.pathname))) return { ok: true, platform: p, via: 'pattern', url, href, directExt };
    }
    if (directExt) return { ok: true, platform: direct, via: 'direct', url, href, directExt };
    return { ok: true, platform: generic, via: 'generic', url, href, directExt: null };
  }

  /**
   * Map a yt-dlp extractor name (e.g. "youtube:tab", "Vimeo") to a platform.
   * @param {string|null|undefined} extractor
   */
  function byExtractor(extractor) {
    if (!extractor) return null;
    for (const { re, platform } of extractorIndex) if (re.test(extractor)) return platform;
    return null;
  }

  /** yt-dlp extractor regexes for platforms that must never be run. */
  function excludedExtractors(isExcluded) {
    const out = [];
    for (const p of catalog) if (p.extractors?.length && isExcluded(p)) out.push(...p.extractors);
    return [...new Set(out)];
  }

  return {
    all: catalog,
    size: catalog.length,
    get: (id) => byId.get(id) ?? null,
    detect,
    byExtractor,
    excludedExtractors,
  };
}
