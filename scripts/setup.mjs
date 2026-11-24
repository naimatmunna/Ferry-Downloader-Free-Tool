#!/usr/bin/env node
/**
 * One-command setup:   npm run setup
 *
 *   1. checks Node and FFmpeg
 *   2. finds a real Python 3.11+ (skips the Windows Microsoft Store stub)
 *   3. creates .venv and installs pinned yt-dlp and gallery-dl into it
 *   4. makes sure browser impersonation (curl_cffi) is NOT installed
 *   5. installs npm packages, generates test media, builds the web app
 *
 * Options: --skip-build  --skip-fixtures  --recreate-venv
 * Set PYTHON=C:\path\to\python.exe to force a specific interpreter.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIN = process.platform === 'win32';
const args = new Set(process.argv.slice(2));

// Pinned engine versions (see docs/RESEARCH.md). Never "latest": upgrades go through review.
const PY_PACKAGES = ['yt-dlp[default]==2026.11.23', 'gallery-dl==1.32.21'];
const MIN_PYTHON = [3, 11];
const MIN_NODE = [22, 12];

const VENV = path.join(ROOT, '.venv');
const VENV_PY = WIN ? path.join(VENV, 'Scripts', 'python.exe') : path.join(VENV, 'bin', 'python');

const color = (c, s) => (process.stdout.isTTY ? `\x1b[${c}m${s}\x1b[0m` : s);
const ok = (s) => console.log(`${color(32, '✔')} ${s}`);
const info = (s) => console.log(`${color(36, '•')} ${s}`);
const warn = (s) => console.log(`${color(33, '!')} ${s}`);
function fail(title, lines = []) {
  console.error(`\n${color(31, '✖')} ${title}`);
  for (const l of lines) console.error(`  ${l}`);
  process.exit(1);
}

/** Run a program without a shell (arguments are passed exactly). */
function run(cmd, cmdArgs, { capture = false, cwd = ROOT, shell = false } = {}) {
  return spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', shell, windowsHide: true, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
}

/**
 * npm is a .cmd script on Windows, which Node only starts through a shell.
 * The command is a fixed string (no user input), passed whole to avoid DEP0190.
 */
function npm(npmArgs) {
  const line = `npm ${npmArgs.join(' ')}`;
  const r = WIN
    ? spawnSync(line, { cwd: ROOT, shell: true, stdio: 'inherit', windowsHide: true })
    : run('npm', npmArgs);
  if (r.status !== 0) fail(`"${line}" failed (exit code ${r.status}).`);
}

// ---------------------------------------------------------------- 1. Node
const nodeVersion = process.versions.node.split('.').map(Number);
if (nodeVersion[0] < MIN_NODE[0] || (nodeVersion[0] === MIN_NODE[0] && nodeVersion[1] < MIN_NODE[1])) {
  fail(`Node ${process.versions.node} is too old.`, [`Install Node ${MIN_NODE.join('.')} or newer (24 LTS recommended) from https://nodejs.org`]);
}
ok(`Node ${process.versions.node}`);

