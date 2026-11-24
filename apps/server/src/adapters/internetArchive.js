/**
 * Internet Archive via its official Metadata API (category 1: the archive
 * publishes item files for download). Lending-library items are refused.
 * https://archive.org/developers/metadata-schema/
 */
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { downloadToFile } from './http.js';
import { pickFile } from './pick.js';
import { sanitizeFormats } from '../media/normalize.js';

const ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

/** Format names used in IA item metadata → stream facts. */
const IA_FORMATS = [
  [/^(h\.264( HD| IA| 720P)?|MPEG4|512Kb MPEG4|HiRes MPEG4)$/i, { ext: 'mp4', vcodec: 'h264', acodec: 'aac' }],
  [/^Ogg Video$/i, { ext: 'ogv', vcodec: 'theora', acodec: 'vorbis' }],
  [/^WebM$/i, { ext: 'webm', vcodec: null, acodec: null }],
  [/^Matroska$/i, { ext: 'mkv', vcodec: null, acodec: null }],
  [/^QuickTime$/i, { ext: 'mov', vcodec: null, acodec: null }],
  [/^(VBR|\d+Kbps) MP3$|^MP3$/i, { ext: 'mp3', vcodec: 'none', acodec: 'mp3' }],
  [/^Ogg Vorbis$/i, { ext: 'ogg', vcodec: 'none', acodec: 'vorbis' }],
  [/^(24bit )?Flac$/i, { ext: 'flac', vcodec: 'none', acodec: 'flac' }],
  [/^Apple Lossless Audio$/i, { ext: 'm4a', vcodec: 'none', acodec: 'alac' }],
  [/^(Advanced Audio Coding|AAC)$/i, { ext: 'm4a', vcodec: 'none', acodec: 'aac' }],
  [/^WAVE$/i, { ext: 'wav', vcodec: 'none', acodec: 'pcm' }],
];

