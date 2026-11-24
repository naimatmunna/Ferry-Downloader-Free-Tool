/**
 * The only way Ferry starts a child process.
 *
 * Guarantees: no shell (argv arrays only), a minimal allowlisted environment
 * (no application secrets), hard timeout, stall watchdog, abort support that
 * kills the whole process tree, bounded output buffering, and below-normal
 * CPU priority.
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import { FerryError } from '@ferry/shared/errors';

const isWin = process.platform === 'win32';

const PASSTHROUGH_ENV = ['PATH', 'Path', 'PATHEXT', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'COMSPEC', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'TZ'];

/**
 * Build the environment for an engine process. Nothing from the parent
 * environment leaks except what is needed to run binaries.
 * @param {{ proxyUrl?: string, homeDir?: string, extra?: Record<string,string> }} [opts]
 */
export function engineEnv({ proxyUrl, homeDir, extra = {} } = {}) {
  /** @type {Record<string,string>} */
  const env = {};
  for (const k of PASSTHROUGH_ENV) if (process.env[k] !== undefined) env[k] = /** @type {string} */ (process.env[k]);
  Object.assign(env, {
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1',
    PYTHONNOUSERSITE: '1', // never import packages from a user site-packages dir
    PYTHONDONTWRITEBYTECODE: '1',
    YTDLP_NO_PLUGINS: '1',
  });
  if (homeDir) Object.assign(env, { HOME: homeDir, USERPROFILE: homeDir, TMP: homeDir, TEMP: homeDir, TMPDIR: homeDir, XDG_CACHE_HOME: homeDir, XDG_CONFIG_HOME: homeDir });
  if (proxyUrl) Object.assign(env, { HTTP_PROXY: proxyUrl, HTTPS_PROXY: proxyUrl, http_proxy: proxyUrl, https_proxy: proxyUrl, ALL_PROXY: proxyUrl, all_proxy: proxyUrl, NO_PROXY: '', no_proxy: '' });
  return Object.assign(env, extra);
}