// ---------------------------------------------------------------- 2. FFmpeg
const ffmpeg = run(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-version'], { capture: true });
const ffprobe = run(process.env.FFPROBE_PATH || 'ffprobe', ['-hide_banner', '-version'], { capture: true });
const haveFfmpeg = ffmpeg.status === 0 && ffprobe.status === 0;
if (haveFfmpeg) {
  ok(ffmpeg.stdout.split(/\r?\n/)[0]);
} else {
  warn('FFmpeg (ffmpeg + ffprobe) was not found on PATH. Ferry needs it to convert media. Install it, then open a NEW terminal:');
  if (WIN) console.log('    winget install --id Gyan.FFmpeg -e');
  else if (process.platform === 'darwin') console.log('    brew install ffmpeg');
  else console.log('    sudo apt install ffmpeg     (or your distribution\'s package manager)');
}

// ---------------------------------------------------------------- 3. Python
/**
 * Ask an interpreter for its version. The Windows Store stub ("Python was not
 * found…") exits with an error, so it is skipped automatically.
 */
function probePython(cmd, preArgs = []) {
  const r = run(cmd, [...preArgs, '-c', 'import sys; print(sys.version_info[0], sys.version_info[1], sys.executable)'], { capture: true });
  if (r.status !== 0 || !r.stdout) return null;
  const [maj, min, ...exe] = r.stdout.trim().split(' ');
  return { cmd, preArgs, major: Number(maj), minor: Number(min), executable: exe.join(' ') };
}

const candidates = [];
if (process.env.PYTHON) candidates.push([process.env.PYTHON, []]);
if (WIN) {
  // The "py" launcher from python.org is not affected by the Microsoft Store alias.
  for (const v of ['3.13', '3.12', '3.11']) candidates.push(['py', [`-${v}`]]);
  candidates.push(['py', ['-3']], ['python', []], ['python3', []]);
} else {
  for (const v of ['3.13', '3.12', '3.11']) candidates.push([`python${v}`, []]);
  candidates.push(['python3', []], ['python', []]);
}

let python = null;
let tooOld = null;
for (const [cmd, pre] of candidates) {
  const p = probePython(cmd, pre);
  if (!p) continue;
  if (p.major > MIN_PYTHON[0] || (p.major === MIN_PYTHON[0] && p.minor >= MIN_PYTHON[1])) {
    python = p;
    break;
  }
  tooOld ??= p;
}
if (!python) {
  const lines = tooOld
    ? [`Found Python ${tooOld.major}.${tooOld.minor} at ${tooOld.executable}, but Ferry needs ${MIN_PYTHON.join('.')} or newer.`]
    : ['No working Python was found.'];
  if (WIN) {
    lines.push(
      'Install Python 3.12+ from https://www.python.org/downloads/ (tick "Add python.exe to PATH" and keep "py launcher").',
      'If Windows still opens the Microsoft Store: Settings > Apps > Advanced app settings > App execution aliases,',
      'turn OFF "python.exe" and "python3.exe", then open a NEW terminal and run: npm run setup',
      'Or point setup at your interpreter:  $env:PYTHON="C:\\Path\\To\\python.exe"; npm run setup',
    );
  } else {
    lines.push('Install Python 3.12+ (e.g. "sudo apt install python3 python3-venv" or "brew install python"), then run: npm run setup');
  }
  fail('Python 3.11+ is required (for yt-dlp).', lines);
}
ok(`Python ${python.major}.${python.minor} (${python.executable})`);

// ---------------------------------------------------------------- 4. venv + engines
if (args.has('--recreate-venv') && existsSync(VENV)) {
  info('Removing the existing .venv (--recreate-venv)');
  rmSync(VENV, { recursive: true, force: true });
}
if (existsSync(VENV) && !probePython(VENV_PY)) {
  warn('.venv exists but its Python no longer works (Python was moved or removed). Recreating it.');
  rmSync(VENV, { recursive: true, force: true });
}
if (!existsSync(VENV_PY)) {
  info('Creating .venv');
  const r = run(python.cmd, [...python.preArgs, '-m', 'venv', VENV]);
  if (r.status !== 0) {
    fail('Could not create the virtual environment.', WIN ? ['Re-run the Python installer and make sure "pip" is selected.'] : ['Install the venv module, e.g. "sudo apt install python3-venv".']);
  }
}
info(`Installing ${PY_PACKAGES.join(', ')} into .venv`);
if (run(VENV_PY, ['-m', 'pip', 'install', '--disable-pip-version-check', '--upgrade', ...PY_PACKAGES]).status !== 0) {
  fail('pip could not install the engines. Check your internet connection and try again.');
}
// Ferry must never impersonate browsers (anti-bot circumvention). curl_cffi enables it in yt-dlp.
if (run(VENV_PY, ['-c', 'import curl_cffi'], { capture: true }).status === 0) {
  warn('curl_cffi is installed (it enables browser impersonation in yt-dlp). Removing it.');
  run(VENV_PY, ['-m', 'pip', 'uninstall', '-y', 'curl_cffi', 'curl-cffi']);
}
const tool = (name) => (WIN ? path.join(VENV, 'Scripts', `${name}.exe`) : path.join(VENV, 'bin', name));
const ytdlpVersion = run(tool('yt-dlp'), ['--version'], { capture: true }).stdout?.trim();
const galleryVersion = run(tool('gallery-dl'), ['--version'], { capture: true }).stdout?.trim();
if (!ytdlpVersion) fail('yt-dlp was installed but does not start.');
ok(`yt-dlp ${ytdlpVersion}`);
if (galleryVersion) ok(`gallery-dl ${galleryVersion}`);

// ---------------------------------------------------------------- 5. npm, fixtures, build
info('Installing npm packages');
npm(['install', '--no-fund', '--no-audit']);
ok('npm packages installed');

if (args.has('--skip-fixtures')) info('Skipping test media (--skip-fixtures)');
else if (!haveFfmpeg) warn('Skipping test media: FFmpeg is missing.');
else {
  info('Generating self-authored test media');
  if (run(process.execPath, [path.join(ROOT, 'scripts', 'make-fixtures.mjs')]).status !== 0) fail('Generating test media failed.');
  ok('Test media ready in .fixtures/');
}

if (args.has('--skip-build')) info('Skipping the web build (--skip-build)');
else {
  info('Building the web app');
  npm(['run', 'build']);
  ok('Web app built (apps/web/dist)');
}

console.log(`\n${color(32, 'Setup complete.')}${haveFfmpeg ? '' : color(33, ' (install FFmpeg before downloading anything)')}`);
console.log('  Start Ferry:      npm start          → http://127.0.0.1:8787');
console.log('  Develop the UI:   npm run dev        → http://127.0.0.1:5173');
console.log('  Run the tests:    npm test           (end-to-end: npm run test:e2e)');