function parseLength(v) {
  if (v == null) return null;
  const s = String(v);
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const m = /^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(s) ?? /^()(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(s);
  if (!m) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function licenseLabel(url) {
  if (!url || typeof url !== 'string') return null;
  if (/publicdomain\/mark/i.test(url)) return 'Public Domain Mark';
  if (/publicdomain\/zero/i.test(url)) return 'CC0 (public domain dedication)';
  const m = /creativecommons\.org\/licenses\/([a-z-]+)\/(\d\.\d)/i.exec(url);
  if (m) return `CC ${m[1].toUpperCase()} ${m[2]}`;
  return 'See the item page for rights';
}

function first(v) {
  return Array.isArray(v) ? v.join(', ') : v;
}

/** @param {URL} u */
export function parseArchiveUrl(u) {
  const parts = u.pathname.split('/').filter(Boolean);
  if (!['details', 'download', 'embed'].includes(parts[0]) || !parts[1]) return null;
  const identifier = decodeURIComponent(parts[1]);
  if (!ID_RE.test(identifier)) return null;
  const file = parts.length > 2 ? decodeURIComponent(parts.slice(2).join('/')) : null;
  return { identifier, file };
}

/** @param {import('./index.js').AdapterDeps} deps */
export function createInternetArchiveAdapter(deps) {
  async function fetchItem(identifier, signal) {
    const res = await deps.fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, { signal, timeoutMs: 20_000, headers: { accept: 'application/json' } });
    if (res.status === 404) {
      res.discard();
      throw new FerryError('CONTENT_UNAVAILABLE');
    }
    if (res.status !== 200) {
      res.discard();
      throw new FerryError(res.status === 429 ? 'SOURCE_RATE_LIMITED' : 'EXTRACTION_FAILED', { internal: `IA metadata HTTP ${res.status}` });
    }
    const item = await res.json(16 * 1024 * 1024);
    if (!item || !item.metadata) throw new FerryError('CONTENT_UNAVAILABLE', { internal: 'IA item missing or dark' });
    if (item.is_dark) throw new FerryError('CONTENT_UNAVAILABLE');
    const restricted = String(item.metadata['access-restricted-item'] ?? '').toLowerCase() === 'true';
    if (restricted) {
      throw new FerryError('AUTH_REQUIRED', { message: 'This item can only be borrowed through the Internet Archive lending library, so Ferry cannot download it.' });
    }
    return item;
  }

  function toInfo(item, identifier, onlyFile) {
    const md = item.metadata;
    const files = (item.files ?? []).map((f) => {
      const spec = IA_FORMATS.find(([re]) => re.test(String(f.format ?? '')))?.[1];
      return spec ? { f, spec } : null;
    }).filter(Boolean);

    /** @type {Map<string, { f: any, spec: any }[]>} */
    const groups = new Map();
    for (const x of files) {
      const key = x.f.source === 'original' ? x.f.name : x.f.original ?? x.f.name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(x);
    }
    let keys = [...groups.keys()];
    if (onlyFile) {
      keys = keys.filter((k) => k === onlyFile || groups.get(k).some((x) => x.f.name === onlyFile));
      if (!keys.length) throw new FerryError('CONTENT_UNAVAILABLE', { internal: 'file not in item' });
    }
    if (!keys.length) throw new FerryError('NO_MEDIA_FOUND');

    const common = {
      id: identifier,
      uploader: first(md.creator) ?? null,
      upload_date: typeof md.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(md.date) ? md.date.slice(0, 10).replaceAll('-', '') : null,
      license: licenseLabel(md.licenseurl),
      extractor: 'archive.org',
      thumbnail: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    };

    if (keys.length > 1) {
      return {
        _type: 'playlist',
        ...common,
        title: first(md.title) ?? identifier,
        webpage_url: `https://archive.org/details/${encodeURIComponent(identifier)}`,
        entries: keys.map((k) => {
          const g = groups.get(k);
          const orig = g.find((x) => x.f.name === k)?.f ?? g[0].f;
          return {
            id: k,
            title: orig.title ?? k.replace(/\.[^.]+$/, ''),
            duration: parseLength(orig.length ?? g.find((x) => x.f.length)?.f.length),
            url: `https://archive.org/details/${encodeURIComponent(identifier)}/${encodeURIComponent(k)}`,
          };
        }),
      };
    }
    const group = groups.get(keys[0]);
    const orig = group.find((x) => x.f.name === keys[0])?.f ?? group[0].f;
    const kbps = (name) => {
      const m = /(\d+)Kbps/i.exec(String(name ?? ''));
      return m ? Number(m[1]) : null;
    };
    return {
      ...common,
      title: keys.length === 1 && files.length > group.length ? orig.title ?? first(md.title) ?? identifier : first(md.title) ?? orig.title ?? identifier,
      webpage_url: `https://archive.org/details/${encodeURIComponent(identifier)}`,
      duration: parseLength(orig.length ?? group.find((x) => x.f.length)?.f.length),
      formats: group.map(({ f, spec }) => ({
        format_id: f.name,
        url: `https://archive.org/download/${encodeURIComponent(identifier)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
        ext: spec.ext,
        protocol: 'https',
        vcodec: spec.vcodec,
        acodec: spec.acodec,
        width: Number(f.width) || null,
        height: Number(f.height) || null,
        abr: kbps(f.format) ?? (f.bitrate ? Number(f.bitrate) : null),
        filesize: Number(f.size) || null,
        format_note: f.format,
      })),
    };
  }

  return {
    id: 'internet-archive',

    supports(platform, detection) {
      return platform.id === 'internet-archive' && Boolean(detection?.url && parseArchiveUrl(detection.url));
    },

    async probe({ url, signal }) {
      const parsed = parseArchiveUrl(new URL(url));
      if (!parsed) throw new FerryError('UNSUPPORTED_PLATFORM');
      const item = await fetchItem(parsed.identifier, signal);
      return toInfo(item, parsed.identifier, parsed.file);
    },

    /** @param {import('./index.js').DownloadContext} ctx */
    async download({ url, selection, media, jobDir, signal, onProgress, maxBytes }) {
      let formats = media?.raw?.formats ?? [];
      if (!formats.length) {
        const parsed = parseArchiveUrl(new URL(url));
        const info = toInfo(await fetchItem(parsed.identifier, signal), parsed.identifier, parsed.file);
        if (info._type === 'playlist') throw new FerryError('NO_MEDIA_FOUND', { internal: 'entry resolved to a group' });
        formats = sanitizeFormats(info.formats).kept;
      }
      const chosen = pickFile(formats, selection);
      if (!chosen?.url) throw new FerryError('FORMAT_UNAVAILABLE');
      const file = path.join(jobDir, `src.${chosen.ext ?? 'bin'}`);
      await downloadToFile({
        fetch: deps.fetch,
        url: chosen.url,
        file,
        maxBytes,
        signal,
        stallTimeoutMs: deps.config.limits.stallTimeoutMs,
        onProgress: (p) => onProgress({
          phase: 'downloading',
          percent: p.totalBytes ? Math.min(99.5, (p.downloadedBytes / p.totalBytes) * 100) : null,
          downloadedBytes: p.downloadedBytes,
          totalBytes: p.totalBytes,
          totalIsEstimate: false,
          speedBps: p.speedBps,
          etaSec: p.etaSec,
        }),
      });
      return { srcFile: file, subtitles: [] };
    },
  };
}
