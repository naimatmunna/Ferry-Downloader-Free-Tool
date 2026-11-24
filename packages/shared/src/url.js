/**
 * URL intake: coercion, validation, normalization, multi-link extraction.
 *
 * This runs in the browser on every keystroke and on the server before any
 * network activity, so it must be fast, allocation-light and ReDoS-free.
 * Server-side SSRF enforcement (DNS resolution, IP classes) lives in the
 * server's egress guard; the local-address check here is only an early hint.
 */

import { DIRECT_MEDIA_EXTENSIONS } from './formats.js';

export const MAX_URL_LENGTH = 2048;
export const DEFAULT_ALLOWED_PORTS = Object.freeze([80, 443, 8080, 8443]);

/** Parameters that only track the click and never change what is served. */
const GLOBAL_TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'twclid', 'ttclid', 'li_fat_id',
  'mc_cid', 'mc_eid', '_ga', '_gl', 'igsh', 'igshid', 'mibextid', 'srsltid', 'oly_anon_id', 'oly_enc_id',
  'vero_id', 'wickedid', 'rb_clickid', 's_cid', 'ncid', 'cmpid', 'spm', 'scm',
]);
const TRACKING_PREFIXES = ['utm_', 'pk_', 'mtm_', 'hsa_', 'ga_', '__cft__', '__tn__'];

/** Share-sheet parameters that are safe to drop for specific hosts. */
const HOST_TRACKING_PARAMS = [
  [['youtube.com', 'youtu.be', 'youtube-nocookie.com'], ['si', 'feature', 'pp', 'ab_channel', 'embeds_referring_euri', 'source_ve_path']],
  [['x.com', 'twitter.com'], ['s', 't', 'ref_src', 'ref_url']],
  [['tiktok.com'], ['_r', '_t', 'is_from_webapp', 'is_copy_url', 'sender_device', 'sender_web_id', 'web_id', 'share_app_id', 'share_link_id', 'share_item_id', 'u_code', 'preview_pb', 'social_share_type', 'tt_from', 'checksum', 'sec_user_id', 'user_id', 'timestamp', 'enter_from', 'enter_method', 'q', 'refer']],
  [['instagram.com'], ['hl', 'img_index_ref']],
  [['facebook.com', 'fb.watch'], ['rdid', 'share_url', 'ref', 'refsrc', 'paipv', 'eav']],
  [['reddit.com'], ['share_id', 'rdt', 'ref', 'ref_source', 'correlation_id']],
  [['spotify.com'], ['si', 'nd', 'dlsi']],
  [['soundcloud.com'], ['si', 'ref', 'p', 'c']],
  [['pinterest.com', 'pin.it'], ['invite_code', 'sender', 'sfo', 'mweb_unauth_id']],
  [['linkedin.com'], ['trk', 'trackingId', 'lipi', 'midToken', 'midSig', 'trkEmail', 'eid', 'rcm', 'originalSubdomain']],
  [['vimeo.com'], ['share', 'fl', 'fe']],
  [['threads.net', 'threads.com'], ['xmt', 'slof']],
  [['snapchat.com'], ['share_id', 'sid', 'sender_web_id', 'locale']],
];

const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa', '.intranet', '.corp', '.private'];

/**
 * True when `host` equals `domain` or is a subdomain of it (label boundary).
 * `youtube.com.evil.example` does NOT match `youtube.com`.
 */
export function hostMatches(host, domain) {
  if (!host || !domain) return false;
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Candidate registry keys for a host, most specific first:
 * `a.b.example.com` → [`a.b.example.com`, `b.example.com`, `example.com`, `com`].
 */
export function hostCandidates(host) {
  const out = [];
  let h = host;
  for (let i = 0; i < 12 && h; i += 1) {
    out.push(h);
    const dot = h.indexOf('.');
    if (dot < 0) break;
    h = h.slice(dot + 1);
  }
  return out;
}

/**
 * Cheap early warning for obviously local destinations. The server performs
 * the authoritative check after DNS resolution.
 */
export function isObviouslyLocalHost(hostname) {
  let h = String(hostname || '').toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  if (!h) return true;
  if (h === 'localhost' || LOCAL_SUFFIXES.some((s) => h.endsWith(s))) return true;
  if (!h.includes('.') && !h.includes(':')) return true; // single-label intranet names
  // IPv4 literal (WHATWG URL has already canonicalized octal/hex/integer forms).
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  if (h.includes(':')) {
    return h === '::' || h === '::1' || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h) || h.startsWith('::ffff:') || /^ff[0-9a-f]{2}:/.test(h);
  }
  return false;
}

function stripWrapping(input) {
  let s = String(input ?? '').trim();
  // Remove matching wrappers people paste from chats/markdown.
  for (let i = 0; i < 3; i += 1) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '<' && last === '>') || (first === '"' && last === '"') || (first === "'" && last === "'") || (first === '`' && last === '`') || (first === '(' && last === ')')) {
      s = s.slice(1, -1).trim();
    } else break;
  }
  return s;
}

