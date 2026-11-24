#!/usr/bin/env node
/**
 * Development: run the API (restarts on change) and the Vite dev server
 * (hot reload, proxies /api to the API) together.   npm run dev
 */
import { spawn } from 'node:child_process';

const WIN = process.platform === 'win32';
const procs = [
  ['api', ['run', 'dev', '-w', '@ferry/server'], 36],
  ['web', ['run', 'dev', '-w', '@ferry/web'], 35],
].map(([name, args, color]) => {
  // npm is a .cmd script on Windows, which needs a shell; the command is a fixed string.
  const opts = { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '1' } };
  const child = WIN ? spawn(`npm ${args.join(' ')}`, { ...opts, shell: true }) : spawn('npm', args, opts);
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  for (const stream of [child.stdout, child.stderr]) {
    let buf = '';
    stream.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) process.stdout.write(`${tag}${line}\n`);
    });
  }
  child.on('exit', (code) => {
    process.stdout.write(`${tag}exited (${code ?? 'signal'})\n`);
    stop(code ?? 0);
  });
  return child;
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (p.exitCode === null) p.kill();
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
console.log('API: http://127.0.0.1:8787   Web (hot reload): http://127.0.0.1:5173   Ctrl+C stops both.');
