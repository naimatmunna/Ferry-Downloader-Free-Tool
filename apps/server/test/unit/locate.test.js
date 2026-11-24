import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { locateTool } from '../../src/engines/locate.js';

let root;
const file = (...parts) => {
  const p = path.join(root, ...parts);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, '');
  return p;
};
before(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'ferry-locate-'));
});
after(() => rmSync(root, { recursive: true, force: true }));

test('a tool on PATH wins', () => {
  const onPath = file('path-bin', 'ffprobe.exe');
  file('LocalAppData', 'Microsoft', 'WinGet', 'Links', 'ffprobe.exe');
  const env = { PATH: path.dirname(onPath), LOCALAPPDATA: path.join(root, 'LocalAppData') };
  assert.equal(locateTool('ffprobe', { env, platform: 'win32' }), onPath);
});

test('Windows: FFmpeg installed by winget is found even when this shell started before it was installed', () => {
  // Layout of `winget install BtbN.FFmpeg.GPL.9.0` (verified on this machine, 2026-11-24).
  const local = path.join(root, 'winget-only');
  const probe = file('winget-only', 'Microsoft', 'WinGet', 'Packages', 'BtbN.FFmpeg.GPL.9.0_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0', 'bin', 'ffprobe.exe');
  assert.equal(locateTool('ffprobe', { env: { PATH: '', LOCALAPPDATA: local }, platform: 'win32' }), probe);
  const linked = file('links-only', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe');
  assert.equal(locateTool('ffmpeg', { env: { PATH: '', LOCALAPPDATA: path.join(root, 'links-only') }, platform: 'win32' }), linked);
});

test('nothing found means null; other systems only search PATH', () => {
  assert.equal(locateTool('ffprobe', { env: { PATH: '', LOCALAPPDATA: path.join(root, 'empty') }, platform: 'win32' }), null);
  file('linux-local', 'Microsoft', 'WinGet', 'Links', 'ffprobe');
  assert.equal(locateTool('ffprobe', { env: { PATH: '', LOCALAPPDATA: path.join(root, 'linux-local') }, platform: 'linux' }), null);
  const bin = file('usr-bin', 'ffprobe');
  assert.equal(locateTool('ffprobe', { env: { PATH: path.dirname(bin) }, platform: 'linux' }), bin);
});
