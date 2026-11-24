/**
 * Finalizer: turns the downloaded source file into exactly what the user
 * asked for, working from *facts* (ffprobe of the downloaded file) rather
 * than from what the source claimed.
 *
 * Rules (see SYSTEM-ARCHITECTURE.md §8.3):
 *  - stream-copy whenever the target container accepts the codec;
 *  - transcode only the incompatible stream(s);
 *  - never upscale; downscale only when the source exceeds the request;
 *  - output is always written by FFmpeg (never raw source bytes).
 */
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import {
  AUDIO_FORMATS,
  VIDEO_CONTAINERS,
  audioFormatAccepts,
  containerAcceptsAudio,
  containerAcceptsVideo,
  equivalentKbps,
  nearestBitrateAtOrAbove,
} from '@ferry/shared/formats';
import { SAFE_INPUT } from '../engines/ffmpeg.js';

const VIDEO_MUXER = { mp4: 'mp4', webm: 'webm', mkv: 'matroska', mov: 'mov', avi: 'avi' };
const AUDIO_MUXER = { mp3: 'mp3', m4a: 'ipod', aac: 'adts', wav: 'wav', flac: 'flac', opus: 'opus', ogg: 'ogg' };

function videoEncoder(codec, { compress, threads }) {
  switch (codec) {
    case 'vp9':
      // Realtime/speed 7 + tiles: ~11× faster than good/speed 5 for ~19% more bytes
      // at the same CRF (measured, docs/PERFORMANCE.md) — the right trade for a downloader.
      return ['-c:v', 'libvpx-vp9', '-crf', compress ? '38' : '32', '-b:v', '0', '-deadline', 'realtime', '-cpu-used', '7', '-row-mt', '1', '-tile-columns', '2', '-pix_fmt', 'yuv420p', '-threads', String(threads)];
    case 'mpeg4':
      return ['-c:v', 'mpeg4', '-vtag', 'xvid', '-q:v', compress ? '6' : '3'];
    case 'h264':
    default:
      return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', compress ? '28' : '20', '-pix_fmt', 'yuv420p', '-threads', String(threads)];
  }
}

function audioEncoder(codec, kbps) {
  const b = `${Math.max(32, Math.min(320, Math.round(kbps)))}k`;
  switch (codec) {
    case 'mp3':
      return ['-c:a', 'libmp3lame', '-b:a', b];
    case 'opus':
      return ['-c:a', 'libopus', '-b:a', b];
    case 'vorbis':
      return ['-c:a', 'libvorbis', '-b:a', b];
    case 'flac':
      return ['-c:a', 'flac', '-compression_level', '5'];
    case 'pcm':
      return ['-c:a', 'pcm_s16le'];
    case 'aac':
    default:
      return ['-c:a', 'aac', '-b:a', b];
  }
}

/** Metadata values come from the source: strip controls and cap length. */
function cleanTag(value) {
  // eslint-disable-next-line no-control-regex
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 500);
}

/**
 * @param {{
 *   src: string,
 *   srcProbe: import('../engines/ffmpeg.js').ProbeResult,
 *   selection: { mode: 'av'|'video'|'audio', video?: { container: string, quality: 'best'|number, compress?: boolean },
 *     audio?: { format: string, bitrate: 'source'|number, language?: string|null },
 *     extras?: { embedSubtitles?: boolean, metadata?: boolean, trim?: { start?: number, end?: number } } },
 *   subtitles?: { path: string, lang: string }[],
 *   metadata?: { title?: string, artist?: string, date?: string, comment?: string } | null,
 *   threads?: number,
 *   outDir: string,
 * }} p
 */
