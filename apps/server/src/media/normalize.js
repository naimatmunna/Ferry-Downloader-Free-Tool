/**
 * Normalize extractor output (yt-dlp info dicts, or adapter-built
 * equivalents) into Ferry's public MediaInfo. Raw format URLs never leave the
 * server; DRM-flagged formats and non-HTTP protocols are removed here so the
 * UI can only offer what Ferry is allowed and able to produce.
 */
import { FerryError } from '@ferry/shared/errors';
import {
  AUDIO_FORMAT_IDS,
  VIDEO_CONTAINER_IDS,
  normalizeAudioCodec,
  normalizeVideoCodec,
  qualityClass,
  qualityLabel,
} from '@ferry/shared/formats';
import { ALLOWED_PROTOCOL_RE } from '../engines/ytdlp.js';

const ALLOWED_PROTOCOL = new RegExp(ALLOWED_PROTOCOL_RE);

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const str = (v, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

/**
 * @typedef {{ id: string, ext: string|null, protocol: string, vcodec: string|null, acodec: string|null,
 *   width: number|null, height: number|null, fps: number|null, tbr: number|null, vbr: number|null, abr: number|null,
 *   filesize: number|null, filesizeApprox: number|null, dynamicRange: string|null, language: string|null, note: string|null }} Fmt
 */

/** @param {any[]} raw */
export function sanitizeFormats(raw) {
  /** @type {Fmt[]} */
  const kept = [];
  let drm = 0;
  let unsupportedProtocol = 0;
  for (const f of Array.isArray(raw) ? raw : []) {
    if (!f || typeof f !== 'object') continue;
    if (f.has_drm === true || f.has_drm === 'maybe') {
      drm += 1;
      continue;
    }
    const protocol = typeof f.protocol === 'string' ? f.protocol : 'https';
    if (!ALLOWED_PROTOCOL.test(protocol)) {
      unsupportedProtocol += 1;
      continue;
    }
    if (f.ext === 'mhtml' || /storyboard/i.test(f.format_note ?? '') || /^sb\d/.test(String(f.format_id ?? ''))) continue;
    kept.push({
      id: String(f.format_id ?? kept.length),
      url: isHttpUrl(f.url) ? f.url : null, // server-side only (raw formats are never exposed)
      ext: str(f.ext, 10),
      protocol,
      vcodec: f.vcodec === 'none' ? 'none' : normalizeVideoCodec(f.vcodec) ?? (f.vcodec ? String(f.vcodec) : null),
      acodec: f.acodec === 'none' ? 'none' : normalizeAudioCodec(f.acodec) ?? (f.acodec ? String(f.acodec) : null),
      width: num(f.width),
      height: num(f.height),
      fps: num(f.fps),
      tbr: num(f.tbr),
      vbr: num(f.vbr),
      abr: num(f.abr),
      filesize: num(f.filesize),
      filesizeApprox: num(f.filesize_approx),
      dynamicRange: str(f.dynamic_range, 20),
      language: str(f.language, 20),
      note: str(f.format_note, 60),
    });
  }
  return { kept, drm, unsupportedProtocol };
}

const hasVideo = (f) => f.vcodec !== 'none' && (f.vcodec != null || f.width != null || f.height != null);
const audioOnly = (f) => f.vcodec === 'none' && f.acodec !== 'none';
const hasAudio = (f) => f.acodec !== 'none' && f.acodec != null;
const unknownStreams = (f) => f.vcodec == null && f.acodec == null && f.width == null && f.height == null;
const sizeOf = (f) => (f ? f.filesize ?? f.filesizeApprox ?? null : null);
const isApprox = (f) => Boolean(f && f.filesize == null && f.filesizeApprox != null);
const rank = (f) => f.tbr ?? f.vbr ?? f.abr ?? (sizeOf(f) ?? 0) / 1e6;

/**
 * @param {Fmt[]} formats
 * @param {number|null} durationSec
 */
export function summarizeFormats(formats, durationSec) {
  // --- audio tracks -------------------------------------------------------
  const audioOnlyFormats = formats.filter(audioOnly);
  /** @type {Map<string, Fmt>} */
  const bestByLang = new Map();
  for (const f of audioOnlyFormats) {
    const key = f.language ?? 'default';
    const cur = bestByLang.get(key);
    if (!cur || rank(f) > rank(cur)) bestByLang.set(key, f);
  }
  let tracks = [...bestByLang.entries()].map(([key, f]) => ({
    id: key,
    language: f.language,
    codec: f.acodec,
    abrKbps: f.abr != null ? Math.round(f.abr) : f.tbr != null ? Math.round(f.tbr) : null,
    sizeBytes: sizeOf(f) ?? (f.abr && durationSec ? Math.round((f.abr * 1000 * durationSec) / 8) : null),
    approx: isApprox(f) || (sizeOf(f) == null && f.abr != null),
    formatId: f.id,
  }));
  const combined = formats.filter((f) => hasVideo(f) && hasAudio(f));
  if (!tracks.length && combined.length) {
    const best = combined.reduce((a, b) => (rank(b) > rank(a) ? b : a));
    tracks = [{ id: 'default', language: best.language, codec: best.acodec, abrKbps: best.abr != null ? Math.round(best.abr) : null, sizeBytes: null, approx: false, formatId: best.id }];
  }
  tracks.sort((a, b) => (b.abrKbps ?? 0) - (a.abrKbps ?? 0));
  const bestAudio = tracks[0] ?? null;

  // --- video qualities ----------------------------------------------------
  const videoFormats = formats.filter(hasVideo);
  /** @type {Map<number, Fmt[]>} */
  const groups = new Map();
  for (const f of videoFormats) {
    const q = qualityClass(f.width, f.height);
    if (q == null) continue;
    const list = groups.get(q) ?? [];
    list.push(f);
    groups.set(q, list);
  }
  const qualities = [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([res, list]) => {
      const best = list.reduce((a, b) => (rank(b) > rank(a) ? b : a));
      const bestVideoOnly = list.filter((f) => !hasAudio(f)).reduce((a, b) => (!a || rank(b) > rank(a) ? b : a), null);
      const bestCombined = list.filter(hasAudio).reduce((a, b) => (!a || rank(b) > rank(a) ? b : a), null);
      const videoBytes = sizeOf(bestVideoOnly ?? best);
      const avBytes = bestVideoOnly && bestAudio ? (videoBytes != null && bestAudio.sizeBytes != null ? videoBytes + bestAudio.sizeBytes : null) : sizeOf(bestCombined ?? best);
      const label = qualityLabel(res);
      return {
        res,
        label: label.short,
        tag: label.tag,
        width: best.width,
        height: best.height,
        fps: Math.max(...list.map((f) => f.fps ?? 0)) || null,
        hdr: list.some((f) => f.dynamicRange && f.dynamicRange !== 'SDR'),
        codecs: [...new Set(list.map((f) => f.vcodec).filter((c) => c && c !== 'none'))],
        sizeBytes: { av: avBytes, video: videoBytes },
        approx: isApprox(bestVideoOnly ?? best) || (bestAudio?.approx ?? false),
      };
    });

  const unknown = formats.length > 0 && formats.every(unknownStreams);
  return {
    qualities,
    tracks,
    bestAudio,
    unknown,
    anyVideo: videoFormats.length > 0 || unknown,
    anyAudio: tracks.length > 0 || unknown || formats.some(hasAudio),
  };
}

function pickThumbnail(info) {
  const list = Array.isArray(info.thumbnails) ? info.thumbnails.filter((t) => isHttpUrl(t?.url)) : [];
  if (list.length) {
    const scored = list.map((t) => ({ t, score: t.width ? -Math.abs(Math.min(t.width, 1920) - 1280) : (t.preference ?? -1000) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].t.url;
  }
  return isHttpUrl(info.thumbnail) ? info.thumbnail : null;
}

function uploadDate(info) {
  const d = str(info.upload_date, 8) ?? str(info.release_date, 8);
  if (d && /^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  const ts = num(info.timestamp) ?? num(info.release_timestamp);
  return ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null;
}

function subtitles(info) {
  const out = [];
  for (const [lang, list] of Object.entries(info.subtitles ?? {})) {
    if (lang === 'live_chat' || !Array.isArray(list) || !list.length) continue;
    out.push({ lang, name: str(list[0]?.name, 60), auto: false, formats: [...new Set(list.map((x) => x?.ext).filter(Boolean))] });
  }
  const autoEntries = Object.entries(info.automatic_captions ?? {}).filter(([, list]) => Array.isArray(list) && list.length);
  // Only the original-language automatic track; machine translations are noise.
  const originals = autoEntries.filter(([lang]) => lang.endsWith('-orig'));
  const auto = originals.length ? originals : autoEntries.length <= 5 ? autoEntries : [];
  for (const [lang, list] of auto) {
    if (out.some((s) => s.lang === lang)) continue;
    out.push({ lang, name: str(list[0]?.name, 60), auto: true, formats: [...new Set(list.map((x) => x?.ext).filter(Boolean))] });
  }
  return out.slice(0, 60);
}

/**
 * @param {any} info yt-dlp info dict (or adapter equivalent)
 * @param {{ maxPlaylistItems?: number }} [opts]
 */
export function normalizeInfo(info, { maxPlaylistItems = 50 } = {}) {
  if (!info || typeof info !== 'object') throw new FerryError('EXTRACTION_FAILED', { internal: 'empty info' });

  const base = {
    title: str(info.title) ?? str(info.fulltitle) ?? 'Untitled',
    uploader: str(info.uploader ?? info.channel ?? info.artist ?? info.creator, 120),
    durationSec: num(info.duration),
    uploadDate: uploadDate(info),
    webpageUrl: isHttpUrl(info.webpage_url) ? info.webpage_url : null,
    license: str(info.license, 120),
    extractor: str(info.extractor, 80),
    thumbnailSource: pickThumbnail(info),
    id: str(String(info.id ?? ''), 80),
  };

  if (info._type === 'gallery') return normalizeGallery(info, base);

  if (info._type === 'playlist' || info._type === 'multi_video') {
    const entries = (Array.isArray(info.entries) ? info.entries : [])
      .filter(Boolean)
      .slice(0, maxPlaylistItems)
      .map((e, i) => {
        const url = isHttpUrl(e.url) ? e.url : isHttpUrl(e.webpage_url) ? e.webpage_url : null;
        return { id: str(String(e.id ?? i), 80) ?? String(i), title: str(e.title) ?? `Item ${i + 1}`, durationSec: num(e.duration), url, extractor: str(e.ie_key ?? e.extractor, 80), thumbnailSource: pickThumbnail(e) };
      })
      .filter((e) => e.url);
    if (!entries.length) throw new FerryError('NO_MEDIA_FOUND');
    return {
      kind: 'playlist',
      ...base,
      isLive: false,
      entryCount: num(info.playlist_count) ?? entries.length,
      entries,
      video: { qualities: [], unknown: true },
      audio: { tracks: [], best: null },
      subtitles: [],
      capabilities: { modes: ['av', 'video', 'audio'], containers: [...VIDEO_CONTAINER_IDS], audioFormats: [...AUDIO_FORMAT_IDS], trim: false },
      raw: { formats: [] },
    };
  }

  const live = info.is_live === true || ['is_live', 'is_upcoming', 'post_live'].includes(info.live_status);
  if (live) throw new FerryError('LIVE_NOT_SUPPORTED');

  const rawFormats = Array.isArray(info.formats) && info.formats.length ? info.formats : info.url ? [info] : [];
  const { kept, drm } = sanitizeFormats(rawFormats);
  if (!kept.length) {
    if (drm > 0) throw new FerryError('DRM_PROTECTED');
    throw new FerryError('NO_MEDIA_FOUND');
  }
  const s = summarizeFormats(kept, base.durationSec);
  const modes = [];
  if (s.anyVideo) modes.push('av', 'video');
  if (s.anyAudio) modes.push('audio');
  if (!modes.length) throw new FerryError('NO_MEDIA_FOUND');

  return {
    kind: s.anyVideo ? 'video' : 'audio',
    ...base,
    isLive: false,
    entryCount: null,
    entries: null,
    video: { qualities: s.qualities, unknown: s.unknown || (s.anyVideo && !s.qualities.length) },
    audio: { tracks: s.tracks, best: s.bestAudio },
    subtitles: subtitles(info),
    capabilities: {
      modes,
      containers: s.anyVideo ? [...VIDEO_CONTAINER_IDS] : [],
      audioFormats: s.anyAudio ? [...AUDIO_FORMAT_IDS] : [],
      trim: base.durationSec != null,
    },
    raw: { formats: kept },
  };
}

const count = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);

/**
 * Image galleries from the gallery-dl adapter. Item URLs and the gallery-dl
 * input go to `raw` (server-only); the public part keeps what the picker shows.
 */
function normalizeGallery(info, base) {
  const g = info.gallery && typeof info.gallery === 'object' ? info.gallery : {};
  const items = [];
  const urls = {};
  for (const i of Array.isArray(g.items) ? g.items : []) {
    if (!i || !Number.isInteger(i.index) || i.index < 1 || !isHttpUrl(i.url) || urls[i.index]) continue;
    urls[i.index] = i.url;
    items.push({
      index: i.index,
      ext: str(i.ext, 5),
      width: num(i.width),
      height: num(i.height),
      sizeBytes: num(i.filesize),
      previewSource: isHttpUrl(i.preview) ? i.preview : null,
    });
  }
  if (!items.length) throw new FerryError('NO_MEDIA_FOUND', { internal: 'gallery has no images' });
  const skipped = g.skipped ?? {};
  return {
    kind: 'gallery',
    ...base,
    durationSec: null,
    isLive: false,
    entryCount: items.length,
    entries: null,
    gallery: { items, truncated: g.truncated === true, skipped: { videos: count(skipped.videos), other: count(skipped.other), links: count(skipped.links) } },
    video: { qualities: [], unknown: false },
    audio: { tracks: [], best: null },
    subtitles: [],
    capabilities: { modes: ['gallery'], containers: [], audioFormats: [], trim: false },
    raw: { formats: [], gallery: { input: str(g.input, 4096), urls } },
  };
}

/**
 * Public projection (no raw formats, no internal URLs). Gallery previews go
 * through the signed thumbnail proxy (`previewUrl`).
 * @param {any} media
 * @param {{ thumbnailUrl?: string|null, previewUrl?: (remote: string) => string|null }} [opts]
 */
export function publicMedia(media, { thumbnailUrl = null, previewUrl = () => null } = {}) {
  const { raw, thumbnailSource, entries, gallery, ...rest } = media;
  return {
    ...rest,
    thumbnailUrl,
    entries: entries ? entries.map(({ url, thumbnailSource: _t, ...e }) => ({ ...e, hasUrl: Boolean(url) })) : null,
    ...(gallery
      ? { gallery: { ...gallery, items: gallery.items.map(({ previewSource, ...i }) => ({ ...i, previewUrl: previewSource ? previewUrl(previewSource) : null })) } }
      : {}),
  };
}
