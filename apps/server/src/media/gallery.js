/**
 * Image finalizer for galleries: every downloaded file is proven to be a
 * single image (magic bytes + ffprobe) and re-encoded by FFmpeg with all
 * metadata removed. Only FFmpeg's built-in encoders (mjpeg, png, gif) are
 * used, so the output does not depend on optional FFmpeg libraries.
 * See SYSTEM-ARCHITECTURE.md §8.5.
 */
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { SAFE_INPUT } from '../engines/ffmpeg.js';

/** Longest side FFmpeg is asked to decode (the pixel budget is checked too). */
export const MAX_IMAGE_SIDE = 30_000;

/** Decoders that may legitimately sit behind each sniffed type. */
const DECODERS = Object.freeze({
  'image/jpeg': ['mjpeg'],
  'image/png': ['png', 'apng'],
  'image/gif': ['gif'],
  'image/webp': ['webp', 'webp_anim'],
  'image/avif': ['av1'],
});

const SAME_FORMAT = Object.freeze({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' });

const OUTPUTS = Object.freeze({
  jpg: { ext: 'jpg', mime: 'image/jpeg', codec: 'mjpeg', encode: ['-c:v', 'mjpeg', '-q:v', '2', '-f', 'image2'] },
  png: { ext: 'png', mime: 'image/png', codec: 'png', encode: ['-c:v', 'png', '-f', 'image2'] },
  gif: { ext: 'gif', mime: 'image/gif', codec: 'gif', encode: ['-c:v', 'gif', '-loop', '0', '-f', 'gif'] },
});

/** One palette for the whole animation, transparency kept. */
const GIF_FILTER = '[0:v:0]split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse[out]';

/** EXIF orientation → the FFmpeg filter that makes the picture upright. */
const ORIENTATION_FILTER = Object.freeze({ 2: 'hflip', 3: 'hflip,vflip', 4: 'vflip', 5: 'transpose=0', 6: 'transpose=1', 7: 'transpose=3', 8: 'transpose=2' });

const hasAlpha = (pixFmt) => /^(yuva|rgba|bgra|argb|abgr|ya\d|gbrap)/.test(pixFmt ?? '');

function tiffOrientation(t) {
  if (t.length < 8) return 1;
  const order = t.toString('latin1', 0, 2);
  if (order !== 'II' && order !== 'MM') return 1;
  const le = order === 'II';
  const u16 = (o) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const u32 = (o) => (le ? t.readUInt32LE(o) : t.readUInt32BE(o));
  if (u16(2) !== 42) return 1;
  const ifd = u32(4);
  if (ifd + 2 > t.length) return 1;
  const count = u16(ifd);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > t.length) return 1;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/**
 * EXIF orientation (1–8) of a JPEG from its first bytes; 1 ("upright") when
 * absent or malformed. Ferry applies it itself so the result is the same on
 * every FFmpeg build.
 * @param {Buffer} buf
 */
export function jpegOrientation(buf) {
  if (!buf || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return 1;
  let off = 2;
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) return 1;
    const marker = buf[off + 1];
    if (marker === 0xff) {
      off += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      off += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) return 1; // image data starts: no EXIF
    const len = buf.readUInt16BE(off + 2);
    if (len < 2) return 1;
    if (marker === 0xe1 && len >= 8 && off + 10 <= buf.length && buf.toString('latin1', off + 4, off + 10) === 'Exif\0\0') {
      return tiffOrientation(buf.subarray(off + 10, Math.min(buf.length, off + 2 + len)));
    }
    off += 2 + len;
  }
  return 1;
}

/**
 * Features of a WebP file from its RIFF header, or null when it is not one.
 * @param {Buffer} buf
 */
export function webpFeatures(buf) {
  if (!buf || buf.length < 21 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('latin1', 12, 16);
  if (chunk === 'VP8 ') return { animated: false, alpha: false, lossless: false };
  if (chunk === 'VP8L') {
    // 1-byte signature, then 14 bits width-1, 14 bits height-1, 1 bit alpha_is_used.
    const alpha = buf.length >= 25 ? ((buf.readUInt32LE(21) >>> 28) & 1) === 1 : true;
    return { animated: false, alpha, lossless: true };
  }
  if (chunk === 'VP8X') {
    const flags = buf[20];
    return { animated: Boolean(flags & 0x02), alpha: Boolean(flags & 0x10), lossless: buf.indexOf('VP8L', 30, 'latin1') !== -1 };
  }
  return null;
}

/**
 * Decide how one downloaded file becomes a clean image.
 * @param {{ src: string, sniffed: string|null, head: Buffer, probe: import('../engines/ffmpeg.js').ProbeResult,
 *   outDir: string, name: string, maxPixels: number, threads?: number }} p
 */
export function planImage({ src, sniffed, head, probe, outDir, name, maxPixels, threads = 1 }) {
  const decoders = sniffed ? DECODERS[sniffed] : null;
  if (!decoders) throw new FerryError('NO_MEDIA_FOUND', { internal: 'gallery file is not an image (magic bytes)' });
  const streams = probe?.streams ?? [];
  const video = streams.filter((s) => s.kind === 'video' && !s.attachedPic);
  if (!video.length || streams.some((s) => s.kind === 'audio')) throw new FerryError('NO_MEDIA_FOUND', { internal: 'gallery file is not a single image' });
  const v = video[0];
  if (!decoders.includes(v.rawCodec)) throw new FerryError('NO_MEDIA_FOUND', { internal: `magic bytes say ${sniffed}, decoder says ${v.rawCodec}` });
  if (!(v.width > 0 && v.height > 0)) throw new FerryError('NO_MEDIA_FOUND', { internal: 'image without dimensions' });
  if (v.width > MAX_IMAGE_SIDE || v.height > MAX_IMAGE_SIDE || v.width * v.height > maxPixels) {
    throw new FerryError('FILE_TOO_LARGE', { internal: `image is ${v.width}x${v.height}` });
  }

  let out;
  let orientation = 1;
  if (sniffed === 'image/jpeg') {
    out = 'jpg';
    orientation = jpegOrientation(head);
  } else if (sniffed === 'image/png') {
    out = v.rawCodec === 'apng' ? 'gif' : 'png';
  } else if (sniffed === 'image/gif') {
    out = 'gif';
  } else if (sniffed === 'image/webp') {
    const f = webpFeatures(head);
    if (v.rawCodec === 'webp_anim' || f?.animated) out = 'gif';
    else out = f?.alpha || f?.lossless || hasAlpha(v.pixFmt) ? 'png' : 'jpg';
  } else {
    out = hasAlpha(v.pixFmt) ? 'png' : 'jpg';
  }

  const spec = OUTPUTS[out];
  const outputFile = path.join(outDir, `${name}.${spec.ext}`);
  const args = [];
  if (sniffed === 'image/jpeg') args.push('-noautorotate'); // orientation is applied below, exactly once
  args.push(...SAFE_INPUT, '-i', src);
  if (out === 'gif') {
    args.push('-filter_complex', GIF_FILTER, '-map', '[out]');
  } else {
    args.push('-map', '0:v:0', '-frames:v', '1');
    if (ORIENTATION_FILTER[orientation]) args.push('-vf', ORIENTATION_FILTER[orientation]);
  }
  args.push('-map_metadata', '-1', ...spec.encode, '-threads', String(threads), outputFile);
  return { args, outputFile, ext: spec.ext, mime: spec.mime, codec: spec.codec, converted: SAME_FORMAT[sniffed] !== out };
}

/**
 * Check the re-encoded file is the promised image.
 * @param {import('../engines/ffmpeg.js').ProbeResult} probe
 * @param {{ codec: string }} plan
 */
export function verifyImage(probe, plan) {
  const v = probe?.streams?.find((s) => s.kind === 'video');
  if (!v || v.rawCodec !== plan.codec || !(v.width > 0 && v.height > 0) || !(probe.sizeBytes > 0)) {
    throw new FerryError('CONVERSION_FAILED', { internal: `re-encoded image check failed (${v?.rawCodec ?? 'no stream'})` });
  }
  return { width: v.width, height: v.height };
}
