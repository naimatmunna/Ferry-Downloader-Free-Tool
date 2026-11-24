import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ffprobe, runFfmpeg } from '../../src/engines/ffmpeg.js';
import { buildFinalizePlan, verifyOutput } from '../../src/media/finalize.js';
import { which } from '../../src/engines/process.js';
import { FIXTURES_DIR } from '../helpers/fixtureServer.js';

let FFMPEG;
let FFPROBE;
let work;
before(async () => {
  FFMPEG = await which('ffmpeg');
  FFPROBE = await which('ffprobe');
  work = mkdtempSync(path.join(os.tmpdir(), 'ferry-finalize-'));
});
after(() => rmSync(work, { recursive: true, force: true }));

const fx = (name) => path.join(FIXTURES_DIR, name);

async function finalize(srcName, selection, extra = {}) {
  const outDir = mkdtempSync(path.join(work, 'job-'));
  const src = fx(srcName);
  const srcProbe = await ffprobe({ bin: FFPROBE, file: src, cwd: outDir });
  const plan = buildFinalizePlan({ src, srcProbe, selection, outDir, threads: 2, ...extra });
  let lastPercent = null;
  await runFfmpeg({ bin: FFMPEG, args: plan.args, cwd: outDir, durationSec: plan.durationSec, timeoutMs: 120_000, onProgress: (p) => (lastPercent = p.percent) });
  const out = await ffprobe({ bin: FFPROBE, file: plan.outputFile, cwd: outDir });
  verifyOutput(out, plan);
  const v = out.streams.find((s) => s.kind === 'video');
  const a = out.streams.find((s) => s.kind === 'audio');
  return { plan, out, v, a, lastPercent };
}

test('video + audio into every container, copying when compatible', async () => {
  const mp4 = await finalize('clip-h264-aac.mp4', { mode: 'av', video: { container: 'mp4', quality: 'best' } });
  assert.deepEqual(mp4.plan.transcode, { video: false, audio: false });
  assert.deepEqual([mp4.v.codec, mp4.a.codec, mp4.plan.ext, mp4.plan.mime], ['h264', 'aac', 'mp4', 'video/mp4']);
  assert.equal(mp4.lastPercent, 100);

  const mkv = await finalize('clip-vp9-opus.webm', { mode: 'av', video: { container: 'mkv', quality: 'best' } });
  assert.deepEqual(mkv.plan.transcode, { video: false, audio: false });
  assert.deepEqual([mkv.v.codec, mkv.a.codec], ['vp9', 'opus']);

  const vp9mp4 = await finalize('clip-vp9-opus.webm', { mode: 'av', video: { container: 'mp4', quality: 'best' } });
  assert.deepEqual(vp9mp4.plan.transcode, { video: false, audio: false }, 'MP4 accepts VP9 + Opus');

  const mov = await finalize('clip-vp9-opus.webm', { mode: 'av', video: { container: 'mov', quality: 'best' } });
  assert.deepEqual(mov.plan.transcode, { video: true, audio: true }, 'MOV rejects VP9 and Opus');
  assert.deepEqual([mov.v.codec, mov.a.codec], ['h264', 'aac']);

  const webm = await finalize('clip-h264-aac.mp4', { mode: 'av', video: { container: 'webm', quality: 'best' } });
  assert.deepEqual(webm.plan.transcode, { video: true, audio: true });
  assert.deepEqual([webm.v.codec, webm.a.codec, webm.plan.mime], ['vp9', 'opus', 'video/webm']);

  const avi = await finalize('clip-h264-aac.mp4', { mode: 'av', video: { container: 'avi', quality: 'best' } });
  assert.deepEqual([avi.v.codec, avi.a.codec, avi.plan.ext], ['mpeg4', 'mp3', 'avi']);
});

test('video without audio strips the audio track', async () => {
  const r = await finalize('clip-h264-aac.mp4', { mode: 'video', video: { container: 'mp4', quality: 'best' } });
  assert.equal(r.a, undefined);
  assert.equal(r.v.codec, 'h264');
  assert.equal(r.plan.transcode.video, false);
});

