import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, loadConfig } from '../../src/config.js';

/**
 * The Vercel trial deploys the same container as Docker Compose. Vercel picks up a
 * root `Dockerfile.vercel`; its settings live in `deploy/vercel.env.example`, which
 * people paste into Vercel's Environment Variables page.
 */
const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), 'utf8');

/** Minimal .env parser: KEY=VALUE lines; blank lines and # comments ignored. */
function parseEnv(text) {
  const env = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    assert.ok(eq > 0, `not a KEY=VALUE line: ${line}`);
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

const vercelEnv = () => parseEnv(read('deploy/vercel.env.example'));

test('Vercel builds the same image as Docker Compose', () => {
  assert.equal(read('Dockerfile.vercel'), read('deploy/Dockerfile'), 'Dockerfile.vercel must stay identical to deploy/Dockerfile');
});

test('the Vercel settings start the server in production', () => {
  const env = { ...vercelEnv(), NODE_ENV: 'production', SIGNING_SECRET: 'x'.repeat(48) };
  assert.doesNotThrow(() => loadConfig(env));
});

test('every Vercel setting is one the server reads', () => {
  const source = read('apps/server/src/config.js');
  for (const key of Object.keys(vercelEnv())) {
    // Whole name only: MAX_FILESIZE must not pass because MAX_FILESIZE_MB exists.
    assert.match(source, new RegExp(`\\benv\\.${key}\\b`), `${key} is not read by apps/server/src/config.js (typo?)`);
  }
});

test('the server listens on a port its unprivileged user may open', () => {
  // Vercel routes to port 80 unless PORT is set; the image runs as a non-root user,
  // which cannot open ports below 1024.
  const port = Number(vercelEnv().PORT);
  assert.ok(Number.isInteger(port) && port >= 1024, `PORT must be set to 1024 or above, got ${vercelEnv().PORT}`);
  assert.match(read('deploy/Dockerfile'), new RegExp(`EXPOSE ${port}\\b`), 'PORT should match the port the image exposes');
});

test('Vercel runs Ferry as one container that receives every request', () => {
  // Vercel suggests separate "server" (Express) and "web" (Vite) services for this monorepo.
  // Built that way, the server would run without yt-dlp and FFmpeg, which only the image
  // installs, and the screens would have no server behind them. Ferry stays one container.
  const config = JSON.parse(read('vercel.json'));
  const names = Object.keys(config.services ?? {});
  assert.deepEqual(names, ['ferry'], `expected only the "ferry" service, got: ${names.join(', ') || 'none'}`);
  assert.deepEqual(config.services.ferry, { root: '.', runtime: 'container', entrypoint: 'Dockerfile.vercel' });
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: { service: 'ferry' } }], 'every path, screens and /api alike, must reach the container');
  for (const key of ['functions', 'installCommand', 'buildCommand', 'devCommand', 'ignoreCommand', 'outputDirectory', 'framework']) {
    assert.ok(!(key in config), `${key} is not allowed at the top level when vercel.json defines services`);
  }
});

test('files go to the temporary folder, and no secret is committed', () => {
  const env = vercelEnv();
  assert.match(env.DATA_DIR ?? '', /^\/tmp\//, 'DATA_DIR must be under /tmp, the folder a Vercel container can write to');
  assert.equal(env.TRUST_PROXY, '1', 'Vercel overwrites X-Forwarded-For with the client address, so trust exactly one hop');
  assert.equal(env.SIGNING_SECRET, '', 'the example must leave SIGNING_SECRET empty: it is set in Vercel, never in git');
});
