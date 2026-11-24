/**
 * Output formats, codec compatibility, and quality helpers.
 *
 * Shared so that the UI only ever offers combinations the server can produce,
 * and so that "honest quality" rules (no upscaling, no fake bitrate gains)
 * are computed identically on both sides.
 */

export const MODES = Object.freeze(['av', 'video', 'audio']);

/** @typedef {'h264'|'hevc'|'vp8'|'vp9'|'av1'|'mpeg4'|'prores'|'theora'} VideoCodec */
/** @typedef {'aac'|'mp3'|'opus'|'vorbis'|'flac'|'alac'|'ac3'|'eac3'|'pcm'|'dts'} AudioCodec */

export const VIDEO_CONTAINERS = Object.freeze({
  mp4: Object.freeze({
    id: 'mp4',
    label: 'MP4',
    ext: 'mp4',
    mime: 'video/mp4',
    video: ['h264', 'hevc', 'av1', 'vp9', 'mpeg4'],
    audio: ['aac', 'mp3', 'opus', 'ac3', 'eac3', 'alac', 'flac'],
    encode: { video: 'h264', audio: 'aac' },
    subtitleCodec: 'mov_text',
    legacy: false,
  }),
  webm: Object.freeze({
    id: 'webm',
    label: 'WebM',
    ext: 'webm',
    mime: 'video/webm',
    video: ['vp9', 'vp8', 'av1'],
    audio: ['opus', 'vorbis'],
    encode: { video: 'vp9', audio: 'opus' },
    subtitleCodec: 'webvtt',
    legacy: false,
  }),
  mkv: Object.freeze({
    id: 'mkv',
    label: 'MKV',
    ext: 'mkv',
    mime: 'video/x-matroska',
    video: '*',
    audio: '*',
    encode: { video: 'h264', audio: 'aac' },
    subtitleCodec: 'srt',
    legacy: false,
  }),
  mov: Object.freeze({
    id: 'mov',
    label: 'MOV',
    ext: 'mov',
    mime: 'video/quicktime',
    video: ['h264', 'hevc', 'mpeg4', 'prores'],
    audio: ['aac', 'alac', 'mp3', 'pcm'],
    encode: { video: 'h264', audio: 'aac' },
    subtitleCodec: 'mov_text',
    legacy: false,
  }),
  avi: Object.freeze({
    id: 'avi',
    label: 'AVI',
    ext: 'avi',
    mime: 'video/x-msvideo',
    video: ['mpeg4'],
    audio: ['mp3', 'ac3', 'pcm'],
    encode: { video: 'mpeg4', audio: 'mp3' },
    subtitleCodec: null,
    legacy: true,
  }),
});

export const VIDEO_CONTAINER_IDS = Object.freeze(Object.keys(VIDEO_CONTAINERS));

export const AUDIO_BITRATES = Object.freeze([64, 96, 128, 192, 256, 320]);

export const AUDIO_FORMATS = Object.freeze({
  mp3: Object.freeze({ id: 'mp3', label: 'MP3', ext: 'mp3', mime: 'audio/mpeg', codec: 'mp3', lossless: false, bitrates: AUDIO_BITRATES }),
  m4a: Object.freeze({ id: 'm4a', label: 'M4A', ext: 'm4a', mime: 'audio/mp4', codec: 'aac', lossless: false, bitrates: AUDIO_BITRATES }),
  aac: Object.freeze({ id: 'aac', label: 'AAC', ext: 'aac', mime: 'audio/aac', codec: 'aac', lossless: false, bitrates: AUDIO_BITRATES }),
  wav: Object.freeze({ id: 'wav', label: 'WAV', ext: 'wav', mime: 'audio/wav', codec: 'pcm', lossless: true, bitrates: Object.freeze([]) }),
  flac: Object.freeze({ id: 'flac', label: 'FLAC', ext: 'flac', mime: 'audio/flac', codec: 'flac', lossless: true, bitrates: Object.freeze([]) }),
  opus: Object.freeze({ id: 'opus', label: 'Opus', ext: 'opus', mime: 'audio/ogg', codec: 'opus', lossless: false, bitrates: AUDIO_BITRATES }),
  ogg: Object.freeze({ id: 'ogg', label: 'OGG', ext: 'ogg', mime: 'audio/ogg', codec: 'vorbis', lossless: false, bitrates: AUDIO_BITRATES }),
});

export const AUDIO_FORMAT_IDS = Object.freeze(Object.keys(AUDIO_FORMATS));

/** Standard quality rungs, labelled by the class of the frame (see `qualityClass`). */
export const QUALITY_LADDER = Object.freeze([144, 240, 360, 480, 720, 1080, 1440, 2160, 4320]);

/** Long-side width that defines each rung for 16:9 content. */
const RUNG_LONG_SIDE = Object.freeze({ 144: 256, 240: 426, 360: 640, 480: 854, 720: 1280, 1080: 1920, 1440: 2560, 2160: 3840, 4320: 7680 });