/** Add a scheme to scheme-less input that clearly looks like a web address. */
export function coerceUrl(input) {
  const s = stripWrapping(input);
  if (!s) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[a-z0-9.-]+\.[a-z]{2,}:\d+/i.test(s)) return s; // has a scheme
  if (s.startsWith('//')) return `https:${s}`;
  if (/^(www\.)?([a-z0-9-]+\.)+[a-z]{2,63}(:\d{1,5})?(\/|\?|#|$)/i.test(s)) return `https://${s}`;
  return s;
}

/**
 * @typedef {{ ok: true, url: URL, href: string } | { ok: false, reason: 'empty'|'too_long'|'invalid'|'scheme'|'credentials'|'port'|'local' }} ParseResult
 */

/**
 * Validate user input as an http(s) media URL.
 * @param {string} input
 * @param {{ allowedPorts?: readonly number[], allowLocal?: boolean }} [opts]
 * @returns {ParseResult}
 */
export function parseMediaUrl(input, { allowedPorts = DEFAULT_ALLOWED_PORTS, allowLocal = false } = {}) {
  const raw = coerceUrl(input);
  if (!raw) return { ok: false, reason: 'empty' };
  if (raw.length > MAX_URL_LENGTH) return { ok: false, reason: 'too_long' };
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'scheme' };
  if (url.username || url.password) return { ok: false, reason: 'credentials' };
  if (!url.hostname) return { ok: false, reason: 'invalid' };
  if (url.hostname.endsWith('.')) url.hostname = url.hostname.replace(/\.+$/, '');
  if (!url.hostname) return { ok: false, reason: 'invalid' };
  if (url.port && !allowedPorts.includes(Number(url.port))) return { ok: false, reason: 'port' };
  if (!allowLocal && isObviouslyLocalHost(url.hostname)) return { ok: false, reason: 'local' };
  if (url.href.length > MAX_URL_LENGTH) return { ok: false, reason: 'too_long' };
  return { ok: true, url, href: normalizeUrl(url) };
}

function hostTrackingParams(host) {
  const out = [];
  for (const [domains, params] of HOST_TRACKING_PARAMS) {
    if (domains.some((d) => hostMatches(host, d))) out.push(...params);
  }
  return out;
}

/**
 * Canonical form used for probing, de-duplication and history.
 * Removes fragments and tracking parameters, expands youtu.be links and
 * mobile YouTube hosts. Functional parameters (v, list, t, start…) are kept.
 * @param {URL} input
 */
export function normalizeUrl(input) {
  const url = new URL(input.href);
  url.hash = '';
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';

  const host = url.hostname;
  const drop = new Set(hostTrackingParams(host));
  for (const key of [...url.searchParams.keys()]) {
    const k = key.toLowerCase();
    if (GLOBAL_TRACKING_PARAMS.has(k) || drop.has(key) || TRACKING_PREFIXES.some((p) => k.startsWith(p))) {
      url.searchParams.delete(key);
    }
  }

  // youtu.be/<id> → www.youtube.com/watch?v=<id>
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) {
      const target = new URL('https://www.youtube.com/watch');
      target.searchParams.set('v', id);
      for (const [k, v] of url.searchParams) if (k !== 'v') target.searchParams.set(k, v);
      return target.href;
    }
  }
  if (host === 'm.youtube.com' || host === 'youtube.com') url.hostname = 'www.youtube.com';

  let href = url.href;
  if (href.endsWith('?')) href = href.slice(0, -1);
  return href;
}

/**
 * File extension of a URL path when it is a known direct-media extension.
 * @param {URL} url
 * @returns {string|null}
 */
export function directMediaExtension(url) {
  const last = url.pathname.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  if (dot < 1) return null;
  const ext = last.slice(dot + 1).toLowerCase();
  return DIRECT_MEDIA_EXTENSIONS.includes(ext) ? ext : null;
}

const URL_IN_TEXT = /\bhttps?:\/\/[^\s<>"'`{}|\\^]+|\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s<>"'`{}|\\^]*/gi;

function trimTrailingPunctuation(s) {
  let out = s;
  for (;;) {
    const last = out[out.length - 1];
    if (!last) return out;
    if ('.,;:!?\'"'.includes(last)) {
      out = out.slice(0, -1);
      continue;
    }
    const pairs = { ')': '(', ']': '[', '}': '{' };
    if (pairs[last]) {
      const open = pairs[last];
      const opens = out.split(open).length - 1;
      const closes = out.split(last).length - 1;
      if (closes > opens) {
        out = out.slice(0, -1);
        continue;
      }
    }
    return out;
  }
}

/**
 * Pull every web link out of free text (a paste, a share-sheet payload).
 * De-duplicates by normalized form, preserving order.
 * @param {string} text
 * @param {{ max?: number }} [opts]
 * @returns {string[]} normalized hrefs of valid URLs
 */
export function extractUrls(text, { max = 50 } = {}) {
  const s = String(text ?? '').slice(0, 100_000);
  const seen = new Set();
  const out = [];
  for (const m of s.matchAll(URL_IN_TEXT)) {
    const candidate = trimTrailingPunctuation(m[0]);
    const parsed = parseMediaUrl(candidate);
    if (!parsed.ok || seen.has(parsed.href)) continue;
    seen.add(parsed.href);
    out.push(parsed.href);
    if (out.length >= max) break;
  }
  return out;
}

/** True when a YouTube-style URL also references a playlist. */
export function hasPlaylistParam(url) {
  try {
    const u = url instanceof URL ? url : new URL(url);
    return u.searchParams.has('list') && !/^(RD|UL|LL|WL)/.test(u.searchParams.get('list') || '');
  } catch {
    return false;
  }
}
