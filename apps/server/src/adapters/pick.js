/**
 * Choose which file to download for adapters that expose a list of complete
 * files (official APIs, direct links) instead of yt-dlp format selectors.
 */
import { AUDIO_FORMATS, containerAcceptsVideo, qualityClass } from '@ferry/shared/formats';

const hasVideo = (f) => f.vcodec !== 'none' && (f.vcodec != null || f.height != null || f.width != null);
const hasAudio = (f) => f.acodec !== 'none';
const size = (f) => f.filesize ?? f.filesizeApprox ?? 0;

/**
 * @param {import('../media/normalize.js').Fmt[] & { url?: string }[]} formats sanitized formats carrying `url`
 * @param {{ mode: 'av'|'video'|'audio', video?: { container: string, quality: 'best'|number }, audio?: { format: string } }} sel
 */
export function pickFile(formats, sel) {
  if (!formats.length) return null;
  if (sel.mode === 'audio') {
    const audioOnly = formats.filter((f) => f.vcodec === 'none' && hasAudio(f));
    if (audioOnly.length) {
      const target = AUDIO_FORMATS[sel.audio?.format]?.codec;
      const same = audioOnly.filter((f) => f.acodec === target);
      const pool = same.length ? same : audioOnly;
      // Prefer lossless, then the highest bitrate/size.
      return pool.reduce((a, b) => (score(b) > score(a) ? b : a));
    }
    // Extract audio from the smallest video file that has audio (less to download).
    const withAudio = formats.filter((f) => hasAudio(f));
    return withAudio.reduce((a, b) => (size(b) && size(b) < size(a) ? b : a), withAudio[0] ?? formats[0]);
  }
  const videos = formats.filter(hasVideo);
  if (!videos.length) return formats.filter(hasAudio).length ? null : formats[0];
  const wanted = sel.video?.quality === 'best' ? Infinity : Number(sel.video?.quality) || Infinity;
  const classed = videos.map((f) => ({ f, q: qualityClass(f.width, f.height) ?? 0 }));
  const atOrBelow = classed.filter((c) => c.q <= wanted);
  const pool = atOrBelow.length ? atOrBelow : classed.sort((a, b) => a.q - b.q).slice(0, 1);
  const top = Math.max(...pool.map((c) => c.q));
  const candidates = pool.filter((c) => c.q === top).map((c) => c.f);
  const container = sel.video?.container ?? 'mp4';
  const compatible = candidates.filter((f) => containerAcceptsVideo(container, f.vcodec));
  const finalPool = (compatible.length ? compatible : candidates).filter((f) => sel.mode === 'video' || hasAudio(f));
  const list = finalPool.length ? finalPool : candidates;
  return list.reduce((a, b) => (size(b) > size(a) ? b : a));
}

function score(f) {
  const lossless = ['flac', 'alac', 'pcm'].includes(f.acodec) ? 1e9 : 0;
  return lossless + (f.abr ?? f.tbr ?? 0) * 1e3 + size(f) / 1e6;
}
