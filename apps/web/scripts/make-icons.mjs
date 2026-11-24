#!/usr/bin/env node
/** Rasterize public/icons/icon.svg into the PNG sizes the web manifest needs (FFmpeg + librsvg). */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');
const svg = path.join(dir, 'icon.svg');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';

const jobs = [
  ['icon-192.png', 'scale=192:192'],
  ['icon-512.png', 'scale=512:512'],
  ['apple-touch-icon.png', 'scale=180:180'],
  // Maskable: shrink the artwork into the 80% safe zone on the brand colour.
  ['icon-maskable-512.png', 'scale=400:400,pad=512:512:56:56:color=0x0B4F5C'],
];
for (const [name, vf] of jobs) {
  const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', svg, '-vf', vf, '-frames:v', '1', path.join(dir, name)], { stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(1);
}
console.log('icons written to', dir);
