/**
 * gallery-dl wrapper: argument construction (hardened profile), parsing of
 * the `-j` JSON message list, and pairing download output with the chosen
 * files. See SYSTEM-ARCHITECTURE.md §8.5.
 *
 * gallery-dl is GPL-2.0-only and only ever runs as a separate program through
 * engines/process.js (argv array, no shell, the URL after `--`).
 *
 * Hardening: no config files, no input prompts, no cookies/logins, no
 * browser header/TLS imitation, all traffic through the per-job egress proxy,
 * no child extractors and no yt-dlp hand-off when downloading.
 */
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { BLOCK_REASON_PHRASE, LIMIT_REASON_PHRASE } from '../security/egressProxy.js';
import { classifyEngineError } from './classify.js';

/** Printed by gallery-dl before each file it is about to download. */
export const GDL_FILE_MARKER = 'FERRY_GDL_FILE';

/**
 * Extensions offered as gallery images: exactly the types adapters/http.js#sniffImage
 * recognizes (every file is sniffed, decoded and re-encoded by FFmpeg).
 */
export const IMAGE_EXTENSIONS = Object.freeze(['jpg', 'jpeg', 'jpe', 'png', 'gif', 'webp', 'avif']);
const IMAGES = new Set(IMAGE_EXTENSIONS);
const VIDEOS = new Set(['mp4', 'm4v', 'webm', 'mkv', 'mov', 'avi', 'ogv', 'flv', 'm3u8', 'mpd', 'ts', '3gp', 'gifv', 'mpg', 'mpeg', 'wmv']);

/**
 * gallery-dl's prefix for extractors that serve many independent instances
 * (Ferry detects these platforms by URL pattern on any server).
 */
const INSTANCE_PREFIX = Object.freeze({ mastodon: 'mastodon' });

/**
 * The string handed to gallery-dl for a user URL. Only http(s) URLs are
 * accepted, so gallery-dl's special schemes (ytdl:, generic:, recursive:…)
 * can never be reached from user input.
 * @param {string} url
 * @param {string} platformId
 */
export function galleryInput(url, platformId) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new FerryError('INVALID_URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new FerryError('INVALID_URL');
  const prefix = INSTANCE_PREFIX[platformId];
  return prefix ? `${prefix}:${u.href}` : u.href;
}

/**
 * @param {{ proxyUrl: string, cacheFile: string }} p
 */
export function baseArgs({ proxyUrl, cacheFile }) {
  return [
    '--config-ignore',
    '--no-input',
    '--no-colors',
    '--proxy', proxyUrl,
    '-o', 'proxy-env=false',
    '-o', 'browser=false',
    // Imgur animations as GIF images rather than MP4 videos (which galleries skip).
    '-o', 'extractor.imgur.mp4=false',
    '--cache-file', cacheFile,
    '--http-timeout', '30',
    '-R', '3',
    '--no-mtime',
  ];
}

function positiveInt(n, what) {
  if (!Number.isInteger(n) || n < 1) throw new FerryError('VALIDATION_FAILED', { internal: `${what} must be a positive integer` });
  return n;
}

/**
 * Metadata only: list up to `maxItems + 1` files (one more than offered, to
 * detect truncation).
 * @param {{ base: string[], input: string, maxItems: number }} p
 */
export function probeArgs({ base, input, maxItems }) {
  positiveInt(maxItems, 'maxItems');
  return [...base, '--no-postprocessors', '-j', '--range', `1-${maxItems + 1}`, '--', input];
}

/**
 * gallery-dl `--range` value for a set of 1-based file indexes ("1-3,5,7-8").
 * @param {number[]} indexes
 */