test('audio only — all seven formats, copy when the codec already matches', async () => {
  const expected = { mp3: 'mp3', m4a: 'aac', aac: 'aac', wav: 'pcm', flac: 'flac', opus: 'opus', ogg: 'vorbis' };
  for (const [format, codec] of Object.entries(expected)) {
    const r = await finalize('clip-h264-aac.mp4', { mode: 'audio', audio: { format, bitrate: 'source' } });
    assert.equal(r.v, undefined, format);
    assert.equal(r.a.codec, codec, format);
    const copy = format === 'm4a' || format === 'aac';
    assert.equal(r.plan.transcode.audio, !copy, `${format} copy=${copy}`);
  }
  const opusCopy = await finalize('clip-vp9-opus.webm', { mode: 'audio', audio: { format: 'opus', bitrate: 'source' } });
  assert.equal(opusCopy.plan.transcode.audio, false, 'Opus from WebM is remuxed, not re-encoded');
  const mp3at128 = await finalize('tone.flac', { mode: 'audio', audio: { format: 'mp3', bitrate: 128 } });
  assert.ok(mp3at128.out.bitrateKbps >= 110 && mp3at128.out.bitrateKbps <= 140, `bitrate ${mp3at128.out.bitrateKbps}`);
});

test('trim, compression and downscaling', async () => {
  const trimmed = await finalize('clip-h264-aac.mp4', { mode: 'av', video: { container: 'mp4', quality: 'best' }, extras: { trim: { start: 2, end: 4 } } });
  assert.ok(trimmed.out.durationSec > 1 && trimmed.out.durationSec < 3.6, `duration ${trimmed.out.durationSec}`);
  assert.ok(trimmed.plan.notes.includes('trim-keyframe'));

  const precise = await finalize('clip-h264-aac.mp4', { mode: 'audio', audio: { format: 'mp3', bitrate: 128 }, extras: { trim: { start: 1, end: 3 } } });
  assert.ok(Math.abs(precise.out.durationSec - 2) < 0.2, `audio trim ${precise.out.durationSec}`);

  const compressed = await finalize('clip-h264-aac.mp4', { mode: 'av', video: { container: 'mp4', quality: 'best', compress: true } });
  assert.equal(compressed.plan.transcode.video, true);

  const down = await finalize('clip-1080.mp4', { mode: 'av', video: { container: 'mp4', quality: 720 } });
  assert.deepEqual([down.v.width, down.v.height], [1280, 720]);

  const portrait = await finalize('portrait.mp4', { mode: 'video', video: { container: 'mp4', quality: 480 } });
  assert.deepEqual([portrait.v.width, portrait.v.height], [480, 854]);

  const noUpscale = await finalize('clip-h264-aac.mp4', { mode: 'av', video: { container: 'mp4', quality: 1080 } });
  assert.deepEqual([noUpscale.v.width, noUpscale.v.height, noUpscale.plan.transcode.video], [640, 360, false]);
});

test('sources without the requested tracks fail with a clear error', async () => {
  await assert.rejects(finalize('tone.mp3', { mode: 'av', video: { container: 'mp4', quality: 'best' } }), { code: 'NO_MEDIA_FOUND' });
  await assert.rejects(finalize('silent.mp4', { mode: 'audio', audio: { format: 'mp3', bitrate: 'source' } }), { code: 'NO_MEDIA_FOUND' });
  const silentAv = await finalize('silent.mp4', { mode: 'av', video: { container: 'mp4', quality: 'best' } });
  assert.ok(silentAv.plan.notes.includes('source-has-no-audio'));
});

test('an HTML file disguised as .mp4 is rejected, never delivered', async () => {
  await assert.rejects(ffprobe({ bin: FFPROBE, file: fx('fake.mp4'), cwd: work }), { code: 'CONVERSION_FAILED' });
});

test('subtitles can be embedded into MP4 and MKV', async () => {
  const subs = [{ path: fx('subs.en.vtt'), lang: 'en' }];
  for (const container of ['mp4', 'mkv']) {
    const r = await finalize('clip-h264-aac.mp4', { mode: 'av', video: { container, quality: 'best' }, extras: { embedSubtitles: true } }, { subtitles: subs });
    assert.ok(r.out.streams.some((s) => s.kind === 'subtitle'), container);
  }
});