const QUALITY_TAGS = Object.freeze({ 720: 'HD', 1080: 'Full HD', 1440: 'QHD', 2160: '4K', 4320: '8K' });

/**
 * Map frame dimensions to a quality rung. Uses both sides so that portrait
 * (1080×1920 → 1080p), 4:3 (1440×1080 → 1080p) and letterboxed cinema
 * (1920×800 → 1080p) content are labelled the way people expect.
 * @param {number|null|undefined} width
 * @param {number|null|undefined} height
 * @returns {number|null}
 */
export function qualityClass(width, height) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (!w && !h) return null;
  const short = w && h ? Math.min(w, h) : w || h;
  const long = Math.max(w, h);
  let byShort = QUALITY_LADDER[0];
  let byLong = QUALITY_LADDER[0];
  for (const rung of QUALITY_LADDER) {
    if (short >= rung * 0.9) byShort = rung;
    if (w && h && long >= RUNG_LONG_SIDE[rung] * 0.9) byLong = rung;
  }
  return Math.max(byShort, w && h ? byLong : 0);
}

/**
 * @param {number|'best'} res
 * @returns {{ short: string, tag: string|null, full: string }}
 */
export function qualityLabel(res) {
  if (res === 'best') return { short: 'Best', tag: null, full: 'Best available' };
  const tag = QUALITY_TAGS[res] ?? null;
  const short = `${res}p`;
  return { short, tag, full: tag ? `${short} ${tag}` : short };
}

/**
 * Normalize codec identifiers from yt-dlp (`avc1.640028`), ffprobe (`h264`)
 * or RFC 6381 strings into short canonical names.
 * @param {string|null|undefined} codec
 * @returns {VideoCodec|string|null}
 */
export function normalizeVideoCodec(codec) {
  if (!codec) return null;
  const c = String(codec).trim().toLowerCase();
  if (!c || c === 'none') return null;
  if (/^(avc|h\.?264|x264)/.test(c)) return 'h264';
  if (/^(hev|hvc|h\.?265|hevc|x265)/.test(c)) return 'hevc';
  if (/^(vp0?9|vp9)/.test(c)) return 'vp9';
  if (/^(vp0?8|vp8)/.test(c)) return 'vp8';
  if (/^(av01|av1|libaom|libdav1d)/.test(c)) return 'av1';
  if (/^(mp4v|mpeg4|xvid|divx|fmp4)/.test(c)) return 'mpeg4';
  if (/^(prores|apch|apcn|apcs|apco|ap4h)/.test(c)) return 'prores';
  if (/^theora/.test(c)) return 'theora';
  return c.split(/[.\s]/)[0];
}

/**
 * @param {string|null|undefined} codec
 * @returns {AudioCodec|string|null}
 */
export function normalizeAudioCodec(codec) {
  if (!codec) return null;
  const c = String(codec).trim().toLowerCase();
  if (!c || c === 'none') return null;
  if (/^mp4a\.(6b|69)$/.test(c) || /^mp4a\.40\.34$/.test(c)) return 'mp3';
  if (/^(mp4a|aac|he-?aac)/.test(c)) return 'aac';
  if (/^(mp3|mpga|mp2a|mpeg-?1)/.test(c)) return 'mp3';
  if (/^opus/.test(c)) return 'opus';
  if (/^vorbis/.test(c)) return 'vorbis';
  if (/^flac/.test(c)) return 'flac';
  if (/^alac/.test(c)) return 'alac';
  if (/^(ec-3|eac3|e-ac-3)/.test(c)) return 'eac3';
  if (/^(ac-3|ac3)/.test(c)) return 'ac3';
  if (/^(pcm|lpcm|s16|s24|f32)/.test(c)) return 'pcm';
  if (/^dts/.test(c)) return 'dts';
  return c.split(/[.\s]/)[0];
}

/**
 * @param {keyof typeof VIDEO_CONTAINERS} container
 * @param {string|null} vcodec normalized
 */
export function containerAcceptsVideo(container, vcodec) {
  const spec = VIDEO_CONTAINERS[container];
  if (!spec || !vcodec) return false;
  return spec.video === '*' || spec.video.includes(vcodec);
}

/**
 * @param {keyof typeof VIDEO_CONTAINERS} container
 * @param {string|null} acodec normalized
 */
export function containerAcceptsAudio(container, acodec) {
  const spec = VIDEO_CONTAINERS[container];
  if (!spec || !acodec) return false;
  return spec.audio === '*' || spec.audio.includes(acodec);
}

/**
 * Whether an audio source can be stream-copied into an audio output format
 * (no generation loss).
 * @param {keyof typeof AUDIO_FORMATS} format
 * @param {string|null} acodec normalized
 */
export function audioFormatAccepts(format, acodec) {
  const spec = AUDIO_FORMATS[format];
  if (!spec || !acodec) return false;
  if (spec.codec === 'pcm') return false; // WAV is always decoded to 16-bit PCM
  return spec.codec === acodec;
}