/** Kill a process and all of its descendants. */
export function killTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  try {
    if (isWin) {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', shell: false }).on('error', () => child.kill('SIGKILL'));
    } else {
      process.kill(-child.pid, 'SIGKILL'); // negative pid = the whole process group
    }
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

function lineSplitter(onLine, maxLine = 64 * 1024) {
  let buf = '';
  return {
    push(chunk) {
      buf += chunk;
      if (buf.length > maxLine * 4) buf = buf.slice(-maxLine * 2); // runaway line without newline
      let idx;
      while ((idx = buf.search(/\r\n|\n|\r/)) !== -1) {
        const line = buf.slice(0, idx);
        const sep = buf[idx] === '\r' && buf[idx + 1] === '\n' ? 2 : 1;
        buf = buf.slice(idx + sep);
        if (line) onLine(line.length > maxLine ? line.slice(0, maxLine) : line);
      }
    },
    flush() {
      if (buf) onLine(buf.slice(0, maxLine));
      buf = '';
    },
  };
}

/**
 * @typedef {object} RunOptions
 * @property {string} [cwd]
 * @property {Record<string,string>} [env]
 * @property {number} [timeoutMs]
 * @property {number} [stallTimeoutMs]   kill if no output/progress for this long
 * @property {AbortSignal} [signal]
 * @property {(line: string) => void} [onStdoutLine]
 * @property {(line: string) => void} [onStderrLine]
 * @property {boolean} [collectStdout]   buffer stdout (bounded by maxStdoutBytes)
 * @property {number} [maxStdoutBytes]
 * @property {number} [maxStderrBytes]  tail kept for error classification
 * @property {boolean} [lowPriority]
 *
 * @typedef {{ code: number|null, signal: string|null, stdout: string, stderr: string,
 *   timedOut: boolean, stalled: boolean, aborted: boolean, overflow: boolean, durationMs: number }} RunResult
 */

/**
 * @param {string} file absolute path or bare executable name (resolved via PATH, .exe/.com only)
 * @param {string[]} args
 * @param {RunOptions} [opts]
 * @returns {Promise<RunResult> & { child?: import('node:child_process').ChildProcess, touch: () => void }}
 */
export function runProcess(file, args, opts = {}) {
  const {
    cwd,
    env = engineEnv(),
    timeoutMs = 60_000,
    stallTimeoutMs = 0,
    signal,
    onStdoutLine,
    onStderrLine,
    collectStdout = false,
    maxStdoutBytes = 8 * 1024 * 1024,
    maxStderrBytes = 64 * 1024,
    lowPriority = true,
  } = opts;

  if (/\.(bat|cmd)$/i.test(file)) throw new FerryError('INTERNAL_ERROR', { internal: `refusing to run batch file ${file}` });
  if (!Array.isArray(args) || args.some((a) => typeof a !== 'string' || a.includes('\0'))) {
    throw new FerryError('INTERNAL_ERROR', { internal: 'engine arguments must be strings without NUL bytes' });
  }

  let lastActivity = Date.now();
  const touch = () => {
    lastActivity = Date.now();
  };

  /** @type {import('node:child_process').ChildProcess} */
  let child;
  const promise = new Promise((resolve, reject) => {
    const started = Date.now();
    let stdout = '';
    let stdoutBytes = 0;
    let stderr = '';
    let timedOut = false;
    let stalled = false;
    let aborted = false;
    let overflow = false;
    let settled = false;

    try {
      child = spawn(file, args, {
        cwd,
        env,
        shell: false,
        windowsHide: true,
        detached: !isWin, // own process group so the whole tree can be killed
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      reject(new FerryError('INTERNAL_ERROR', { internal: `spawn failed for ${file}: ${err?.message}` }));
      return;
    }

    if (lowPriority && child.pid) {
      try {
        os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
      } catch {
        /* not permitted on this platform/user — continue at normal priority */
      }
    }

    const out = lineSplitter((line) => {
      touch();
      onStdoutLine?.(line);
    });
    const err = lineSplitter((line) => {
      touch();
      onStderrLine?.(line);
    });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (collectStdout) {
        stdoutBytes += Buffer.byteLength(chunk);
        if (stdoutBytes > maxStdoutBytes) {
          overflow = true;
          killTree(child);
          return;
        }
        stdout += chunk;
      }
      if (onStdoutLine) out.push(chunk);
      else touch();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.length > maxStderrBytes) stderr = stderr.slice(-maxStderrBytes);
      err.push(chunk);
    });

    const timer = timeoutMs > 0 ? setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs) : null;
    const stallTimer = stallTimeoutMs > 0 ? setInterval(() => {
      if (Date.now() - lastActivity > stallTimeoutMs) {
        stalled = true;
        killTree(child);
      }
    }, Math.min(5000, Math.max(250, Math.floor(stallTimeoutMs / 4)))) : null;
    const onAbort = () => {
      aborted = true;
      killTree(child);
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (stallTimer) clearInterval(stallTimer);
      signal?.removeEventListener('abort', onAbort);
    };

    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      cleanup();
      const code = /** @type {any} */ (e).code;
      reject(new FerryError('INTERNAL_ERROR', { internal: `${file}: ${code === 'ENOENT' ? 'executable not found' : e.message}` }));
    });
    child.on('close', (code, sig) => {
      if (settled) return;
      settled = true;
      cleanup();
      out.flush();
      err.flush();
      resolve({ code, signal: sig, stdout, stderr, timedOut, stalled, aborted, overflow, durationMs: Date.now() - started });
    });
  });
  // The executor ran synchronously, so `child` is set (unless spawn threw).
  promise.child = child;
  promise.touch = touch;
  return promise;
}

/**
 * Resolve an executable on PATH the way libuv does on Windows (.exe/.com
 * only — never .bat/.cmd). Returns null when not found.
 * @param {string} name
 */
export async function which(name) {
  const { access, constants } = await import('node:fs/promises');
  const path = await import('node:path');
  if (name.includes('/') || name.includes('\\')) {
    try {
      await access(name, constants.X_OK);
      return name;
    } catch {
      return null;
    }
  }
  const dirs = (process.env.PATH ?? process.env.Path ?? '').split(path.delimiter).filter(Boolean);
  const exts = isWin ? ['.exe', '.com', ''] : [''];
  for (const d of dirs) {
    for (const e of exts) {
      const candidate = path.join(d, name + e);
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        /* keep looking */
      }
    }
  }
  return null;
}
