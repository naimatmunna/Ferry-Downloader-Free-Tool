#!/usr/bin/env node
/**
 * Generate self-authored test media with FFmpeg (test patterns + sine tones).
 * Every integration/E2E test uses only these files, so no third-party media
 * is downloaded during testing.
 *
 *   node scripts/make-fixtures.mjs [outDir]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] ?? path.join(root, '.fixtures'));
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
mkdirSync(path.join(out, 'hls'), { recursive: true });

const V = (size, dur, rate = 30) => ['-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=${rate}:duration=${dur}`];
const A = (dur, freq = 440) => ['-f', 'lavfi', '-i', `sine=frequency=${freq}:sample_rate=48000:duration=${dur}`];
const H264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-g', '30'];

const jobs = [
  ['clip-h264-aac.mp4', [...V('640x360', 6), ...A(6), ...H264, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest']],
  ['clip-1080.mp4', [...V('1920x1080', 3), ...A(3, 330), ...H264, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest']],
  ['clip-vp9-opus.webm', [...V('640x360', 6), ...A(6, 550), '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '45', '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libopus', '-b:a', '96k', '-shortest']],
  ['portrait.mp4', [...V('720x1280', 4), ...A(4, 660), ...H264, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest']],
  ['silent.mp4', [...V('640x360', 4), ...H264, '-an', '-movflags', '+faststart']],
  ['moov-at-end.mp4', [...V('640x360', 4), ...A(4), ...H264, '-c:a', 'aac', '-shortest']],
  ['tone.mp3', [...A(6, 440), '-c:a', 'libmp3lame', '-b:a', '128k']],
  ['tone.m4a', [...A(6, 440), '-c:a', 'aac', '-b:a', '128k']],
  ['tone.flac', [...A(6, 440), '-c:a', 'flac']],
  ['tone.ogg', [...A(6, 440), '-c:a', 'libvorbis', '-b:a', '128k']],
  ['thumb.jpg', ['-f', 'lavfi', '-i', 'testsrc2=size=1280x720', '-frames:v', '1', '-q:v', '4']],
  ['hls/index.m3u8', [...V('640x360', 6), ...A(6), ...H264, '-c:a', 'aac', '-b:a', '96k', '-shortest', '-f', 'hls', '-hls_time', '2', '-hls_playlist_type', 'vod', '-hls_segment_filename', path.join(out, 'hls', 'seg_%03d.ts')]],
];

for (const [name, args] of jobs) {
  const target = path.join(out, name);
  if (existsSync(target) && !process.env.FORCE) continue;
  const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args, target], { stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    console.error(`ffmpeg failed for ${name}`);
    process.exit(1);
  }
}

writeFileSync(
  path.join(out, 'subs.en.vtt'),
  'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello from Ferry fixtures\n\n00:00:02.000 --> 00:00:05.000\nSecond cue\n',
);
// MIME-spoofing fixture: an HTML document pretending to be a video.
writeFileSync(path.join(out, 'fake.mp4'), '<!doctype html><html><body><script>alert("xss")</script></body></html>\n');
// A page that embeds a video the way many sites do (yt-dlp's generic extractor finds it).
writeFileSync(
  path.join(out, 'page.html'),
  `<!doctype html><html><head>
<meta charset="utf-8"><title>Ferry fixture page</title>
<meta property="og:title" content="Ferry Fixture Clip">
<meta property="og:video" content="clip-h264-aac.mp4">
<meta property="og:image" content="thumb.jpg">
</head><body><video controls src="clip-h264-aac.mp4" poster="thumb.jpg"></video></body></html>\n`,
);

console.log(`fixtures ready in ${out}`);