export function buildFinalizePlan({ src, srcProbe, selection, subtitles = [], metadata = null, threads = 2, outDir }) {
  const { mode } = selection;
  const video = srcProbe.streams.find((s) => s.kind === 'video' && !s.attachedPic) ?? null;
  const audios = srcProbe.streams.filter((s) => s.kind === 'audio');
  const wantLang = selection.audio?.language;
  const audio = (wantLang && audios.find((s) => s.language && s.language.toLowerCase().startsWith(wantLang.toLowerCase()))) || audios[0] || null;

  if ((mode === 'av' || mode === 'video') && !video) {
    throw new FerryError('NO_MEDIA_FOUND', { message: 'This media has no video track. Choose "Audio only" instead.' });
  }
  if (mode === 'audio' && !audio) {
    throw new FerryError('NO_MEDIA_FOUND', { message: 'This media has no audio track.' });
  }

  const trim = selection.extras?.trim;
  const start = trim?.start && trim.start > 0 ? trim.start : null;
  const end = trim?.end && trim.end > 0 ? trim.end : null;
  const notes = [];

  const args = [];
  if (start) args.push('-ss', start.toFixed(3));
  args.push(...SAFE_INPUT, '-i', src);

  const container = mode === 'audio' ? null : selection.video?.container ?? 'mp4';
  const cspec = container ? VIDEO_CONTAINERS[container] : null;
  const embedSubs = Boolean(mode !== 'audio' && selection.extras?.embedSubtitles && subtitles.length && cspec?.subtitleCodec);
  if (embedSubs) {
    for (const s of subtitles) {
      if (start) args.push('-ss', start.toFixed(3));
      args.push(...SAFE_INPUT, '-i', s.path);
    }
  }
  if (end) args.push('-t', (end - (start ?? 0)).toFixed(3));

  if (mode !== 'audio') args.push('-map', `0:${video.index}`);
  if (mode !== 'video' && audio) args.push('-map', `0:${audio.index}`);
  if (embedSubs) subtitles.forEach((_, i) => args.push('-map', `${i + 1}:0`));

  let transcodeVideo = false;
  let transcodeAudio = false;
  let ext;
  let mime;

  if (mode !== 'audio') {
    const compress = Boolean(selection.video?.compress);
    const requested = selection.video?.quality === 'best' ? null : Number(selection.video?.quality) || null;
    const shortSide = video.width && video.height ? Math.min(video.width, video.height) : video.height;
    const downscale = requested && shortSide && shortSide > requested * 1.05;
    if (containerAcceptsVideo(container, video.codec) && !compress && !downscale) {
      args.push('-c:v', 'copy');
      if (start) notes.push('trim-keyframe');
    } else {
      transcodeVideo = true;
      if (downscale) {
        const landscape = (video.width ?? 0) >= (video.height ?? 0);
        args.push('-vf', landscape ? `scale=-2:${requested}` : `scale=${requested}:-2`);
      }
      args.push(...videoEncoder(cspec.encode.video, { compress, threads }));
    }
    if (mode === 'av' && audio) {
      if (containerAcceptsAudio(container, audio.codec) && !compress) args.push('-c:a', 'copy');
      else {
        transcodeAudio = true;
        args.push(...audioEncoder(cspec.encode.audio, compress ? 128 : 192));
      }
    }
    if (mode === 'av' && !audio) notes.push('source-has-no-audio');
    if (mode === 'video') args.push('-an');
    if (embedSubs) {
      args.push('-c:s', cspec.subtitleCodec);
      subtitles.forEach((s, i) => args.push(`-metadata:s:s:${i}`, `language=${s.lang.replace(/[^A-Za-z-]/g, '').slice(0, 10)}`));
    } else {
      args.push('-sn');
    }
    args.push('-dn', '-f', VIDEO_MUXER[container]);
    if (container === 'mp4' || container === 'mov') args.push('-movflags', '+faststart');
    ext = cspec.ext;
    mime = cspec.mime;
  } else {
    const fmt = AUDIO_FORMATS[selection.audio?.format ?? 'mp3'];
    if (!fmt) throw new FerryError('VALIDATION_FAILED', { internal: 'unknown audio format' });
    const bitrate = selection.audio?.bitrate ?? 'source';
    if (bitrate === 'source' && audioFormatAccepts(fmt.id, audio.codec)) {
      args.push('-c:a', 'copy');
    } else {
      transcodeAudio = true;
      const kbps = bitrate === 'source' ? nearestBitrateAtOrAbove(equivalentKbps(audio.codec, audio.bitrateKbps, fmt.codec)) : Number(bitrate);
      args.push(...audioEncoder(fmt.codec, kbps));
    }
    args.push('-vn', '-sn', '-dn', '-f', AUDIO_MUXER[fmt.id]);
    if (fmt.id === 'mp3') args.push('-id3v2_version', '3');
    ext = fmt.ext;
    mime = fmt.mime;
  }

  if (metadata) {
    args.push('-map_metadata', '0');
    for (const [k, v] of Object.entries(metadata)) if (v) args.push('-metadata', `${k}=${cleanTag(v)}`);
  } else {
    args.push('-map_metadata', '-1', '-map_chapters', '-1');
  }
  if (mode === 'audio') args.push('-threads', String(threads));

  const outputFile = path.join(outDir, `out.${ext}`);
  args.push(outputFile);

  return {
    args,
    outputFile,
    ext,
    mime,
    container: mode === 'audio' ? selection.audio.format : container,
    expect: { video: mode !== 'audio', audio: mode === 'audio' || (mode === 'av' && Boolean(audio)) },
    transcode: { video: transcodeVideo, audio: transcodeAudio },
    durationSec: end ? end - (start ?? 0) : srcProbe.durationSec != null ? Math.max(0, srcProbe.durationSec - (start ?? 0)) : null,
    notes,
  };
}

/**
 * Check the produced file matches what was promised.
 * @param {import('../engines/ffmpeg.js').ProbeResult} out
 * @param {{ expect: { video: boolean, audio: boolean } }} plan
 */
export function verifyOutput(out, plan) {
  const hasVideo = out.streams.some((s) => s.kind === 'video' && !s.attachedPic);
  const hasAudio = out.streams.some((s) => s.kind === 'audio');
  if (plan.expect.video !== hasVideo || plan.expect.audio !== hasAudio) {
    throw new FerryError('CONVERSION_FAILED', { internal: `output streams mismatch video=${hasVideo} audio=${hasAudio}` });
  }
  if (!out.sizeBytes || out.sizeBytes <= 0) throw new FerryError('CONVERSION_FAILED', { internal: 'empty output' });
  return { hasVideo, hasAudio };
}