export function rangeSpec(indexes) {
  if (!Array.isArray(indexes) || !indexes.length) throw new FerryError('VALIDATION_FAILED', { internal: 'empty gallery selection' });
  for (const i of indexes) positiveInt(i, 'gallery index');
  const sorted = [...new Set(indexes)].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const n of [...sorted.slice(1), Number.POSITIVE_INFINITY]) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}-${prev}`);
    start = n;
    prev = n;
  }
  return parts.join(',');
}

/**
 * Download exactly the chosen files into `outDir`. The `--Print` hook writes
 * a marker line before each file; gallery-dl prints the saved path after each
 * success (see createDownloadTracker).
 * @param {{ base: string[], input: string, indexes: number[], outDir: string, maxFileBytes: number }} p
 */
export function downloadArgs({ base, input, indexes, outDir, maxFileBytes }) {
  return [
    ...base,
    '--range', rangeSpec(indexes),
    '--child-filter', 'False',
    '-o', 'downloader.ytdl.enabled=false',
    '-D', outDir,
    '--restrict-filenames', 'ascii',
    '--filesize-max', String(Math.floor(maxFileBytes)),
    '--Print', `prepare:${GDL_FILE_MARKER} {_url!q}`,
    '--', input,
  ];
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Parse gallery-dl's `-j` output: `[2, post]`, `[3, url, file]`,
 * `[6, url, child]` and `[-1, { error, message }]` messages.
 * @param {string} stdout
 */
export function parseMessages(stdout) {
  let data;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new FerryError('EXTRACTION_FAILED', { internal: 'gallery-dl printed invalid JSON' });
  }
  if (!Array.isArray(data)) throw new FerryError('EXTRACTION_FAILED', { internal: 'gallery-dl JSON is not a message list' });
  /** @type {{ posts: object[], files: { index: number, url: string, meta: any }[], children: { url: string, meta: any }[], errors: { name: string, message: string }[] }} */
  const out = { posts: [], files: [], children: [], errors: [] };
  for (const msg of data) {
    if (!Array.isArray(msg)) throw new FerryError('EXTRACTION_FAILED', { internal: 'malformed gallery-dl message' });
    const [type, a, b] = msg;
    if (type === 2 && isObject(a)) out.posts.push(a);
    else if (type === 3 && typeof a === 'string' && isObject(b)) out.files.push({ index: out.files.length + 1, url: a, meta: b });
    else if (type === 6 && typeof a === 'string' && isObject(b)) out.children.push({ url: a, meta: b });
    else if (type === -1 && isObject(a)) out.errors.push({ name: String(a.error ?? 'Error'), message: String(a.message ?? '') });
    else if (typeof type === 'string' && typeof a === 'string') out.errors.push({ name: type, message: a }); // older gallery-dl
    else if ([2, 3, 6, -1].includes(type)) throw new FerryError('EXTRACTION_FAILED', { internal: `malformed gallery-dl message type ${type}` });
    // other (obsolete) message types are ignored
  }
  return out;
}

// --------------------------------------------------------------- metadata

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function plainText(value, max = 120) {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const firstText = (...values) => {
  for (const v of values) {
    const t = plainText(v);
    if (t) return t;
  }
  return null;
};

function positiveNumber(v) {
  const n = typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const isHttp = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

function extensionOf(url, meta) {
  const own = typeof meta.extension === 'string' ? meta.extension.toLowerCase() : '';
  if (/^[a-z0-9]{1,5}$/.test(own)) return own;
  try {
    const last = new URL(url).pathname.split('/').pop() ?? '';
    const m = /\.([A-Za-z0-9]{1,5})$/.exec(last);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/** image | video | other — only http(s) images are ever offered. */
function classify(file) {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(file.url)?.[1]?.toLowerCase();
  const ext = extensionOf(file.url, file.meta);
  if (scheme === 'ytdl') return { kind: 'video', ext };
  if (scheme !== 'http' && scheme !== 'https') return { kind: 'other', ext };
  if (ext && IMAGES.has(ext)) return { kind: 'image', ext: ext === 'jpeg' || ext === 'jpe' ? 'jpg' : ext };
  if (ext && VIDEOS.has(ext)) return { kind: 'video', ext };
  return { kind: 'other', ext };
}

function previewOf(meta) {
  const candidates = [meta.preview_url, meta.media?.preview_url, meta.thumbnail_url, meta.thumbnail, meta.thumb, meta.urls?.small, meta.src?.medium];
  return candidates.find(isHttp) ?? null;
}

function uploaderOf(m) {
  const pick = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null);
  return (
    pick(m.account?.display_name) ?? pick(m.account?.username) ?? pick(m.user?.name) ?? pick(m.user?.username) ?? pick(m.author?.name) ??
    pick(m.owner?.username) ?? pick(m.owner?.name) ?? pick(m.creator?.name) ?? pick(m.username) ?? pick(m.uploader) ?? pick(m.artist) ??
    pick(typeof m.user === 'string' ? m.user : null) ?? pick(typeof m.author === 'string' ? m.author : null)
  );
}

function uploadDateOf(m) {
  for (const v of [m.date, m.created_at, m.date_created, m.published_at]) {
    const d = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(v) : null;
    if (d) return `${d[1]}${d[2]}${d[3]}`;
  }
  return null;
}

/**
 * Turn parsed messages into the info object normalizeInfo() understands
 * (`_type: 'gallery'`). File URLs stay in it: it never leaves the server.
 * @param {{ messages: ReturnType<typeof parseMessages>, pageUrl: string, maxItems: number, fallbackTitle: string }} p
 */
export function buildGallery({ messages, pageUrl, maxItems, fallbackTitle }) {
  const post = messages.posts[0] ?? {};
  const firstFile = messages.files[0]?.meta ?? {};
  const within = messages.files.filter((f) => f.index <= maxItems);
  const items = [];
  const skipped = { videos: 0, other: 0, links: messages.children.length };
  for (const f of within) {
    const c = classify(f);
    if (c.kind === 'video') skipped.videos += 1;
    else if (c.kind === 'other') skipped.other += 1;
    else {
      const m = f.meta;
      items.push({
        index: f.index,
        url: f.url,
        ext: c.ext,
        width: positiveNumber(m.width) ?? positiveNumber(m.image_width) ?? positiveNumber(m.media?.meta?.original?.width),
        height: positiveNumber(m.height) ?? positiveNumber(m.image_height) ?? positiveNumber(m.media?.meta?.original?.height),
        filesize: positiveNumber(m.filesize) ?? positiveNumber(m.size) ?? positiveNumber(m.file_size) ?? positiveNumber(m.bytes),
        preview: previewOf(m) ?? f.url,
      });
    }
  }
  const category = typeof post.category === 'string' ? post.category : typeof firstFile.category === 'string' ? firstFile.category : null;
  // Album extractors (Imgur, Flickr sets…) describe each image as its own post and
  // nest the album that the user linked to: that album is the gallery.
  const group = [post.album, post.set, post.gallery].find(isObject) ?? {};
  const id = group.id ?? post.gallery_id ?? post.album_id ?? post.id ?? firstFile.id ?? null;
  return {
    _type: 'gallery',
    id: id == null ? null : String(id),
    title:
      firstText(group.title, group.name, post.title, post.name, post.description, post.content, post.caption, firstFile.title, firstFile.description, firstFile.alt_description) ??
      fallbackTitle,
    uploader: uploaderOf(post) ?? uploaderOf(firstFile),
    upload_date: uploadDateOf(post) ?? uploadDateOf(firstFile),
    webpage_url: pageUrl,
    extractor: category ? `gallery-dl:${category}` : 'gallery-dl',
    thumbnail: items[0]?.preview ?? null,
    gallery: { items, truncated: messages.files.length > maxItems, skipped },
  };
}

// --------------------------------------------------------------- downloads

/**
 * Pair gallery-dl's download output with the chosen indexes. gallery-dl
 * downloads in index order, printing the marker before each file and the
 * saved path after a success ("# path" when the file already exists from an
 * earlier attempt). A marker without a path means that file failed.
 * @param {number[]} indexes
 */
export function createDownloadTracker(indexes) {
  const order = [...new Set(indexes)].sort((a, b) => a - b);
  /** @type {Map<number, string>} */
  const byIndex = new Map();
  const claimed = new Set();
  let started = 0;
  let current = null;
  return {
    /** Number of chosen files gallery-dl has begun. */
    get started() {
      return started;
    },
    onLine(raw) {
      const line = String(raw).trim();
      if (line.startsWith(`${GDL_FILE_MARKER} `)) {
        current = started < order.length ? order[started] : null;
        if (current != null) started += 1;
        return;
      }
      if (current == null || !line) return;
      const name = path.basename(line.startsWith('# ') ? line.slice(2) : line);
      if (name && !claimed.has(name)) {
        claimed.add(name);
        byIndex.set(current, name);
      }
      current = null;
    },
    /** @returns {{ index: number, name: string }[]} */
    files() {
      return order.filter((i) => byIndex.has(i)).map((i) => ({ index: i, name: /** @type {string} */ (byIndex.get(i)) }));
    },
  };
}

// --------------------------------------------------------------- errors

const ERROR_NAMES = Object.freeze({
  NotFoundError: 'CONTENT_UNAVAILABLE',
  AuthorizationError: 'AUTH_REQUIRED',
  AuthRequired: 'AUTH_REQUIRED',
  AuthenticationError: 'AUTH_REQUIRED',
  ChallengeError: 'SOURCE_RATE_LIMITED', // a bot check Ferry never solves
});

const NETWORK = /NewConnectionError|Failed to establish a new connection|ConnectTimeout|ReadTimeout|ConnectionError|ProxyError|RemoteDisconnected|Max retries exceeded/i;

/**
 * Map a failed gallery-dl run to a Ferry error code.
 * @param {{ errors?: { name: string, message: string }[], stderr?: string, exitCode?: number|null, fallback?: string }} p
 */
export function classifyGalleryError({ errors = [], stderr = '', exitCode = null, fallback = 'EXTRACTION_FAILED' }) {
  const text = `${String(stderr ?? '')}\n${errors.map((e) => `${e.name}: ${e.message}`).join('\n')}`;
  // The egress proxy's own verdicts are the most specific (and security-relevant).
  if (text.includes(BLOCK_REASON_PHRASE)) return 'BLOCKED_DESTINATION';
  if (text.includes(LIMIT_REASON_PHRASE)) return 'FILE_TOO_LARGE';
  for (const e of errors) {
    if (ERROR_NAMES[e.name]) return ERROR_NAMES[e.name];
    const code = classifyEngineError(`${e.name}: ${e.message}`, '');
    if (code) return code;
  }
  if (exitCode === 64) return 'UNSUPPORTED_PLATFORM';
  if (NETWORK.test(String(stderr ?? ''))) return 'NETWORK_ERROR';
  return classifyEngineError(String(stderr ?? ''), fallback);
}
