/**
 * Download-name templating and sanitization.
 *
 * Names produced here are only ever used in `Content-Disposition` headers and
 * UI previews — never as paths on the server (job files use server-generated
 * names inside a UUID directory).
 */

export const DEFAULT_TEMPLATE = '{title}';
export const MAX_TEMPLATE_LENGTH = 120;
export const TEMPLATE_TOKENS = Object.freeze(['title', 'uploader', 'platform', 'id', 'quality', 'date']);

const MAX_NAME_BYTES = 180; // leaves room for an extension within the common 255-byte limit

// C0/C1 controls, bidi controls (incl. U+202E RTLO spoofing), invisible fillers and BOM.
// ZWNJ/ZWJ (U+200C/U+200D) and variation selectors are kept: emoji sequences
// and scripts such as Persian need them to render correctly.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
const INVISIBLE_CHARS = /[\u00ad\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/g;
const RESERVED_CHARS = /[<>:"/\\|?*]/g;
const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\.|$)/i;

const encoder = new TextEncoder();

function byteLength(s) {
  return encoder.encode(s).length;
}

function graphemes(s) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), (x) => x.segment);
  }
  return Array.from(s);
}

/** Truncate to a UTF-8 byte budget without splitting a grapheme cluster. */
export function truncateBytes(s, maxBytes) {
  if (byteLength(s) <= maxBytes) return s;
  let out = '';
  let used = 0;
  for (const g of graphemes(s)) {
    const b = byteLength(g);
    if (used + b > maxBytes) break;
    out += g;
    used += b;
  }
  return out;
}

/**
 * Make an arbitrary string safe to use as a file name on Windows, macOS,
 * Linux, Android and iOS.
 * @param {unknown} input
 * @param {{ fallback?: string, maxBytes?: number }} [opts]
 */
export function sanitizeFilename(input, { fallback = 'download', maxBytes = MAX_NAME_BYTES } = {}) {
  let s = String(input ?? '');
  try {
    s = s.normalize('NFC');
  } catch {
    /* ignore malformed strings */
  }
  s = s
    .replace(CONTROL_CHARS, ' ')
    .replace(INVISIBLE_CHARS, '')
    .replace(RESERVED_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s-]+/, '')
    .replace(/[.\s]+$/, '');
  if (WINDOWS_DEVICE.test(s)) s = `_${s}`;
  s = truncateBytes(s, maxBytes).replace(/[.\s]+$/, '').trim();
  return s || fallback;
}

/**
 * Render a naming template. Unknown tokens are dropped; each value is
 * sanitized before insertion so a title cannot inject separators.
 * @param {string} template
 * @param {Partial<Record<(typeof TEMPLATE_TOKENS)[number], string|number|null|undefined>>} vars
 */
export function renderTemplate(template, vars) {
  const t = String(template || DEFAULT_TEMPLATE).slice(0, MAX_TEMPLATE_LENGTH);
  const rendered = t.replace(/\{(\w+)\}/g, (_, key) => {
    if (!TEMPLATE_TOKENS.includes(key)) return '';
    const v = vars[key];
    return v == null || v === '' ? '' : sanitizeFilename(String(v), { fallback: '' });
  });
  // Collapse leftovers such as "  - [] " when a token was empty.
  return rendered
    .replace(/\[\s*\]|\(\s*\)/g, '')
    .replace(/\s*-\s*(-\s*)+/g, ' - ')
    .replace(/^\s*[-–—_]\s*|\s*[-–—_]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Full download name: rendered template + server-chosen extension.
 * @param {{ template?: string, vars: object, ext: string, fallback?: string }} p
 */
export function buildDownloadName({ template, vars, ext, fallback = 'download' }) {
  const base = sanitizeFilename(renderTemplate(template ?? DEFAULT_TEMPLATE, vars), { fallback });
  const safeExt = String(ext || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return safeExt ? `${base}.${safeExt}` : base;
}

/** Validate a user template (length and allowed tokens). */
export function validateTemplate(template) {
  if (typeof template !== 'string') return { ok: false, reason: 'type' };
  if (template.length === 0 || template.length > MAX_TEMPLATE_LENGTH) return { ok: false, reason: 'length' };
  const unknown = [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => !TEMPLATE_TOKENS.includes(k));
  if (unknown.length) return { ok: false, reason: 'unknown_token', tokens: unknown };
  return { ok: true };
}

function encodeRFC5987(value) {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function asciiFallback(base) {
  const ascii = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/_+/g, '_')
    .trim();
  // A name with no letters or digits left (e.g. fully Arabic/CJK) is useless as a fallback.
  return /[A-Za-z0-9]/.test(ascii) ? ascii : 'download';
}

/**
 * RFC 6266 Content-Disposition with an ASCII fallback and RFC 5987 UTF-8 name.
 * The input is sanitized again so CR/LF can never reach a header.
 * @param {string} filename
 * @param {'attachment'|'inline'} [type]
 */
export function contentDisposition(filename, type = 'attachment') {
  const dot = filename.lastIndexOf('.');
  const ext = dot > 0 ? filename.slice(dot + 1) : '';
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const safeBase = sanitizeFilename(base);
  const safeExt = ext.replace(/[^A-Za-z0-9]/g, '');
  const safe = safeExt ? `${safeBase}.${safeExt}` : safeBase;
  const fallback = safeExt ? `${asciiFallback(safeBase)}.${safeExt}` : asciiFallback(safeBase);
  const disposition = type === 'inline' ? 'inline' : 'attachment';
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeRFC5987(safe)}`;
}
