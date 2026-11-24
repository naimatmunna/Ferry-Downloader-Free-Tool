/**
 * Find an engine executable (FFmpeg, ffprobe…) when no explicit path is
 * configured: PATH first, then — on Windows — where package managers put it.
 *
 * Why: `winget install BtbN.FFmpeg…` adds its folder to PATH only for shells
 * started afterwards. A dev server launched from an older terminal then could
 * not find ffprobe and failed every download (seen 2026-11-24).
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

const subdirs = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(dir, d.name));
  } catch {
    return [];
  }
};

/** Windows package-manager locations for `name`.exe, most specific first. */
function windowsCandidates(name, env) {
  const exe = `${name}.exe`;
  const out = [];
  const local = env.LOCALAPPDATA;
  if (local) {
    out.push(path.join(local, 'Microsoft', 'WinGet', 'Links', exe));
    // winget packages: Packages\<id containing FFmpeg>\<release folder>\bin\<exe>
    for (const pkg of subdirs(path.join(local, 'Microsoft', 'WinGet', 'Packages')).filter((d) => /ffmpeg/i.test(path.basename(d)))) {
      out.push(path.join(pkg, 'bin', exe));
      for (const release of subdirs(pkg)) out.push(path.join(release, 'bin', exe));
    }
  }
  if (env.ProgramData || env.PROGRAMDATA) out.push(path.join(env.ProgramData || env.PROGRAMDATA, 'chocolatey', 'bin', exe));
  if (env.USERPROFILE) out.push(path.join(env.USERPROFILE, 'scoop', 'shims', exe));
  return out;
}

/**
 * @param {string} name bare executable name, e.g. "ffprobe"
 * @param {{ env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform }} [opts]
 * @returns {string|null} absolute path, or null when not found
 */
export function locateTool(name, { env = process.env, platform = process.platform } = {}) {
  const win = platform === 'win32';
  const exts = win ? ['.exe', '.com'] : [''];
  const dirs = String(env.PATH ?? env.Path ?? '').split(win ? ';' : path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      if (isFile(candidate)) return candidate;
    }
  }
  if (!win) return null;
  return windowsCandidates(name, env).find((p) => existsSync(p) && isFile(p)) ?? null;
}
