/**
 * FFmpeg / ffprobe wrappers. FFmpeg only ever reads local files from a job
 * directory (`-protocol_whitelist file,pipe`) — it never touches the network.
 */
import { FerryError } from '@ferry/shared/errors';
import { normalizeAudioCodec, normalizeVideoCodec } from '@ferry/shared/formats';
import { engineEnv, runProcess } from './process.js';
import { summarizeStderr } from './classify.js';

const SAFE_INPUT = ['-protocol_whitelist', 'file,pipe'];

/**
 * @typedef {{ index: number, kind: 'video'|'audio'|'subtitle'|'other', codec: string|null, rawCodec: string|null,
 *   width: number|null, height: number|null, fps: number|null, channels: number|null, sampleRate: number|null,
 *   bitrateKbps: number|null, language: string|null, attachedPic: boolean, pixFmt: string|null, frames: number|null }} StreamInfo
 * @typedef {{ format: string|null, durationSec: number|null, sizeBytes: number|null, bitrateKbps: number|null, streams: StreamInfo[] }} ProbeResult
 */

/**
 * @param {{ bin: string, file: string, cwd: string, timeoutMs?: number, signal?: AbortSignal }} p
 * @returns {Promise<ProbeResult>}
 */
export async function ffprobe({ bin, file, cwd, timeoutMs = 30_000, signal }) {
  // `file` is always an absolute, server-generated path (never starts with "-").
  if (!/^([A-Za-z]:[\\/]|\/)/.test(file)) throw new FerryError('INTERNAL_ERROR', { internal: 'ffprobe needs an absolute path' });
  const r = await runProcess(
    bin,
    ['-v', 'error', ...SAFE_INPUT, '-print_format', 'json', '-show_format', '-show_streams', file],
    { cwd, env: engineEnv({ homeDir: cwd }), timeoutMs, signal, collectStdout: true, maxStdoutBytes: 4 * 1024 * 1024 },
  );
  if (r.aborted) throw new FerryError('CANCELLED');
  if (r.timedOut) throw new FerryError('TIMEOUT', { internal: 'ffprobe timeout' });
  if (r.code !== 0) throw new FerryError('CONVERSION_FAILED', { internal: `ffprobe: ${summarizeStderr(r.stderr)}` });
  let json;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    throw new FerryError('CONVERSION_FAILED', { internal: 'ffprobe JSON' });
  }
  const streams = (json.streams ?? []).map((s) => {
    const kind = s.codec_type === 'video' ? 'video' : s.codec_type === 'audio' ? 'audio' : s.codec_type === 'subtitle' ? 'subtitle' : 'other';
    const rate = typeof s.avg_frame_rate === 'string' && s.avg_frame_rate.includes('/') ? s.avg_frame_rate.split('/').map(Number) : null;
    return {
      index: s.index,
      kind,
      codec: kind === 'video' ? normalizeVideoCodec(s.codec_name) : kind === 'audio' ? normalizeAudioCodec(s.codec_name) : s.codec_name ?? null,
      rawCodec: s.codec_name ?? null,
      width: s.width ?? null,
      height: s.height ?? null,
      fps: rate && rate[1] ? Math.round((rate[0] / rate[1]) * 100) / 100 : null,
      channels: s.channels ?? null,
      sampleRate: s.sample_rate ? Number(s.sample_rate) : null,
      bitrateKbps: s.bit_rate ? Math.round(Number(s.bit_rate) / 1000) : null,
      language: s.tags?.language ?? null,
      attachedPic: Boolean(s.disposition?.attached_pic),
      pixFmt: typeof s.pix_fmt === 'string' ? s.pix_fmt : null,
      frames: s.nb_frames && /^\d+$/.test(String(s.nb_frames)) ? Number(s.nb_frames) : null,
    };
  });
  const f = json.format ?? {};
  return {
    format: f.format_name ?? null,
    durationSec: f.duration ? Number(f.duration) : null,
    sizeBytes: f.size ? Number(f.size) : null,
    bitrateKbps: f.bit_rate ? Math.round(Number(f.bit_rate) / 1000) : null,
    streams,
  };
}

/** Parse `-progress pipe:1` key=value lines. `out_time_us` is microseconds. */
export function parseFfmpegProgress(line, state = {}) {
  const eq = line.indexOf('=');
  if (eq < 1) return state;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  if (key === 'out_time_us' || key === 'out_time_ms') {
    const us = Number(value);
    if (Number.isFinite(us) && us >= 0) state.outTimeSec = us / 1e6;
  } else if (key === 'total_size') {
    const n = Number(value);
    if (Number.isFinite(n)) state.totalSize = n;
  } else if (key === 'speed') {
    const n = Number.parseFloat(value);
    state.speed = Number.isFinite(n) ? n : null;
  } else if (key === 'progress') {
    state.done = value === 'end';
  }
  return state;
}

/**
 * Run ffmpeg with progress reporting.
 * @param {{ bin: string, args: string[], cwd: string, durationSec: number|null, timeoutMs: number, stallTimeoutMs?: number, signal?: AbortSignal,
 *   onProgress?: (p: { percent: number|null, outTimeSec: number|null, speed: number|null }) => void }} p
 */
export async function runFfmpeg({ bin, args, cwd, durationSec, timeoutMs, stallTimeoutMs = 120_000, signal, onProgress }) {
  const state = {};
  let last = 0;
  // -max_alloc caps any single allocation (defence against hostile media headers).
  const r = await runProcess(bin, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-max_alloc', String(512 * 1024 * 1024), '-y', '-progress', 'pipe:1', '-nostats', ...args], {
    cwd,
    env: engineEnv({ homeDir: cwd }),
    timeoutMs,
    stallTimeoutMs,
    signal,
    onStdoutLine: (line) => {
      parseFfmpegProgress(line, state);
      const now = Date.now();
      if (onProgress && (now - last > 250 || state.done)) {
        last = now;
        const percent = durationSec && state.outTimeSec != null ? Math.max(0, Math.min(100, (state.outTimeSec / durationSec) * 100)) : null;
        onProgress({ percent: state.done ? 100 : percent, outTimeSec: state.outTimeSec ?? null, speed: state.speed ?? null });
      }
    },
  });
  if (r.aborted) throw new FerryError('CANCELLED');
  if (r.timedOut || r.stalled) throw new FerryError('TIMEOUT', { internal: r.stalled ? 'ffmpeg stalled' : 'ffmpeg timeout' });
  if (r.code !== 0) throw new FerryError('CONVERSION_FAILED', { internal: `ffmpeg: ${summarizeStderr(r.stderr)}` });
  return r;
}

export { SAFE_INPUT };