/**
 * Describe what an audio conversion will do, for honest UI copy.
 * @param {{ codec: string|null, abrKbps: number|null }} source
 * @param {{ format: keyof typeof AUDIO_FORMATS, bitrate: 'source'|number }} target
 * @returns {{ action: 'copy'|'transcode'|'decode', aboveSource: boolean, losslessFromLossy: boolean, effectiveKbps: number|null }}
 */
export function describeAudioConversion(source, target) {
  const spec = AUDIO_FORMATS[target.format];
  const srcLossless = ['flac', 'alac', 'pcm'].includes(source.codec ?? '');
  if (!spec) return { action: 'transcode', aboveSource: false, losslessFromLossy: false, effectiveKbps: null };
  if (spec.lossless) {
    return { action: 'decode', aboveSource: false, losslessFromLossy: !srcLossless, effectiveKbps: null };
  }
  const canCopy = audioFormatAccepts(target.format, source.codec);
  if (target.bitrate === 'source') {
    return {
      action: canCopy ? 'copy' : 'transcode',
      aboveSource: false,
      losslessFromLossy: false,
      effectiveKbps: canCopy ? source.abrKbps : nearestBitrateAtOrAbove(equivalentKbps(source.codec, source.abrKbps, spec.codec)),
    };
  }
  const kbps = Number(target.bitrate);
  return {
    action: 'transcode',
    aboveSource: !srcLossless && source.abrKbps != null && kbps > source.abrKbps * 1.15,
    losslessFromLossy: false,
    effectiveKbps: kbps,
  };
}

/**
 * Approximate bits needed relative to Opus for similar perceived quality.
 * Deliberately coarse: used only to pick a sensible default when the user
 * keeps "Source" quality but the codec has to change.
 */
const CODEC_EFFICIENCY = Object.freeze({ opus: 1, vorbis: 1.2, aac: 1.25, mp3: 1.5, ac3: 1.6, eac3: 1.3 });

/**
 * Bitrate in `targetCodec` that roughly matches `kbps` of `sourceCodec`.
 * @returns {number|null}
 */
export function equivalentKbps(sourceCodec, kbps, targetCodec) {
  if (!kbps || !Number.isFinite(kbps)) return null;
  const from = CODEC_EFFICIENCY[sourceCodec] ?? 1.25;
  const to = CODEC_EFFICIENCY[targetCodec] ?? 1.25;
  return (kbps * to) / from;
}

/**
 * Smallest standard bitrate that is ≥ the source bitrate (used when the user
 * picks "Source" but the codec must change). Defaults to 192 when unknown.
 * @param {number|null|undefined} kbps
 */
export function nearestBitrateAtOrAbove(kbps) {
  if (!kbps || !Number.isFinite(kbps)) return 192;
  return AUDIO_BITRATES.find((b) => b >= kbps * 0.95) ?? AUDIO_BITRATES[AUDIO_BITRATES.length - 1];
}

/**
 * Rough size estimate for a constant-bitrate stream. Returns null when inputs
 * are unknown — never guess.
 * @param {number|null|undefined} kbps
 * @param {number|null|undefined} seconds
 */
export function estimateBytes(kbps, seconds) {
  if (!kbps || !seconds || !Number.isFinite(kbps) || !Number.isFinite(seconds)) return null;
  return Math.round((kbps * 1000 * seconds) / 8);
}

/** Uncompressed 16-bit stereo PCM at 44.1/48 kHz. */
export function estimateWavBytes(seconds, sampleRate = 48000, channels = 2) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return Math.round(seconds * sampleRate * channels * 2) + 44;
}

/** Mime type for an output extension produced by Ferry. */
export function mimeForExt(ext) {
  const e = String(ext).toLowerCase();
  for (const c of Object.values(VIDEO_CONTAINERS)) if (c.ext === e) return c.mime;
  for (const a of Object.values(AUDIO_FORMATS)) if (a.ext === e) return a.mime;
  const extra = { srt: 'application/x-subrip', vtt: 'text/vtt', jpg: 'image/jpeg', jpeg: 'image/jpeg', zip: 'application/zip', gif: 'image/gif' };
  return extra[e] ?? 'application/octet-stream';
}

/** File extensions treated as direct media links. */
export const DIRECT_MEDIA_EXTENSIONS = Object.freeze([
  'mp4', 'm4v', 'webm', 'mkv', 'mov', 'avi', 'ogv', 'mpg', 'mpeg', 'ts', 'flv', '3gp',
  'mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'wav', 'weba',
  'm3u8', 'mpd', 'gif',
]);

/** Human-readable byte size. */
export function formatBytes(bytes, { approx = false, locale } = {}) {
  if (bytes == null || !Number.isFinite(bytes)) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i += 1;
  }
  const digits = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2;
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(v);
  return `${approx ? '≈ ' : ''}${n} ${units[i]}`;
}

/** Human-readable duration (h:mm:ss or m:ss). */
export function formatDuration(totalSeconds) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return null;
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
